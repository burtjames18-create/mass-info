import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get("session");
  if (cookie?.value) {
    deleteSession(cookie.value);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { path: "/", maxAge: 0 });
  return res;
}
