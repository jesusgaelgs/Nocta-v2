import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { citaSolicitudes } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { ARTIST_EMAIL, ARTIST_NAME, MARCA } from "@/lib/panel/config";

export const runtime = "nodejs";

const MAX_SIM_CHARS = 1_800_000; // ~1.8 MB de data URL

/**
 * POST /api/agenda — guarda la solicitud (lead) del cliente.
 * Acepta opcionalmente la simulación (data URL JPEG) si el cliente
 * consintió incluirla. Si hay RESEND_API_KEY, avisa al artista por correo.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    nombre?: unknown;
    contacto?: unknown;
    zona?: unknown;
    concepto?: unknown;
    fechaPreferida?: unknown;
    simulacion?: unknown;
  };

  const nombre =
    typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const contacto =
    typeof body.contacto === "string" ? body.contacto.trim().slice(0, 200) : "";

  if (!nombre || !contacto) {
    return NextResponse.json(
      { ok: false, error: "Nombre y contacto son obligatorios." },
      { status: 400 }
    );
  }

  /* Simulación: solo si es un data URL de imagen razonable */
  const simulacion =
    typeof body.simulacion === "string" &&
    body.simulacion.startsWith("data:image/") &&
    body.simulacion.length < MAX_SIM_CHARS
      ? body.simulacion
      : null;

  await ensureSchema();

  try {
    const [row] = await db
      .insert(citaSolicitudes)
      .values({
        nombre,
        contacto,
        zona: typeof body.zona === "string" ? body.zona.slice(0, 120) : null,
        concepto:
          typeof body.concepto === "string"
            ? body.concepto.slice(0, 1000)
            : null,
        fechaPreferida:
          typeof body.fechaPreferida === "string"
            ? body.fechaPreferida.slice(0, 60)
            : null,
        simulacion,
      })
      .returning({ id: citaSolicitudes.id });

    /* Aviso por correo al artista (opcional, si Resend está configurado) */
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey && ARTIST_EMAIL) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${MARCA} <onboarding@resend.dev>`,
          to: ARTIST_EMAIL,
          subject: `Nueva solicitud — ${nombre}`,
          text: [
            `Nueva solicitud en ${MARCA}:`,
            `Nombre: ${nombre}`,
            `Contacto: ${contacto}`,
            `Zona: ${body.zona || "—"}`,
            `Idea: ${body.concepto || "—"}`,
            `Fecha preferida: ${body.fechaPreferida || "—"}`,
            simulacion ? "Incluye simulación ✓" : "Sin simulación",
            "",
            `Revisa y responde en tu panel: /panel`,
          ].join("\n"),
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[agenda] error al guardar solicitud:", err);
    return NextResponse.json(
      { ok: false, error: "No pudimos guardar tu solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
