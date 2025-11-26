import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { barcode, typeName, name, locationName, notes, quantity, quantity_per_unit, unit } = await req.json();
  const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
  const qpu = quantity_per_unit ? parseFloat(quantity_per_unit) : 1;
  const u = unit || "each";

  try {
    // 1) Find or create item type
    let itemType = null;
    if (typeName) {
      itemType = await prisma.itemType.upsert({
        where: { name: typeName },
        update: {},
        create: { name: typeName },
      });
    }

    // 2) Find or create location
    let location = null;
    if (locationName) {
      location = await prisma.location.upsert({
        where: { name: locationName },
        update: {},
        create: { name: locationName },
      });
    }

    // 3) Find or create item
    let item;
    if (barcode && barcode.trim()) {
      // If barcode is provided, try to find existing or create new
      item = await prisma.item.findUnique({
        where: { barcode },
      });

      if (!item) {
        item = await prisma.item.create({
          data: {
            name,
            barcode,
            unit: u,
            quantityPerUnit: qpu,
            itemTypeId: itemType?.id,
            locationId: location?.id,
            notes,
          },
        });
      }
    } else {
      // If no barcode, just create a new item
      item = await prisma.item.create({
        data: {
          name,
          barcode: null,
          unit: u,
          quantityPerUnit: qpu,
          itemTypeId: itemType?.id,
          locationId: location?.id,
          notes,
        },
      });
    }

    // 4) Create transaction
    await prisma.transaction.create({
      data: {
        itemId: item.id,
        kind: "in",
        quantity: qty,
        delta: qty,
        note: notes,
      },
    });

    // 5) Get current qty
    const transactions = await prisma.transaction.findMany({
      where: { itemId: item.id },
    });
    const currentQty = transactions.reduce((sum: number, t: { delta: number }) => sum + t.delta, 0);

    return NextResponse.json({ success: true, itemId: item.id, currentQty });
  } catch (error) {
    console.error("Error in add route:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
