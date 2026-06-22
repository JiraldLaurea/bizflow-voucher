import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateVoucherCode } from "@/lib/voucher-code";

// The Voucher Engine (Business Plan §7.3) — the core, highest-risk module.
// Guarantees, under concurrent claims:
//  - never issue more than voucherLimitTotal / voucherLimitDaily (atomic, row-locked)
//  - one voucher per phone per campaign (duplicate prevention, §feature 8 / §20.3)
//  - unique voucher codes (§feature 9)
//  - first-time-customer, time-slot capacity, and campaign-window rules

export type ClaimErrorCode =
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_INACTIVE"
  | "CAMPAIGN_NOT_STARTED"
  | "CAMPAIGN_ENDED"
  | "SOLD_OUT"
  | "DAILY_LIMIT_REACHED"
  | "SLOT_FULL"
  | "ALREADY_CLAIMED"
  | "NOT_FIRST_TIME"
  | "INVALID_BRANCH"
  | "INVALID_SERVICE"
  | "MISSING_DATETIME"
  | "INTERNAL";

export interface ClaimInput {
  campaignId: string;
  name: string;
  phone: string; // E.164 (already validated by caller)
  email?: string | null;
  selectedDate?: Date | null;
  selectedTime?: string | null;
  branchId?: string | null;
  serviceId?: string | null;
  guests?: number | null;
  source?: string | null;
  requiredConsent: { granted: boolean; text: string };
  marketingConsent?: { granted: boolean; text: string };
}

export type ClaimResult =
  | { ok: true; voucherId: string; code: string }
  | { ok: false; code: ClaimErrorCode; message: string };

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const ERR = (code: ClaimErrorCode, message: string): ClaimResult => ({ ok: false, code, message });

export async function claimVoucher(input: ClaimInput): Promise<ClaimResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the campaign row for the duration of the transaction so concurrent
      // claims serialize on the quantity check. PostgreSQL SELECT ... FOR UPDATE.
      await tx.$executeRaw`SELECT id FROM "Campaign" WHERE id = ${input.campaignId} FOR UPDATE`;

      const campaign = await tx.campaign.findUnique({ where: { id: input.campaignId } });
      if (!campaign) return ERR("CAMPAIGN_NOT_FOUND", "Campaign not found.");

      const now = new Date();
      if (campaign.status !== "ACTIVE")
        return ERR("CAMPAIGN_INACTIVE", "This campaign is not currently active.");
      if (now < campaign.startDate)
        return ERR("CAMPAIGN_NOT_STARTED", "This campaign has not started yet.");
      if (now > campaign.endDate) return ERR("CAMPAIGN_ENDED", "This campaign has ended.");

      // Required date/time
      if (campaign.requireDateTime && (!input.selectedDate || !input.selectedTime))
        return ERR("MISSING_DATETIME", "Please select a date and time.");

      // Branch / service validity
      if (input.branchId) {
        if (campaign.branchIds.length > 0 && !campaign.branchIds.includes(input.branchId))
          return ERR("INVALID_BRANCH", "Selected branch is not available for this campaign.");
      }
      if (input.serviceId) {
        if (campaign.serviceIds.length > 0 && !campaign.serviceIds.includes(input.serviceId))
          return ERR("INVALID_SERVICE", "Selected service is not available for this campaign.");
      }

      // Duplicate-claim pre-check (constraint is the final guard)
      const existing = await tx.lead.findUnique({
        where: { campaignId_phone: { campaignId: campaign.id, phone: input.phone } },
      });
      if (existing) return ERR("ALREADY_CLAIMED", "This mobile number has already claimed a voucher.");

      // First-time-customer rule (§7.3): no prior lead for this phone in the business
      if (campaign.firstTimeOnly) {
        const prior = await tx.lead.findFirst({
          where: { phone: input.phone, campaign: { businessId: campaign.businessId } },
        });
        if (prior)
          return ERR("NOT_FIRST_TIME", "This offer is for first-time customers only.");
      }

      // Total quantity (atomic — row is locked)
      if (campaign.issuedCount >= campaign.voucherLimitTotal)
        return ERR("SOLD_OUT", "All vouchers for this campaign have been claimed.");

      // Daily quantity
      if (campaign.voucherLimitDaily != null) {
        const since = startOfUtcDay(now);
        const todayCount = await tx.voucher.count({
          where: { campaignId: campaign.id, createdAt: { gte: since } },
        });
        if (todayCount >= campaign.voucherLimitDaily)
          return ERR("DAILY_LIMIT_REACHED", "Today's vouchers are all claimed. Please try again tomorrow.");
      }

      // Time-slot capacity
      if (campaign.timeSlotLimit != null && input.selectedDate && input.selectedTime) {
        const dayStart = startOfUtcDay(input.selectedDate);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const slotCount = await tx.lead.count({
          where: {
            campaignId: campaign.id,
            selectedTime: input.selectedTime,
            selectedDate: { gte: dayStart, lt: dayEnd },
          },
        });
        if (slotCount >= campaign.timeSlotLimit)
          return ERR("SLOT_FULL", "This time slot is fully booked. Please choose another.");
      }

      // Create lead
      const lead = await tx.lead.create({
        data: {
          campaignId: campaign.id,
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          selectedDate: input.selectedDate ?? null,
          selectedTime: input.selectedTime ?? null,
          branchId: input.branchId ?? null,
          serviceId: input.serviceId ?? null,
          guests: input.guests ?? null,
          source: input.source ?? null,
          marketingConsent: input.marketingConsent?.granted ?? false,
        },
      });

      // Consent records (§16.1)
      await tx.consentRecord.create({
        data: {
          leadId: lead.id,
          type: "REQUIRED",
          granted: input.requiredConsent.granted,
          text: input.requiredConsent.text,
        },
      });
      if (input.marketingConsent) {
        await tx.consentRecord.create({
          data: {
            leadId: lead.id,
            type: "MARKETING",
            granted: input.marketingConsent.granted,
            text: input.marketingConsent.text,
          },
        });
      }

      // Unique voucher code (check-then-create; constraint is the final guard)
      let code = generateVoucherCode(campaign.voucherPrefix);
      for (let i = 0; i < 5; i++) {
        const clash = await tx.voucher.findUnique({ where: { code } });
        if (!clash) break;
        code = generateVoucherCode(campaign.voucherPrefix);
      }

      const expiryDate = campaign.voucherExpiryAt ?? campaign.endDate;
      const voucher = await tx.voucher.create({
        data: {
          leadId: lead.id,
          campaignId: campaign.id,
          code,
          benefit: campaign.voucherBenefit,
          condition: campaign.minPurchase > 0 ? `Min spend ₱${campaign.minPurchase}` : null,
          expiryDate,
          status: "ISSUED",
          issuedAt: new Date(),
        },
      });

      // Increment the denormalized counter (safe — row is locked)
      await tx.campaign.update({
        where: { id: campaign.id },
        data: { issuedCount: { increment: 1 } },
      });

      return { ok: true as const, voucherId: voucher.id, code: voucher.code };
    });
  } catch (e) {
    // Unique constraint races fall through here as a final safety net.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("phone"))
        return ERR("ALREADY_CLAIMED", "This mobile number has already claimed a voucher.");
      return ERR("INTERNAL", "A conflict occurred while issuing your voucher. Please try again.");
    }
    console.error("claimVoucher failed:", e);
    return ERR("INTERNAL", "Something went wrong issuing your voucher. Please try again.");
  }
}
