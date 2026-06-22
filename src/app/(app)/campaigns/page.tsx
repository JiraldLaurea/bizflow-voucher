import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessScope } from "@/lib/rbac";
import ClickableRow from "@/components/ClickableRow";
import { dateRange } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "badge neutral",
  ACTIVE: "badge ok",
  PAUSED: "badge warning",
  ENDED: "badge neutral",
};

export default async function CampaignsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(user.role)) {
    redirect("/validate");
  }

  const campaigns = await prisma.campaign.findMany({
    where: businessScope(user),
    orderBy: { createdAt: "desc" },
    include: {
      business: true,
      _count: { select: { vouchers: true } },
    },
  });

  const canCreate = ["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(user.role);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-title">
          <h1>Campaigns</h1>
          <p>{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
        {canCreate && <Link href="/campaigns/new" className="btn-primary">+ New Campaign</Link>}
      </div>

      {campaigns.length === 0 ? (
        <div className="panel">
          <p style={{ color: "var(--muted)", margin: 0 }}>No campaigns yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Business</th>
                  <th>Offer</th>
                  <th>Duration</th>
                  <th>Issued / Limit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <ClickableRow key={c.id} href={`/campaigns/${c.id}`}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>/claim/{c.slug}</div>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{c.business.name}</td>
                    <td style={{ color: "var(--muted)" }}>{c.voucherBenefit}</td>
                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{dateRange(c.startDate, c.endDate)}</td>
                    <td style={{ color: "var(--muted)" }}>{c.issuedCount} / {c.voucherLimitTotal}</td>
                    <td>
                      <span className={STATUS_BADGE[c.status] ?? "badge neutral"}>{c.status}</span>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
