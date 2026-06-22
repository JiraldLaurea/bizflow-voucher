import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError, canAccessBusiness } from "@/lib/rbac";

const schema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1, "Campaign name is required"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may contain only lowercase letters, numbers, and hyphens"),
  channel: z.enum(["DIRECT", "FB", "IG", "TIKTOK", "GOOGLE"]).default("DIRECT"),
  offerTitle: z.string().min(1, "Offer title is required"),
  offerDescription: z.string().optional(),
  voucherBenefit: z.string().min(1, "Voucher benefit is required"),
  minPurchase: z.coerce.number().int().min(0).default(0),
  voucherLimitTotal: z.coerce.number().int().min(1, "Total voucher limit must be at least 1"),
  voucherLimitDaily: z.coerce.number().int().min(1).optional().nullable(),
  timeSlotLimit: z.coerce.number().int().min(1).optional().nullable(),
  firstTimeOnly: z.coerce.boolean().default(false),
  redemptionRules: z.string().optional(),
  voucherPrefix: z.string().min(1).max(6).default("VCH"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  collectGuests: z.coerce.boolean().default(false),
  collectEmail: z.coerce.boolean().default(false),
  requireDateTime: z.coerce.boolean().default(true),
  branchIds: z.array(z.string()).default([]),
  serviceIds: z.array(z.string()).default([]),
  timeSlots: z.array(z.string()).default([]),
  smsTemplate: z.string().min(1, "SMS template is required"),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const d = parsed.data;

    if (!canAccessBusiness(actor, d.businessId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const start = new Date(d.startDate);
    const end = new Date(d.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid start or end date." }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
    }

    const slugExists = await prisma.campaign.findUnique({ where: { slug: d.slug } });
    if (slugExists) {
      return NextResponse.json({ error: "That landing-page slug is already taken." }, { status: 409 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        businessId: d.businessId,
        name: d.name,
        slug: d.slug,
        channel: d.channel,
        offerTitle: d.offerTitle,
        offerDescription: d.offerDescription || null,
        voucherBenefit: d.voucherBenefit,
        minPurchase: d.minPurchase,
        voucherLimitTotal: d.voucherLimitTotal,
        voucherLimitDaily: d.voucherLimitDaily ?? null,
        timeSlotLimit: d.timeSlotLimit ?? null,
        firstTimeOnly: d.firstTimeOnly,
        redemptionRules: d.redemptionRules || null,
        voucherPrefix: d.voucherPrefix.toUpperCase(),
        startDate: start,
        endDate: end,
        collectGuests: d.collectGuests,
        collectEmail: d.collectEmail,
        requireDateTime: d.requireDateTime,
        branchIds: d.branchIds,
        serviceIds: d.serviceIds,
        timeSlots: d.timeSlots,
        smsTemplate: d.smsTemplate,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ ok: true, id: campaign.id });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create campaign." }, { status: 500 });
  }
}
