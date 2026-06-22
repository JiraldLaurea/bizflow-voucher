import { prisma } from "@/lib/prisma";

// Campaign funnel metrics (Business Plan §7.6 / §17.1).
// We compute the part of the funnel the platform owns end-to-end:
// form submissions -> vouchers issued -> SMS delivered -> redeemed -> revenue.
// Upstream ad metrics (reach, clicks, ad spend, ROAS) require ad-platform
// integration and are intentionally out of MVP scope.

export interface CampaignMetrics {
  formSubmissions: number; // leads
  vouchersIssued: number;
  smsDelivered: number;
  smsFailed: number;
  vouchersRedeemed: number;
  redemptionRate: number; // 0..1
  estimatedRevenue: number; // sum of recorded order values (pesos)
  averageOrderValue: number; // pesos
  remaining: number; // vouchers left vs total limit
  totalLimit: number;
}

export async function computeCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
  const [campaign, formSubmissions, vouchersIssued, smsDelivered, smsFailed, redeemed, revenueAgg] =
    await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId } }),
      prisma.lead.count({ where: { campaignId } }),
      prisma.voucher.count({ where: { campaignId } }),
      prisma.smsLog.count({ where: { voucher: { campaignId }, deliveryStatus: { in: ["SENT", "DELIVERED"] } } }),
      prisma.smsLog.count({ where: { voucher: { campaignId }, deliveryStatus: "FAILED" } }),
      prisma.voucher.count({ where: { campaignId, status: "USED" } }),
      prisma.voucher.aggregate({ where: { campaignId, status: "USED" }, _sum: { orderValue: true } }),
    ]);

  const totalLimit = campaign?.voucherLimitTotal ?? 0;
  const estimatedRevenue = revenueAgg._sum.orderValue ?? 0;
  const redemptionRate = vouchersIssued > 0 ? redeemed / vouchersIssued : 0;
  const averageOrderValue = redeemed > 0 ? Math.round(estimatedRevenue / redeemed) : 0;

  return {
    formSubmissions,
    vouchersIssued,
    smsDelivered,
    smsFailed,
    vouchersRedeemed: redeemed,
    redemptionRate,
    estimatedRevenue,
    averageOrderValue,
    remaining: Math.max(0, totalLimit - vouchersIssued),
    totalLimit,
  };
}
