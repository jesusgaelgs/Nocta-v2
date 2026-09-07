import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, panelConfigured, panelHash } from "@/lib/panel/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const key = process.env.PANEL_KEY;
  if (!panelConfigured()) {
    return NextResponse.json(
      { ok: false, error: "El panel no está configurado (falta PANEL_KEY)." },
      { status: 403 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as { clave?: unknown };
  const clave = typeof body.clave === "string" ? body.clave : "";
  if (clave !== key) {
    return NextResponse.json(
      { ok: false, error: "Clave incorrecta." },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, panelHash(key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
