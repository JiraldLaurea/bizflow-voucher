import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Wipe all transactional + demo data and re-create the original sample fixtures.
 * Mirrors prisma/seed.ts. Restricted to PLATFORM_ADMIN via the API route.
 *
 * Deletes everything: leads, vouchers, redemptions, SMS logs, campaigns,
 * services, branches, businesses, and all non-platform-admin users — then
 * re-seeds the 3 pilot businesses, their users, and campaigns.
 */
export async function resetDemoData(): Promise<{ businesses: number; campaigns: number; users: number }> {
  // Order matters: clear children before parents to respect FKs even where
  // cascade isn't configured.
  await prisma.$transaction([
    prisma.smsLog.deleteMany({}),
    prisma.consentRecord.deleteMany({}),
    prisma.redemption.deleteMany({}),
    prisma.voucher.deleteMany({}),
    prisma.lead.deleteMany({}),
    prisma.optOut.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.campaign.deleteMany({}),
    prisma.service.deleteMany({}),
    prisma.branch.deleteMany({}),
    // Keep the platform admin so the current session stays valid.
    prisma.user.deleteMany({ where: { role: { not: "PLATFORM_ADMIN" } } }),
    prisma.business.deleteMany({}),
  ]);

  // --- Platform admin (ensure it exists) ---
  await prisma.user.upsert({
    where: { email: "admin@bizflow.test" },
    update: {},
    create: {
      email: "admin@bizflow.test",
      passwordHash: await hashPassword("admin1234"),
      name: "Platform Admin",
      role: "PLATFORM_ADMIN",
    },
  });

  // --- Pilot 1: Restaurant ---
  const restaurant = await prisma.business.create({
    data: {
      id: "seed-restaurant",
      name: "Vine Patio Bistro",
      industry: "RESTAURANT",
      branchCount: 1,
      contactPerson: "Maria Santos",
      phone: "+639170000001",
      email: "owner@vinepatio.test",
    },
  });
  const restoBranch = await prisma.branch.create({
    data: { id: "seed-resto-branch", businessId: restaurant.id, name: "Makati Main", address: "Makati City" },
  });
  await prisma.user.create({
    data: {
      email: "owner@vinepatio.test",
      passwordHash: await hashPassword("owner1234"),
      name: "Maria Santos",
      role: "BUSINESS_OWNER",
      businessId: restaurant.id,
    },
  });
  await prisma.user.create({
    data: {
      email: "staff@vinepatio.test",
      passwordHash: await hashPassword("staff1234"),
      name: "Front Desk",
      role: "STORE_STAFF",
      businessId: restaurant.id,
      branchId: restoBranch.id,
    },
  });
  await prisma.campaign.create({
    data: {
      businessId: restaurant.id,
      name: "Weekend Dinner Voucher",
      slug: "vine-dinner-weekend",
      channel: "FB",
      offerTitle: "₱300 OFF your weekend dinner",
      offerDescription: "Comment DINNER and claim a limited ₱300 dinner voucher this weekend.",
      voucherBenefit: "₱300 off dinner",
      minPurchase: 1500,
      voucherLimitTotal: 100,
      voucherLimitDaily: 30,
      firstTimeOnly: false,
      voucherPrefix: "VINE",
      startDate: daysFromNow(-1),
      endDate: daysFromNow(14),
      collectGuests: true,
      requireDateTime: true,
      branchIds: [restoBranch.id],
      timeSlots: ["18:00", "19:00", "20:00", "21:00"],
      smsTemplate:
        "[{{business}}] Your {{benefit}} voucher is confirmed. Code: {{code}}. Date: {{datetime}}. Show this SMS in-store. Valid until {{expiry}}.",
      status: "ACTIVE",
    },
  });

  // --- Pilot 2: Skincare Clinic ---
  const clinic = await prisma.business.create({
    data: {
      id: "seed-skincare",
      name: "GlowLab Skin Clinic",
      industry: "BEAUTY",
      branchCount: 1,
      contactPerson: "Dr. Ana Cruz",
    },
  });
  const clinicBranch = await prisma.branch.create({
    data: { id: "seed-skincare-branch", businessId: clinic.id, name: "BGC Clinic" },
  });
  const consult = await prisma.service.create({
    data: { id: "seed-svc-consult", businessId: clinic.id, name: "Acne Care Consultation" },
  });
  const facial = await prisma.service.create({
    data: { id: "seed-svc-facial", businessId: clinic.id, name: "Whitening Facial" },
  });
  await prisma.campaign.create({
    data: {
      businessId: clinic.id,
      name: "GLOW Consultation Voucher",
      slug: "glow-consult",
      channel: "IG",
      offerTitle: "Free skin consultation + ₱500 treatment voucher",
      offerDescription: "Comment GLOW and claim your skincare consultation voucher.",
      voucherBenefit: "Free consultation + ₱500 off treatment",
      minPurchase: 0,
      voucherLimitTotal: 50,
      firstTimeOnly: true,
      voucherPrefix: "GLOW",
      startDate: daysFromNow(-1),
      endDate: daysFromNow(21),
      collectEmail: true,
      requireDateTime: true,
      branchIds: [clinicBranch.id],
      serviceIds: [consult.id, facial.id],
      timeSlots: ["10:00", "13:00", "15:00", "17:00"],
      smsTemplate:
        "[{{business}}] Your {{benefit}} voucher is confirmed. Code: {{code}}. Booking: {{datetime}}. Valid until {{expiry}}. Reply STOP to opt out.",
      status: "ACTIVE",
    },
  });

  // --- Pilot 3: Pet Clinic ---
  const pet = await prisma.business.create({
    data: { id: "seed-pet", name: "HappyPaws Pet Clinic", industry: "PET_CLINIC", branchCount: 1 },
  });
  const petBranch = await prisma.branch.create({
    data: { id: "seed-pet-branch", businessId: pet.id, name: "QC Branch" },
  });
  await prisma.campaign.create({
    data: {
      businessId: pet.id,
      name: "Free Pet Check-up",
      slug: "pet-checkup",
      channel: "FB",
      offerTitle: "Free basic pet check-up for first-time visitors",
      offerDescription: "Comment PET and get a free basic pet check-up voucher.",
      voucherBenefit: "Free basic check-up",
      minPurchase: 0,
      voucherLimitTotal: 50,
      firstTimeOnly: true,
      voucherPrefix: "PET",
      startDate: daysFromNow(-1),
      endDate: daysFromNow(30),
      requireDateTime: true,
      branchIds: [petBranch.id],
      timeSlots: ["09:00", "11:00", "14:00", "16:00"],
      smsTemplate:
        "[{{business}}] Your {{benefit}} voucher is confirmed. Code: {{code}}. Visit: {{datetime}}. Valid until {{expiry}}.",
      status: "ACTIVE",
    },
  });

  const [businesses, campaigns, users] = await Promise.all([
    prisma.business.count(),
    prisma.campaign.count(),
    prisma.user.count(),
  ]);
  return { businesses, campaigns, users };
}
