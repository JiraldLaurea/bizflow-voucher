import { PrismaClient, UserRole, Industry, CampaignStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding BizFlow Voucher Engine...");

  // --- Platform admin (§16.3) ---
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@bizflow.test" },
    update: {},
    create: {
      email: "admin@bizflow.test",
      passwordHash: adminPassword,
      name: "Platform Admin",
      role: UserRole.PLATFORM_ADMIN,
    },
  });
  console.log(`  Platform admin: ${admin.email} / admin1234`);

  // --- Pilot 1: Restaurant (§23) ---
  const restaurant = await prisma.business.upsert({
    where: { id: "seed-restaurant" },
    update: {},
    create: {
      id: "seed-restaurant",
      name: "Vine Patio Bistro",
      industry: Industry.RESTAURANT,
      branchCount: 1,
      contactPerson: "Maria Santos",
      phone: "+639170000001",
      email: "owner@vinepatio.test",
    },
  });

  const restoBranch = await prisma.branch.upsert({
    where: { id: "seed-resto-branch" },
    update: {},
    create: {
      id: "seed-resto-branch",
      businessId: restaurant.id,
      name: "Makati Main",
      address: "Makati City",
    },
  });

  const ownerPassword = await bcrypt.hash("owner1234", 10);
  await prisma.user.upsert({
    where: { email: "owner@vinepatio.test" },
    update: {},
    create: {
      email: "owner@vinepatio.test",
      passwordHash: ownerPassword,
      name: "Maria Santos",
      role: UserRole.BUSINESS_OWNER,
      businessId: restaurant.id,
    },
  });

  const staffPassword = await bcrypt.hash("staff1234", 10);
  await prisma.user.upsert({
    where: { email: "staff@vinepatio.test" },
    update: {},
    create: {
      email: "staff@vinepatio.test",
      passwordHash: staffPassword,
      name: "Front Desk",
      role: UserRole.STORE_STAFF,
      businessId: restaurant.id,
      branchId: restoBranch.id,
    },
  });

  await prisma.campaign.upsert({
    where: { slug: "vine-dinner-weekend" },
    update: {},
    create: {
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
      status: CampaignStatus.ACTIVE,
    },
  });

  // --- Pilot 2: Skincare Clinic (§23) ---
  const clinic = await prisma.business.upsert({
    where: { id: "seed-skincare" },
    update: {},
    create: {
      id: "seed-skincare",
      name: "GlowLab Skin Clinic",
      industry: Industry.BEAUTY,
      branchCount: 1,
      contactPerson: "Dr. Ana Cruz",
    },
  });
  const clinicBranch = await prisma.branch.upsert({
    where: { id: "seed-skincare-branch" },
    update: {},
    create: { id: "seed-skincare-branch", businessId: clinic.id, name: "BGC Clinic" },
  });
  const consult = await prisma.service.upsert({
    where: { id: "seed-svc-consult" },
    update: {},
    create: { id: "seed-svc-consult", businessId: clinic.id, name: "Acne Care Consultation" },
  });
  const facial = await prisma.service.upsert({
    where: { id: "seed-svc-facial" },
    update: {},
    create: { id: "seed-svc-facial", businessId: clinic.id, name: "Whitening Facial" },
  });
  await prisma.campaign.upsert({
    where: { slug: "glow-consult" },
    update: {},
    create: {
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
      status: CampaignStatus.ACTIVE,
    },
  });

  // --- Pilot 3: Pet Clinic (§23) ---
  const pet = await prisma.business.upsert({
    where: { id: "seed-pet" },
    update: {},
    create: {
      id: "seed-pet",
      name: "HappyPaws Pet Clinic",
      industry: Industry.PET_CLINIC,
      branchCount: 1,
    },
  });
  const petBranch = await prisma.branch.upsert({
    where: { id: "seed-pet-branch" },
    update: {},
    create: { id: "seed-pet-branch", businessId: pet.id, name: "QC Branch" },
  });
  await prisma.campaign.upsert({
    where: { slug: "pet-checkup" },
    update: {},
    create: {
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
      status: CampaignStatus.ACTIVE,
    },
  });

  console.log("Seed complete. 3 pilot campaigns: /claim/vine-dinner-weekend, /claim/glow-consult, /claim/pet-checkup");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
