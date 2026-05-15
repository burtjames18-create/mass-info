import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getTradeHistory } from "@/lib/trading";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ticker = request.nextUrl.searchParams.get("ticker") || undefined;
  const trades = getTradeHistory(user.userId, ticker);
  return NextResponse.json(trades);
}
