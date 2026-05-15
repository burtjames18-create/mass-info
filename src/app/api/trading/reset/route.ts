import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  db.transaction(() => {
    db.prepare(`UPDATE portfolios SET cash_balance = 100000.00 WHERE user_id = ?`).run(user.userId);
    db.prepare(`DELETE FROM positions WHERE user_id = ?`).run(user.userId);
    db.prepare(`DELETE FROM trades WHERE user_id = ?`).run(user.userId);
  })();

  return NextResponse.json({ ok: true });
}
