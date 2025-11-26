import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const types = await prisma.itemType.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, types });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ success: false, error: "Name required" }, { status: 400 });
    }
    const type = await prisma.itemType.create({
      data: { name },
    });
    return NextResponse.json({ success: true, id: type.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
