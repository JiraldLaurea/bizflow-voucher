import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { claimVoucher } from "@/lib/voucher-engine";
import { deliverVoucherSms } from "@/lib/sms";
import { REQUIRED_CONSENT_TEXT, MARKETING_CONSENT_TEXT } from "@/lib/consent";

const schema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Mobile number is required"),
  email: z.string().email().optional().or(z.literal("")),
  selectedDate: z.string().optional().or(z.literal("")),
  selectedTime: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
  serviceId: z.string().optional().or(z.literal("")),
  guests: z.coerce.number().int().min(1).optional().nullable(),
  source: z.string().optional(),
  requiredConsent: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the required consent to claim a voucher." }),
  }),
  marketingConsent: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const d = parsed.data;

  // Phone validation (feature 7)
  const phone = normalizePhone(d.phone);
  if (!phone.ok) {
    return NextResponse.json({ error: phone.error }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { slug: d.slug } });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  const result = await claimVoucher({
    campaignId: campaign.id,
    name: d.name.trim(),
    phone: phone.e164!,
    email: d.email || null,
    selectedDate: d.selectedDate ? new Date(d.selectedDate) : null,
    selectedTime: d.selectedTime || null,
    branchId: d.branchId || null,
    serviceId: d.serviceId || null,
    guests: d.guests ?? null,
    source: d.source || campaign.channel,
    requiredConsent: { granted: true, text: REQUIRED_CONSENT_TEXT },
    marketingConsent: { granted: d.marketingConsent ?? false, text: MARKETING_CONSENT_TEXT },
  });

  if (!result.ok) {
    // Map engine error codes to HTTP statuses.
    const status = result.code === "INTERNAL" ? 500 : 409;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  // Deliver the SMS (feature 10). Don't fail the claim if SMS errors — the
  // customer already sees the code, and delivery status is logged for follow-up.
  const sms = await deliverVoucherSms(result.voucherId);

  return NextResponse.json({
    ok: true,
    code: result.code,
    smsDelivered: sms.ok,
  });
}
