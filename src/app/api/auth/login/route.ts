import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSession, SESSION_COOKIE_OPTIONS } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = getDb();
    const user = db
      .prepare(`SELECT id, username, password_hash, is_admin FROM users WHERE email = ?`)
      .get(email.toLowerCase()) as
      | { id: number; username: string; password_hash: string; is_admin: number }
      | undefined;

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = createSession(user.id);
    const res = NextResponse.json({
      user: { id: user.id, username: user.username, email, isAdmin: user.is_admin === 1 },
    });
    res.cookies.set("session", token, SESSION_COOKIE_OPTIONS);
    return res;
  } catch (error) {
    return NextResponse.json({ error: `Login failed: ${error}` }, { status: 500 });
  }
}
