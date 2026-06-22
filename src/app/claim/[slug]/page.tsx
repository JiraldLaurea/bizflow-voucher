import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { peso, dateShort } from "@/lib/format";
import ClaimForm, { type ClaimConfig } from "@/components/ClaimForm";

export const dynamic = "force-dynamic";

function Shell({ children, business }: { children: React.ReactNode; business?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ borderRadius: 12, background: "white", boxShadow: "var(--paper-edge)", overflow: "hidden" }}>
          <div style={{ background: "var(--accent)", padding: "16px 24px" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{business ?? "BizFlow Voucher"}</div>
          </div>
          <div style={{ padding: 24 }}>{children}</div>
        </div>
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>Powered by BizFlow Voucher Engine</p>
      </div>
    </div>
  );
}

export default async function ClaimPage({ params }: { params: { slug: string } }) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    include: { business: { include: { branches: { where: { isActive: true } }, services: true } } },
  });
  if (!campaign) notFound();

  const now = new Date();
  const remaining = Math.max(0, campaign.voucherLimitTotal - campaign.issuedCount);
  const isOpen =
    campaign.status === "ACTIVE" && now >= campaign.startDate && now <= campaign.endDate && remaining > 0;

  // Resolve selectable branches/services from campaign config.
  const branches =
    campaign.branchIds.length > 0
      ? campaign.business.branches.filter((b) => campaign.branchIds.includes(b.id))
      : campaign.business.branches;
  const services = campaign.business.services.filter(
    (s) => campaign.serviceIds.includes(s.id) && s.isActive
  );

  if (!isOpen) {
    let message = "This campaign is not currently available.";
    if (campaign.status === "ACTIVE" && remaining <= 0) message = "All vouchers have been claimed. 🙏";
    else if (now < campaign.startDate) message = `This campaign opens on ${dateShort(campaign.startDate)}.`;
    else if (now > campaign.endDate) message = "This campaign has ended.";
    return (
      <Shell business={campaign.business.name}>
        <h1 className="text-lg font-semibold">{campaign.offerTitle}</h1>
        <p className="mt-3 text-sm text-gray-600">{message}</p>
      </Shell>
    );
  }

  const config: ClaimConfig = {
    slug: campaign.slug,
    requireDateTime: campaign.requireDateTime,
    collectGuests: campaign.collectGuests,
    collectEmail: campaign.collectEmail,
    branches: branches.map((b) => ({ id: b.id, name: b.name })),
    services: services.map((s) => ({ id: s.id, name: s.name })),
    timeSlots: campaign.timeSlots,
    businessName: campaign.business.name,
  };

  return (
    <Shell business={campaign.business.name}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{campaign.offerTitle}</h1>
      {campaign.offerDescription && (
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>{campaign.offerDescription}</p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <span className="badge">{campaign.voucherBenefit}</span>
        {campaign.minPurchase > 0 && (
          <span className="badge neutral">Min spend {peso(campaign.minPurchase)}</span>
        )}
        {campaign.firstTimeOnly && (
          <span className="badge warning">First-time customers</span>
        )}
      </div>

      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        Only <strong>{remaining}</strong> voucher{remaining === 1 ? "" : "s"} left · valid until {dateShort(campaign.endDate)}
      </div>

      <hr style={{ border: "none", borderTop: "1px solid var(--line)", margin: "0 0 20px" }} />

      <ClaimForm config={config} />
    </Shell>
  );
}
