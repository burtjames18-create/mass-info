import { getDb } from "./db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest } from "next/server";
import type { SessionUser } from "@/types/auth";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`
  ).run(token, userId, expiresAt);

  // Lazy cleanup: remove expired sessions for this user
  db.prepare(
    `DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime('now')`
  ).run(userId);

  return token;
}

export function getSession(token: string): SessionUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.user_id, u.username FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(token) as { user_id: number; username: string } | undefined;

  if (!row) return null;
  return { userId: row.user_id, username: row.username };
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(token);
}

export function getUserFromRequest(request: NextRequest): SessionUser | null {
  const cookie = request.cookies.get("session");
  if (!cookie?.value) return null;
  return getSession(cookie.value);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};
