import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { businessRecordScope } from "@/lib/rbac";
import NewCampaignForm from "@/components/NewCampaignForm";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(user.role)) redirect("/dashboard");

  const businesses = await prisma.business.findMany({
    where: businessRecordScope(user),
    orderBy: { name: "asc" },
    include: {
      branches: { where: { isActive: true }, orderBy: { name: "asc" } },
      services: { where: { isActive: true }, orderBy: { name: "asc" } },
    },
  });

  if (businesses.length === 0) {
    return (
      <div>
        <div className="topbar"><div className="topbar-title"><h1>New Campaign</h1></div></div>
        <div className="panel">
          <p style={{ color: "var(--muted)", margin: 0 }}>
            You need a business before creating a campaign.{" "}
            {user.role === "PLATFORM_ADMIN" && <Link href="/businesses/new" className="text-link">Create one →</Link>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="breadcrumb">
        <Link href="/campaigns">Campaigns</Link>
        <span>/</span>
        <span style={{ color: "var(--ink)" }}>New</span>
      </div>
      <div className="topbar"><div className="topbar-title"><h1>New Campaign</h1></div></div>
      <NewCampaignForm
        businesses={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          branches: b.branches.map((br) => ({ id: br.id, name: br.name })),
          services: b.services.map((s) => ({ id: s.id, name: s.name })),
        }))}
      />
    </div>
  );
}
