import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, AuthError, VALIDATION_ROLES } from "@/lib/rbac";
import { redeemVoucher } from "@/lib/redemption";

const schema = z.object({
  code: z.string().min(1),
  orderValue: z.coerce.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const staff = await requireRole(VALIDATION_ROLES);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

    const result = await redeemVoucher(parsed.data.code, staff, {
      orderValue: parsed.data.orderValue ?? null,
      notes: parsed.data.notes ?? null,
    });

    const status = result.ok ? 200 : 409;
    return NextResponse.json(result, { status });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Redemption failed." }, { status: 500 });
  }
}
