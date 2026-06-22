import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessBusiness } from "@/lib/rbac";
import { computeCampaignMetrics } from "@/lib/metrics";
import { peso, pct, dateTime, dateShort } from "@/lib/format";
import Stat from "@/components/Stat";
import CampaignStatusControl from "@/components/CampaignStatusControl";
import CopyLink from "@/components/CopyLink";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge neutral",
  ACTIVE: "badge ok",
  PAUSED: "badge warning",
  ENDED: "badge neutral",
};

const VOUCHER_BADGE: Record<string, string> = {
  CREATED: "badge neutral",
  ISSUED: "badge",
  DELIVERED: "badge ok",
  FAILED: "badge danger",
  USED: "badge ok",
  EXPIRED: "badge neutral",
  CANCELLED: "badge neutral",
};

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");

  if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR", "BRANCH_MANAGER"].includes(user.role)) {
    redirect("/validate");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: { business: true },
  });
  if (!campaign) notFound();
  if (!canAccessBusiness(user, campaign.businessId)) redirect("/dashboard");

  const metrics = await computeCampaignMetrics(campaign.id);
  const leads = await prisma.lead.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { voucher: true, branch: true, service: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const landingUrl = `${appUrl}/claim/${campaign.slug}`;
  const canManage = ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(user.role);

  return (
    <div>
      <div className="breadcrumb">
        <Link href="/campaigns">Campaigns</Link>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>{campaign.name}</span>
      </div>

      <div className="topbar">
        <div className="topbar-title">
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {campaign.name}
            <span className={STATUS_BADGE[campaign.status] ?? "badge neutral"}>{campaign.status}</span>
          </h1>
          <p>{campaign.business.name} · {campaign.voucherBenefit}{campaign.minPurchase > 0 && ` · min ${peso(campaign.minPurchase)}`}</p>
        </div>
        {canManage && <CampaignStatusControl id={campaign.id} status={campaign.status} />}
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Public claim link</h2>
        <CopyLink url={landingUrl} />
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
          Share this link or QR code in your ad CTA, link-in-bio, or auto-DM reply.
          {campaign.status !== "ACTIVE" && " Activate the campaign to start issuing vouchers."}
        </p>
      </section>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>
          Performance
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 12 }}>
          <Stat label="Form submissions" value={metrics.formSubmissions} />
          <Stat label="Vouchers issued" value={metrics.vouchersIssued} hint={`${metrics.remaining} of ${metrics.totalLimit} left`} />
          <Stat label="SMS delivered" value={metrics.smsDelivered} hint={metrics.smsFailed > 0 ? `${metrics.smsFailed} failed` : undefined} />
          <Stat label="Redeemed" value={metrics.vouchersRedeemed} />
          <Stat label="Redemption rate" value={pct(metrics.redemptionRate)} />
          <Stat label="Est. revenue" value={peso(metrics.estimatedRevenue)} />
          <Stat label="Avg order value" value={peso(metrics.averageOrderValue)} />
          <Stat label="Channel" value={campaign.channel} />
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
          Ad reach, clicks, spend and ROAS require ad-platform integration and are not shown here.
        </p>
      </div>

      {canManage && (
        <div className="actions" style={{ marginBottom: 16 }}>
          <a href={`/api/export?type=leads&campaignId=${campaign.id}`} className="btn-secondary">Export leads CSV</a>
          <a href={`/api/export?type=vouchers&campaignId=${campaign.id}`} className="btn-secondary">Export vouchers CSV</a>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent leads</h2>
        {leads.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No claims yet.</p>
        ) : (
          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Booking</th>
                    <th>Code</th>
                    <th>Voucher status</th>
                    <th>Claimed</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{l.name}</div>
                        {l.service && <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.service.name}</div>}
                      </td>
                      <td style={{ color: "var(--muted)" }}>{l.phone}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {l.selectedDate ? `${dateShort(l.selectedDate)} ${l.selectedTime ?? ""}` : "—"}
                        {l.branch && <div style={{ fontSize: 12, color: "var(--muted)" }}>{l.branch.name}</div>}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{l.voucher?.code ?? "—"}</td>
                      <td>
                        {l.voucher ? (
                          <span className={VOUCHER_BADGE[l.voucher.status] ?? "badge neutral"}>{l.voucher.status}</span>
                        ) : "—"}
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: 13 }}>{dateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
