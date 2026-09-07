import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { citaSolicitudes } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  await ensureSchema();
  try {
    const rows = await db
      .select({
        id: citaSolicitudes.id,
        nombre: citaSolicitudes.nombre,
        contacto: citaSolicitudes.contacto,
        zona: citaSolicitudes.zona,
        concepto: citaSolicitudes.concepto,
        fechaPreferida: citaSolicitudes.fechaPreferida,
        estado: citaSolicitudes.estado,
        simulacion: citaSolicitudes.simulacion,
        creadoEn: citaSolicitudes.creadoEn,
        respondidoEn: citaSolicitudes.respondidoEn,
      })
      .from(citaSolicitudes)
      .orderBy(desc(citaSolicitudes.id))
      .limit(40);
    return NextResponse.json({ ok: true, leads: rows });
  } catch (err) {
    console.error("[panel] error al leer leads:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos leer las solicitudes." },
      { status: 500 }
    );
  }
}
