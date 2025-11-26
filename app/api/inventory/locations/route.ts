import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, locations });
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
    const location = await prisma.location.create({
      data: { name },
    });
    return NextResponse.json({ success: true, id: location.id });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
