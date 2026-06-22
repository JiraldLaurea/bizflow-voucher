import { prisma } from "@/lib/prisma";
import type { SmsProvider } from "./types";
import { mockProvider } from "./mock";
import { semaphoreProvider } from "./semaphore";
import { twilioProvider } from "./twilio";
import { moviderProvider } from "./movider";

function getProvider(): SmsProvider {
  switch ((process.env.SMS_PROVIDER ?? "mock").toLowerCase()) {
    case "semaphore":
      return semaphoreProvider;
    case "twilio":
      return twilioProvider;
    case "movider":
      return moviderProvider;
    default:
      return mockProvider;
  }
}

export interface TemplateVars {
  business: string;
  benefit: string;
  code: string;
  datetime: string;
  expiry: string;
  [key: string]: string;
}

/** Render {{var}} placeholders in an SMS template. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    vars[key] !== undefined ? vars[key] : ""
  );
}

function formatDateTime(date: Date | null, time: string | null): string {
  if (!date) return "anytime";
  const d = new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
  return time ? `${d} ${time}` : d;
}

function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

/**
 * Deliver the voucher SMS for a given voucher.
 * - Honors per-business opt-out list (§16.5).
 * - Writes an SmsLog row and updates voucher status to DELIVERED or FAILED (§7.3).
 * Safe to call from the claim flow; never throws (returns ok flag).
 */
export async function deliverVoucherSms(voucherId: string): Promise<{ ok: boolean; error?: string }> {
  const voucher = await prisma.voucher.findUnique({
    where: { id: voucherId },
    include: {
      lead: true,
      campaign: { include: { business: true } },
    },
  });
  if (!voucher) return { ok: false, error: "Voucher not found" };

  const { lead, campaign } = voucher;
  const phone = lead.phone;

  // Opt-out check (§16.5)
  const optedOut = await prisma.optOut.findUnique({
    where: { businessId_phone: { businessId: campaign.businessId, phone } },
  });
  if (optedOut) {
    await prisma.smsLog.create({
      data: {
        leadId: lead.id,
        voucherId: voucher.id,
        phone,
        messageBody: "(suppressed: recipient opted out)",
        provider: getProvider().name,
        deliveryStatus: "FAILED",
        failedReason: "Recipient opted out",
      },
    });
    await prisma.voucher.update({ where: { id: voucher.id }, data: { status: "FAILED" } });
    return { ok: false, error: "Recipient opted out" };
  }

  const body = renderTemplate(campaign.smsTemplate, {
    business: campaign.business.name,
    benefit: voucher.benefit,
    code: voucher.code,
    datetime: formatDateTime(lead.selectedDate, lead.selectedTime),
    expiry: formatExpiry(voucher.expiryDate),
  });

  const provider = getProvider();
  const result = await provider.send({ to: phone, body });

  await prisma.smsLog.create({
    data: {
      leadId: lead.id,
      voucherId: voucher.id,
      phone,
      messageBody: body,
      provider: provider.name,
      providerMessageId: result.providerMessageId,
      deliveryStatus: result.ok ? "SENT" : "FAILED",
      failedReason: result.ok ? null : result.error,
      sentAt: result.ok ? new Date() : null,
    },
  });

  await prisma.voucher.update({
    where: { id: voucher.id },
    data: { status: result.ok ? "DELIVERED" : "FAILED" },
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
