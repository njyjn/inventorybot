import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const barcode = req.nextUrl?.searchParams.get("barcode") ?? null;
    if (!barcode) return NextResponse.json({ success: false, error: "barcode required" }, { status: 400 });

    const item = await prisma.item.findFirst({
      where: { barcode: barcode.trim() },
      include: {
        itemType: true,
        location: true,
        transactions: true,
      },
    });

    if (!item) {
      return NextResponse.json({ success: true, found: false });
    }

    const current_qty = item.transactions.reduce((sum: number, t: { delta: number }) => sum + t.delta, 0);

    const result = {
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      unit: item.unit,
      quantity_per_unit: item.quantityPerUnit,
      active: item.active,
      type_name: item.itemType?.name || null,
      location_name: item.location?.name || null,
      notes: item.notes,
      current_qty,
    };

    return NextResponse.json({ success: true, found: true, item: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

