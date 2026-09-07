import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notas } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { hecho?: unknown };
  await ensureSchema();
  try {
    const [row] = await db
      .update(notas)
      .set({ hecho: body.hecho === true })
      .where(eq(notas.id, idNum))
      .returning({ id: notas.id, hecho: notas.hecho });
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "no existe esa idea" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, hecho: row.hecho });
  } catch (err) {
    console.error("[panel] error al actualizar idea:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos actualizar la idea." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await isPanelAuthed())) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const idNum = Number(id);
  if (!Number.isInteger(idNum)) {
    return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
  }
  await ensureSchema();
  try {
    await db.delete(notas).where(eq(notas.id, idNum));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[panel] error al borrar idea:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos borrar la idea." },
      { status: 500 }
    );
  }
}
