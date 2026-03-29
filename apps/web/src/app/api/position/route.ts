import { NextRequest, NextResponse } from "next/server";
import { getPositionSnapshot } from "@/lib/services/position-service";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }

  const useMock = request.nextUrl.searchParams.get("mock") === "true";
  const snapshot = await getPositionSnapshot(wallet, useMock);

  return NextResponse.json(snapshot);
}
