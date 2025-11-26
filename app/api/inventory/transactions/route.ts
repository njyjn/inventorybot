import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl?.searchParams.get("limit") ?? "50");
    const validLimit = Math.min(Math.max(limit, 1), 100);

    const transactions = await prisma.transaction.findMany({
      include: {
        item: {
          include: { location: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: validLimit,
    });

    const result = transactions.map((t: any) => ({
      id: t.id,
      kind: t.kind,
      quantity: t.quantity,
      delta: t.delta,
      created_at: t.createdAt,
      item_name: t.item?.name || null,
      barcode: t.item?.barcode || null,
      location_name: t.item?.location?.name || null,
    }));

    return NextResponse.json({ success: true, transactions: result });
  } catch (error) {
    console.error("[transactions GET] Error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
