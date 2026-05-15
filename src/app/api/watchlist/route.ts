import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const items = db
      .prepare("SELECT ticker, added_at as addedAt FROM watchlist ORDER BY added_at DESC")
      .all();
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ticker } = await request.json();
    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      "INSERT OR IGNORE INTO watchlist (ticker) VALUES (?)"
    ).run(ticker.toUpperCase());

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ticker } = await request.json();
    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM watchlist WHERE ticker = ?").run(
      ticker.toUpperCase()
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: `${error}` }, { status: 500 });
  }
}
