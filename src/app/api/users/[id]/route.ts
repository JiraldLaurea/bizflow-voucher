import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/rbac";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireUser();
    if (actor.role !== "PLATFORM_ADMIN" && actor.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const target = await prisma.user.findUnique({ where: { id: params.id } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Owners can only manage users in their own business.
    if (actor.role === "BUSINESS_OWNER" && target.businessId !== actor.businessId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (target.id === actor.id) {
      return NextResponse.json({ error: "You cannot deactivate yourself." }, { status: 400 });
    }

    await prisma.user.update({ where: { id: params.id }, data: { isActive: parsed.data.isActive } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
