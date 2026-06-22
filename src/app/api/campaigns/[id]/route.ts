import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError, canAccessBusiness } from "@/lib/rbac";

const schema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    if (!["PLATFORM_ADMIN", "BUSINESS_OWNER", "CAMPAIGN_OPERATOR"].includes(actor.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (!canAccessBusiness(actor, campaign.businessId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.campaign.update({ where: { id: params.id }, data: { status: parsed.data.status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to update campaign." }, { status: 500 });
  }
}
