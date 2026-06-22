import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

// Voucher validation + manual redemption (Business Plan §7.5, features 11 & 12).

export type ValidationStatus =
  | "VALID"
  | "ALREADY_USED"
  | "EXPIRED"
  | "WRONG_BRANCH"
  | "NOT_YET_ACTIVE"
  | "CANCELLED"
  | "NOT_FOUND";

export interface VoucherView {
  id: string;
  code: string;
  benefit: string;
  condition: string | null;
  status: string;
  expiryDate: string;
  businessId: string;
  businessName: string;
  campaignName: string;
  customerName: string;
  selectedDate: string | null;
  selectedTime: string | null;
  branchName: string | null;
  serviceName: string | null;
}

export interface ValidationResult {
  result: ValidationStatus;
  voucher?: VoucherView;
}

const REDEEMABLE = new Set(["CREATED", "ISSUED", "DELIVERED", "FAILED"]);

async function loadVoucher(where: { code?: string; id?: string }) {
  return prisma.voucher.findFirst({
    where,
    include: {
      campaign: { include: { business: true } },
      lead: { include: { branch: true, service: true } },
    },
  });
}

type LoadedVoucher = NonNullable<Awaited<ReturnType<typeof loadVoucher>>>;

function toView(v: LoadedVoucher): VoucherView {
  return {
    id: v.id,
    code: v.code,
    benefit: v.benefit,
    condition: v.condition,
    status: v.status,
    expiryDate: v.expiryDate.toISOString(),
    businessId: v.campaign.businessId,
    businessName: v.campaign.business.name,
    campaignName: v.campaign.name,
    customerName: v.lead.name,
    selectedDate: v.lead.selectedDate ? v.lead.selectedDate.toISOString() : null,
    selectedTime: v.lead.selectedTime,
    branchName: v.lead.branch?.name ?? null,
    serviceName: v.lead.service?.name ?? null,
  };
}

function evaluate(v: LoadedVoucher, staff: SessionUser): ValidationStatus {
  if (v.status === "USED") return "ALREADY_USED";
  if (v.status === "CANCELLED") return "CANCELLED";
  if (v.status === "EXPIRED" || v.expiryDate < new Date()) return "EXPIRED";
  if (v.campaign.status !== "ACTIVE" || v.campaign.startDate > new Date()) return "NOT_YET_ACTIVE";
  // Wrong branch: staff is bound to a branch and the customer selected a different one.
  if (staff.branchId && v.lead.branchId && v.lead.branchId !== staff.branchId) return "WRONG_BRANCH";
  if (!REDEEMABLE.has(v.status)) return "NOT_FOUND";
  return "VALID";
}

/** Validate without mutating (§7.5). `query` is a code or a mobile number. */
export async function validateVoucher(query: string, staff: SessionUser): Promise<ValidationResult> {
  const trimmed = query.trim();
  if (!trimmed) return { result: "NOT_FOUND" };

  // Try by code first, then by customer phone (most recent).
  let v = await loadVoucher({ code: trimmed.toUpperCase() });
  if (!v) {
    v = await prisma.voucher.findFirst({
      where: { lead: { phone: { contains: trimmed.replace(/\s+/g, "") } } },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { include: { business: true } },
        lead: { include: { branch: true, service: true } },
      },
    });
  }
  if (!v) return { result: "NOT_FOUND" };

  // Enforce business scoping: non-admins only see their own business' vouchers.
  if (staff.role !== "PLATFORM_ADMIN" && v.campaign.businessId !== staff.businessId) {
    return { result: "NOT_FOUND" };
  }

  return { result: evaluate(v, staff), voucher: toView(v) };
}

export interface RedeemResult {
  ok: boolean;
  result: ValidationStatus;
  voucher?: VoucherView;
  message?: string;
}

/** Mark a voucher as used inside a transaction (re-checks validity to avoid double-redeem). */
export async function redeemVoucher(
  code: string,
  staff: SessionUser,
  opts: { orderValue?: number | null; notes?: string | null }
): Promise<RedeemResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Voucher" WHERE code = ${code.trim().toUpperCase()} FOR UPDATE`;

    const v = await tx.voucher.findFirst({
      where: { code: code.trim().toUpperCase() },
      include: {
        campaign: { include: { business: true } },
        lead: { include: { branch: true, service: true } },
      },
    });
    if (!v) return { ok: false, result: "NOT_FOUND" as const, message: "Voucher not found." };

    if (staff.role !== "PLATFORM_ADMIN" && v.campaign.businessId !== staff.businessId) {
      return { ok: false, result: "NOT_FOUND" as const, message: "Voucher not found." };
    }

    const status = evaluate(v, staff);
    if (status !== "VALID") {
      return { ok: false, result: status, voucher: toView(v), message: `Cannot redeem: ${status}` };
    }

    const updated = await tx.voucher.update({
      where: { id: v.id },
      data: {
        status: "USED",
        usedAt: new Date(),
        usedBranchId: staff.branchId ?? v.lead.branchId ?? null,
        orderValue: opts.orderValue ?? null,
      },
      include: {
        campaign: { include: { business: true } },
        lead: { include: { branch: true, service: true } },
      },
    });

    await tx.redemption.create({
      data: {
        voucherId: v.id,
        staffId: staff.id,
        businessId: v.campaign.businessId,
        branchId: staff.branchId ?? v.lead.branchId ?? null,
        redemptionStatus: "VALID",
        orderValue: opts.orderValue ?? null,
        notes: opts.notes ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: staff.id,
        businessId: v.campaign.businessId,
        action: "VOUCHER_REDEEMED",
        entityType: "Voucher",
        entityId: v.id,
        metadata: { code: v.code, orderValue: opts.orderValue ?? null },
      },
    });

    return { ok: true, result: "VALID" as const, voucher: toView(updated) };
  });
}
