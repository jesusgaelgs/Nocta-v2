import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { citaSolicitudes } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { isPanelAuthed } from "@/lib/panel/auth";
import { composeMensaje, detectWhatsApp } from "@/lib/panel/config";

export const runtime = "nodejs";

/**
 * POST /api/panel/leads/:id
 * Marca una solicitud como aceptada o declinada y devuelve el mensaje
 * listo para el artista. (La creación de la cita en agenda la hace el
 * cliente en el selector de fecha, vía POST /api/panel/citas.)
 */
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
  const body = (await req.json().catch(() => ({}))) as { accion?: unknown };
  const accion = body.accion;
  if (accion !== "aceptar" && accion !== "declinar") {
    return NextResponse.json(
      { ok: false, error: "acción inválida" },
      { status: 400 }
    );
  }

  await ensureSchema();
  try {
    const [row] = await db
      .update(citaSolicitudes)
      .set({
        estado: accion === "aceptar" ? "aceptado" : "declinado",
        respondidoEn: new Date(),
      })
      .where(eq(citaSolicitudes.id, idNum))
      .returning({
        nombre: citaSolicitudes.nombre,
        contacto: citaSolicitudes.contacto,
        zona: citaSolicitudes.zona,
        concepto: citaSolicitudes.concepto,
        fechaPreferida: citaSolicitudes.fechaPreferida,
        estado: citaSolicitudes.estado,
      });

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "no existe esa solicitud" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      estado: row.estado,
      mensaje: composeMensaje(row),
      whatsapp: detectWhatsApp(row.contacto)
        ? `https://wa.me/${detectWhatsApp(row.contacto)}?text=${encodeURIComponent(composeMensaje(row))}`
        : null,
    });
  } catch (err) {
    console.error("[panel] error al actualizar lead:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos actualizar la solicitud." },
      { status: 500 }
    );
  }
}
