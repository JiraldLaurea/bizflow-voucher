-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'BUSINESS_OWNER', 'BRANCH_MANAGER', 'STORE_STAFF', 'CAMPAIGN_OPERATOR');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('RESTAURANT', 'BEAUTY', 'PET_CLINIC', 'DENTAL', 'RETAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'MANAGED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('CREATED', 'ISSUED', 'DELIVERED', 'FAILED', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('REQUIRED', 'MARKETING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" "Industry" NOT NULL DEFAULT 'OTHER',
    "branchCount" INTEGER NOT NULL DEFAULT 1,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL DEFAULT 'VOUCHER',
    "channel" TEXT NOT NULL DEFAULT 'DIRECT',
    "offerTitle" TEXT NOT NULL,
    "offerDescription" TEXT,
    "voucherBenefit" TEXT NOT NULL,
    "minPurchase" INTEGER NOT NULL DEFAULT 0,
    "voucherLimitTotal" INTEGER NOT NULL,
    "voucherLimitDaily" INTEGER,
    "timeSlotLimit" INTEGER,
    "firstTimeOnly" BOOLEAN NOT NULL DEFAULT false,
    "redemptionRules" TEXT,
    "voucherPrefix" TEXT NOT NULL DEFAULT 'VCH',
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "voucherExpiryAt" TIMESTAMP(3),
    "landingTemplate" TEXT NOT NULL DEFAULT 'default',
    "collectGuests" BOOLEAN NOT NULL DEFAULT false,
    "collectEmail" BOOLEAN NOT NULL DEFAULT false,
    "requireDateTime" BOOLEAN NOT NULL DEFAULT true,
    "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "serviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timeSlots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "smsTemplate" TEXT NOT NULL,
    "trackingParams" JSONB,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "selectedDate" TIMESTAMP(3),
    "selectedTime" TEXT,
    "branchId" TEXT,
    "serviceId" TEXT,
    "guests" INTEGER,
    "source" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "condition" TEXT,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'CREATED',
    "issuedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedBranchId" TEXT,
    "orderValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "staffId" TEXT,
    "businessId" TEXT NOT NULL,
    "branchId" TEXT,
    "redemptionStatus" TEXT NOT NULL,
    "orderValue" INTEGER,
    "notes" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "voucherId" TEXT,
    "phone" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerMessageId" TEXT,
    "deliveryStatus" "SmsStatus" NOT NULL DEFAULT 'QUEUED',
    "failedReason" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptOut" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "businessId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_businessId_idx" ON "User"("businessId");

-- CreateIndex
CREATE INDEX "Branch_businessId_idx" ON "Branch"("businessId");

-- CreateIndex
CREATE INDEX "Service_businessId_idx" ON "Service"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_businessId_idx" ON "Campaign"("businessId");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_campaignId_phone_key" ON "Lead"("campaignId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_leadId_key" ON "Voucher"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_campaignId_idx" ON "Voucher"("campaignId");

-- CreateIndex
CREATE INDEX "Voucher_status_idx" ON "Voucher"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_voucherId_key" ON "Redemption"("voucherId");

-- CreateIndex
CREATE INDEX "Redemption_businessId_idx" ON "Redemption"("businessId");

-- CreateIndex
CREATE INDEX "SmsLog_leadId_idx" ON "SmsLog"("leadId");

-- CreateIndex
CREATE INDEX "SmsLog_voucherId_idx" ON "SmsLog"("voucherId");

-- CreateIndex
CREATE INDEX "ConsentRecord_leadId_idx" ON "ConsentRecord"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "OptOut_businessId_phone_key" ON "OptOut"("businessId", "phone");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_idx" ON "AuditLog"("businessId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptOut" ADD CONSTRAINT "OptOut_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
