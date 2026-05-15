import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

function requireAdmin(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user || !user.isAdmin) return null;
  return user;
}

// GET — list all users
export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getDb();
  const users = db.prepare(
    `SELECT id, username, email, is_admin as isAdmin, created_at as createdAt FROM users ORDER BY created_at ASC`
  ).all();
  return NextResponse.json(users);
}

// PATCH — update a user (password, admin flag, username)
export async function PATCH(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, username, email, password, isAdmin } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  if (username !== undefined) db.prepare(`UPDATE users SET username = ? WHERE id = ?`).run(username, id);
  if (email !== undefined) db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(email, id);
  if (isAdmin !== undefined) db.prepare(`UPDATE users SET is_admin = ? WHERE id = ?`).run(isAdmin ? 1 : 0, id);
  if (password) {
    const hash = await hashPassword(password);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, id);
  }
  return NextResponse.json({ ok: true });
}

// DELETE — delete a user
export async function DELETE(request: NextRequest) {
  const admin = requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (id === admin.userId) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  const db = getDb();
  db.prepare(`DELETE FROM users WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
