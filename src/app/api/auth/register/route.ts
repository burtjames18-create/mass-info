import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword, createSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "Username must be 3-20 characters" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const db = getDb();
    const existing = db
      .prepare(`SELECT id FROM users WHERE email = ? OR username = ?`)
      .get(email.toLowerCase(), username) as { id: number } | undefined;

    if (existing) {
      return NextResponse.json({ error: "Username or email already taken" }, { status: 409 });
    }

    const hash = await hashPassword(password);
    const result = db
      .prepare(`INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)`)
      .run(username, email.toLowerCase(), hash);

    const userId = result.lastInsertRowid as number;

    // Create portfolio with $100k
    db.prepare(`INSERT INTO portfolios (user_id) VALUES (?)`).run(userId);

    const token = createSession(userId);
    const res = NextResponse.json({ user: { id: userId, username, email } });
    res.cookies.set("session", token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (error) {
    return NextResponse.json({ error: `Registration failed: ${error}` }, { status: 500 });
  }
}
