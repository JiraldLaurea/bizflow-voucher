import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["PLATFORM_ADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER", "STORE_STAFF", "CAMPAIGN_OPERATOR"]),
  businessId: z.string().optional().or(z.literal("")),
  branchId: z.string().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const actor = await requireUser();
    if (actor.role !== "PLATFORM_ADMIN" && actor.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const d = parsed.data;

    // Scoping rules
    let businessId: string | null = d.businessId || null;
    if (actor.role === "BUSINESS_OWNER") {
      // Owners can only create users in their own business, and not platform admins.
      businessId = actor.businessId;
      if (d.role === "PLATFORM_ADMIN" || d.role === "BUSINESS_OWNER") {
        return NextResponse.json({ error: "You cannot create that role." }, { status: 403 });
      }
    }
    if (d.role !== "PLATFORM_ADMIN" && !businessId) {
      return NextResponse.json({ error: "A business is required for this role." }, { status: 400 });
    }
    if ((d.role === "BRANCH_MANAGER" || d.role === "STORE_STAFF") && !d.branchId) {
      return NextResponse.json({ error: "A branch is required for staff roles." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        passwordHash: await hashPassword(d.password),
        role: d.role,
        businessId: d.role === "PLATFORM_ADMIN" ? null : businessId,
        branchId: d.branchId || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
