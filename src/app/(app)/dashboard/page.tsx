import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessScope } from "@/lib/rbac";
import { peso, pct } from "@/lib/format";
import Stat from "@/components/Stat";
import ClickableRow from "@/components/ClickableRow";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge neutral",
  ACTIVE: "badge ok",
  PAUSED: "badge warning",
  ENDED: "badge neutral",
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "STORE_STAFF") redirect("/validate");

  const scope = businessScope(user);
  const campaignWhere = scope.businessId ? { businessId: scope.businessId } : {};
  const voucherWhere = { campaign: campaignWhere };

  const [activeCampaigns, totalCampaigns, issued, redeemed, smsDelivered, revenueAgg, topCampaigns] =
    await Promise.all([
      prisma.campaign.count({ where: { ...campaignWhere, status: "ACTIVE" } }),
      prisma.campaign.count({ where: campaignWhere }),
      prisma.voucher.count({ where: voucherWhere }),
      prisma.voucher.count({ where: { ...voucherWhere, status: "USED" } }),
      prisma.smsLog.count({ where: { voucher: { campaign: campaignWhere }, deliveryStatus: { in: ["SENT", "DELIVERED"] } } }),
      prisma.voucher.aggregate({ where: { ...voucherWhere, status: "USED" }, _sum: { orderValue: true } }),
      prisma.campaign.findMany({
        where: campaignWhere,
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { business: true, _count: { select: { vouchers: true } } },
      }),
    ]);

  const redemptionRate = issued > 0 ? redeemed / issued : 0;
  const revenue = revenueAgg._sum.orderValue ?? 0;

  const canCreate = ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(user.role);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Dashboard</h1>
          <p>Welcome back, {user.name.split(" ")[0]}</p>
        </div>
        {canCreate && (
          <Link href="/campaigns/new" className="btn-primary">+ New Campaign</Link>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Stat label="Active campaigns" value={activeCampaigns} hint={`${totalCampaigns} total`} />
        <Stat label="Vouchers issued" value={issued} />
        <Stat label="Redeemed" value={redeemed} />
        <Stat label="Redemption rate" value={pct(redemptionRate)} />
        <Stat label="SMS delivered" value={smsDelivered} />
        <Stat label="Est. revenue" value={peso(revenue)} />
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent campaigns</h2>
          <Link href="/campaigns" className="text-link" style={{ fontSize: 13 }}>View all →</Link>
        </div>

        {topCampaigns.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
            No campaigns yet.{" "}
            {canCreate && (
              <Link href="/campaigns/new" className="text-link">Create your first campaign →</Link>
            )}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Business</th>
                  <th>Benefit</th>
                  <th>Issued / Limit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => (
                  <ClickableRow key={c.id} href={`/campaigns/${c.id}`}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>/claim/{c.slug}</div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{c.business.name}</td>
                    <td style={{ color: "var(--muted)" }}>{c.voucherBenefit}</td>
                    <td style={{ color: "var(--muted)" }}>{c.issuedCount} / {c.voucherLimitTotal}</td>
                    <td>
                      <span className={STATUS_BADGE[c.status] ?? "badge neutral"}>{c.status}</span>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
