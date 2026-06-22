import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// QR voucher generation (Business Plan §7.3). Encodes the voucher code so staff
// can scan it on the validation page. Only serves codes that actually exist.
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const voucher = await prisma.voucher.findUnique({ where: { code }, select: { id: true } });
  if (!voucher) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const png = await QRCode.toBuffer(code, { width: 240, margin: 1 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
