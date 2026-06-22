import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError, canAccessBusiness, businessScope } from "@/lib/rbac";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function csvResponse(filename: string, body: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR", "BRANCH_MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "leads";
    const campaignId = url.searchParams.get("campaignId") ?? undefined;

    // Scope: a specific campaign (access-checked) or all campaigns in the user's business.
    let campaignFilter: { id?: string; businessId?: string };
    if (campaignId) {
      const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      if (!canAccessBusiness(user, campaign.businessId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      campaignFilter = { id: campaign.id };
    } else {
      campaignFilter = businessScope(user);
    }

    if (type === "vouchers") {
      const vouchers = await prisma.voucher.findMany({
        where: { campaign: campaignFilter },
        orderBy: { createdAt: "desc" },
        include: { campaign: { include: { business: true } }, lead: true },
      });
      const headers = [
        "voucher_code", "business", "campaign", "customer", "phone", "benefit", "condition",
        "status", "issued_at", "expiry_date", "used_at", "order_value",
      ];
      const rows = vouchers.map((v) => [
        v.code, v.campaign.business.name, v.campaign.name, v.lead.name, v.lead.phone,
        v.benefit, v.condition ?? "", v.status,
        v.issuedAt?.toISOString() ?? "", v.expiryDate.toISOString(),
        v.usedAt?.toISOString() ?? "", v.orderValue ?? "",
      ]);
      return csvResponse("vouchers.csv", toCsv(headers, rows));
    }

    // Default: leads / customer database (§7.7)
    const leads = await prisma.lead.findMany({
      where: { campaign: campaignFilter },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { include: { business: true } },
        branch: true,
        service: true,
        voucher: true,
      },
    });
    const headers = [
      "name", "phone", "email", "business", "campaign", "source",
      "selected_date", "selected_time", "branch", "service", "guests",
      "marketing_consent", "voucher_code", "voucher_status", "order_value", "claimed_at",
    ];
    const rows = leads.map((l) => [
      l.name, l.phone, l.email ?? "", l.campaign.business.name, l.campaign.name, l.source ?? "",
      l.selectedDate?.toISOString().slice(0, 10) ?? "", l.selectedTime ?? "",
      l.branch?.name ?? "", l.service?.name ?? "", l.guests ?? "",
      l.marketingConsent ? "yes" : "no",
      l.voucher?.code ?? "", l.voucher?.status ?? "", l.voucher?.orderValue ?? "",
      l.createdAt.toISOString(),
    ]);
    return csvResponse("leads.csv", toCsv(headers, rows));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
