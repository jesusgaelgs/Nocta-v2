import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { citas } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";

export const runtime = "nodejs";

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
    await db.delete(citas).where(eq(citas.id, idNum));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[panel] error al borrar cita:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos borrar la cita." },
      { status: 500 }
    );
  }
}
