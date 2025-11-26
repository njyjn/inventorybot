import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, notes, quantity_per_unit, unit, type_name, location_name } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
    }

    // Get or create type and location
    let typeId = null;
    let locationId = null;

    if (type_name) {
      const type = await prisma.itemType.findFirst({
        where: { name: type_name },
      });
      if (type) {
        typeId = type.id;
      } else {
        const newType = await prisma.itemType.create({
          data: { name: type_name },
        });
        typeId = newType.id;
      }
    }

    if (location_name) {
      const location = await prisma.location.findFirst({
        where: { name: location_name },
      });
      if (location) {
        locationId = location.id;
      } else {
        const newLocation = await prisma.location.create({
          data: { name: location_name },
        });
        locationId = newLocation.id;
      }
    }

    const updated = await prisma.item.update({
      where: { id },
      data: {
        name,
        notes: notes || null,
        quantityPerUnit: quantity_per_unit ? parseFloat(quantity_per_unit) : undefined,
        unit,
        itemTypeId: typeId || undefined,
        locationId: locationId || undefined,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
