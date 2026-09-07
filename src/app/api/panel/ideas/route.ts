import { NextResponse, type NextRequest } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { notas } from "@/db/schema";
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
      .select()
      .from(notas)
      .orderBy(desc(notas.creadoEn))
      .limit(100);
    return NextResponse.json({ ok: true, notas: rows });
  } catch (err) {
    console.error("[panel] error al leer ideas:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos leer las ideas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { texto?: unknown };
  const texto = typeof body.texto === "string" ? body.texto.trim().slice(0, 1000) : "";
  if (!texto) {
    return NextResponse.json({ ok: false, error: "La idea está vacía." }, { status: 400 });
  }
  await ensureSchema();
  try {
    const [row] = await db
      .insert(notas)
      .values({ texto })
      .returning({
        id: notas.id,
        texto: notas.texto,
        hecho: notas.hecho,
        creadoEn: notas.creadoEn,
      });
    return NextResponse.json({ ok: true, nota: row });
  } catch (err) {
    console.error("[panel] error al crear idea:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar la idea." },
      { status: 500 }
    );
  }
}
