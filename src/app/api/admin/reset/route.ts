import { NextResponse } from "next/server";
import { requireRole, AuthError } from "@/lib/rbac";
import { resetDemoData } from "@/lib/reset-demo";

export async function POST() {
  try {
    await requireRole(["PLATFORM_ADMIN"]);
    const counts = await resetDemoData();
    return NextResponse.json({ ok: true, ...counts });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to reset demo data." }, { status: 500 });
  }
}
