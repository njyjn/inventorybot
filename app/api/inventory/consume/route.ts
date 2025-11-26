import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { barcode, quantity, note } = await req.json();
  const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;

  try {
    const item = await prisma.item.findUnique({
      where: { barcode },
      include: { transactions: true },
    });

    if (!item) {
      return NextResponse.json({ success: false, error: "Item not found for barcode" }, { status: 404 });
    }

    // Check if sufficient quantity exists
    const currentQty = item.transactions.reduce((sum: number, t: { delta: number }) => sum + t.delta, 0);

    if (currentQty - qty < 0) {
      return NextResponse.json({ success: false, error: "Insufficient quantity" }, { status: 400 });
    }

    // Create OUT transaction
    await prisma.transaction.create({
      data: {
        itemId: item.id,
        kind: "out",
        quantity: qty,
        delta: -qty,
        note,
      },
    });

    // Get new current qty
    const updatedTransactions = await prisma.transaction.findMany({
      where: { itemId: item.id },
    });
    const newCurrentQty = updatedTransactions.reduce((sum: number, t: { delta: number }) => sum + t.delta, 0);

    return NextResponse.json({ success: true, itemId: item.id, currentQty: newCurrentQty });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
