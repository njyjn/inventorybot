import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, delta, note } = body;

    if (!id || delta === undefined) {
      return NextResponse.json({ success: false, error: "Missing id or delta" }, { status: 400 });
    }

    // Create ADJUST transaction
    await prisma.transaction.create({
      data: {
        itemId: id,
        kind: "adjust",
        quantity: Math.abs(delta),
        delta,
        note: note || "Manual adjustment",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Adjust error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
