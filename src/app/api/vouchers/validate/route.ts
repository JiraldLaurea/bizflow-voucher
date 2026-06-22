import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole, AuthError, VALIDATION_ROLES } from "@/lib/rbac";
import { validateVoucher } from "@/lib/redemption";

const schema = z.object({ query: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const staff = await requireRole(VALIDATION_ROLES);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a code or mobile number." }, { status: 400 });

    const result = await validateVoucher(parsed.data.query, staff);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Validation failed." }, { status: 500 });
  }
}
