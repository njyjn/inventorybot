import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const items = await prisma.item.findMany({
      include: {
        itemType: true,
        location: true,
        transactions: true,
      },
      orderBy: { name: "asc" },
    });

    const result = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      unit: item.unit,
      quantity_per_unit: item.quantityPerUnit,
      notes: item.notes,
      active: item.active,
      current_qty: item.transactions.reduce((sum: number, t: { delta: number }) => sum + t.delta, 0),
      type_name: item.itemType?.name || null,
      location_name: item.location?.name || null,
    }));

    return NextResponse.json({ success: true, items: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
