import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { citas, citaSolicitudes, generaciones, notas } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";

export const runtime = "nodejs";

/**
 * GET /api/panel/metrics
 * Métricas para el artista: generaciones de IA (mes/total), solicitudes,
 * citas e ideas — la evidencia de conversión del sistema.
 */
export async function GET() {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  await ensureSchema();
  try {
    const [genMes, genTotal, sol, cit, nota] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(generaciones)
        .where(sql`creado_en >= date_trunc('month', now())`),
      db.select({ n: sql<number>`count(*)::int` }).from(generaciones),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(citaSolicitudes),
      db.select({ n: sql<number>`count(*)::int` }).from(citas),
      db.select({ n: sql<number>`count(*)::int` }).from(notas),
    ]);

    return NextResponse.json({
      ok: true,
      generacionesMes: genMes[0]?.n ?? 0,
      generacionesTotal: genTotal[0]?.n ?? 0,
      solicitudes: sol[0]?.n ?? 0,
      citas: cit[0]?.n ?? 0,
      ideas: nota[0]?.n ?? 0,
      iaActiva: Boolean(
        process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN
      ),
      limiteMensual: Number(process.env.AI_MONTHLY_LIMIT ?? "100"),
    });
  } catch (err) {
    console.error("[panel] error al leer métricas:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos leer las métricas." },
      { status: 500 }
    );
  }
}
