import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, AuthError, ADMIN_ROLES } from "@/lib/rbac";

const schema = z.object({
  name: z.string().min(1, "Business name is required"),
  industry: z.enum(["RESTAURANT", "BEAUTY", "PET_CLINIC", "DENTAL", "RETAIL", "OTHER"]),
  branchCount: z.coerce.number().int().min(1).default(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  subscriptionPlan: z.enum(["STARTER", "GROWTH", "MANAGED"]).default("STARTER"),
  firstBranchName: z.string().min(1, "First branch name is required"),
});

export async function POST(req: Request) {
  try {
    await requireRole(ADMIN_ROLES);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const d = parsed.data;

    const business = await prisma.business.create({
      data: {
        name: d.name,
        industry: d.industry,
        branchCount: d.branchCount,
        contactPerson: d.contactPerson || null,
        phone: d.phone || null,
        email: d.email || null,
        subscriptionPlan: d.subscriptionPlan,
        branches: { create: { name: d.firstBranchName } },
      },
    });

    return NextResponse.json({ ok: true, id: business.id });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create business." }, { status: 500 });
  }
}
