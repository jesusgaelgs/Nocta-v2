import { NextResponse, type NextRequest } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { citas } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  await ensureSchema();
  try {
    const rows = await db
      .select()
      .from(citas)
      .orderBy(asc(citas.fecha), asc(citas.id))
      .limit(200);
    return NextResponse.json({ ok: true, citas: rows });
  } catch (err) {
    console.error("[panel] error al leer citas:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos leer la agenda." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    fecha?: unknown;
    titulo?: unknown;
    detalle?: unknown;
  };
  const fecha = typeof body.fecha === "string" ? body.fecha.trim() : "";
  const titulo =
    typeof body.titulo === "string" ? body.titulo.trim().slice(0, 200) : "";
  if (!DATE_RE.test(fecha) || !titulo) {
    return NextResponse.json(
      { ok: false, error: "Fecha válida y título son obligatorios." },
      { status: 400 }
    );
  }
  await ensureSchema();
  try {
    const [row] = await db
      .insert(citas)
      .values({
        fecha,
        titulo,
        detalle:
          typeof body.detalle === "string"
            ? body.detalle.slice(0, 500)
            : null,
      })
      .returning({
        id: citas.id,
        fecha: citas.fecha,
        titulo: citas.titulo,
        detalle: citas.detalle,
        creadoEn: citas.creadoEn,
      });
    return NextResponse.json({ ok: true, cita: row });
  } catch (err) {
    console.error("[panel] error al crear cita:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar la cita." },
      { status: 500 }
    );
  }
}
