import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { generaciones } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { matchDesign } from "@/lib/simulador/designs";
import {
  LIMITE_POR_USUARIO,
  UID_COOKIE,
  generarUid,
  hashIp,
  registrarGeneracion,
  usadasUltimas24h,
} from "@/lib/simulador/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/simulador/generate
 * Body: { prompt?: string, estilo?: string }
 * Respuesta: { designs: [{ data, name }], source: "ia" | "colección", variantes }
 *
 * Motor (prioridad):
 *  1. OpenAI gpt-image-1 (OPENAI_API_KEY) → 3 variaciones por prompt.
 *  2. Replicate flux-schnell (REPLICATE_API_TOKEN) → 3 variaciones.
 *  3. Colección local (matcher) — gratis, sin claves.
 *
 * Cuota de seguridad: AI_MONTHLY_LIMIT (default 100) generaciones IA al mes.
 * Al superarse, cae al modo colección silenciosamente (el cliente nunca ve
 * contadores ni créditos; es una protección de costo del artista).
 */

const ESTILOS: Record<string, string> = {
  "fine-line": "fine-line style, extremely thin elegant lines",
  blackwork: "blackwork style, bold solid black shapes with minimal negative space",
  ornamental: "ornamental style, decorative filigree and lacework patterns",
  "old-school": "traditional old school style, bold lines and classic shading",
  minimal: "minimalist style, ultra simple geometric composition",
  japonesa: "japanese irezumi inspired style, flowing traditional motifs",
};

function enriquecerPrompt(userPrompt: string, estilo?: string): string {
  const base = userPrompt.trim() || "an elegant custom design";
  const style = estilo && ESTILOS[estilo] ? ESTILOS[estilo] : ESTILOS["fine-line"];
  return (
    `Black ink tattoo design: ${base}. ${style}. Pure black linework on a pure ` +
    `white background, high contrast, clean composition, centered, no shading, ` +
    `no gradients, no text, no watermark, tattoo flash sheet aesthetic.`
  );
}

async function fileToDataUrl(publicPath: string): Promise<string> {
  const buf = await readFile(path.join(process.cwd(), "public", publicPath));
  const ext = publicPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/* ---------- OpenAI: 3 variaciones en una llamada ---------- */
async function generateWithOpenAI(
  key: string,
  promptEnriquecido: string
): Promise<{ imgs: string[]; error: string }> {
  let error = "";

  /* gpt-image-1 devuelve URLs temporales (output_format png/jpeg/webp).
     Las descargamos y convertimos a data URL para que todo siga local. */
  const descargar = async (url: string): Promise<string | null> => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(40000) });
      if (!r.ok) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  };

  /* 3 llamadas en paralelo de n=1 (garantiza las 3 variantes; gpt-image-1
     puede rechazar n>1 según quality) */
  const llamarUno = async (): Promise<{ url?: string; b64?: string }> => {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: promptEnriquecido,
        n: 1,
        size: "1024x1024",
        quality: "low",
        output_format: "png",
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      const texto = await r.text().catch(() => "");
      error = `HTTP ${r.status}: ${texto.slice(0, 300)}`;
      console.error(`[simulador/openai] falló: ${error}`);
      return {};
    }
    const j = (await r.json()) as { data?: { url?: string; b64_json?: string }[] };
    const item = j.data?.[0];
    return { url: item?.url, b64: item?.b64_json };
  };

  const resultados = await Promise.all([llamarUno(), llamarUno(), llamarUno()]);
  const imgs: string[] = [];
  for (const r of resultados) {
    if (typeof r.b64 === "string") {
      imgs.push(`data:image/png;base64,${r.b64}`);
    } else if (typeof r.url === "string") {
      const d = await descargar(r.url);
      if (d) imgs.push(d);
    }
  }
  return { imgs, error };
}

/* ---------- Replicate: 3 variaciones en paralelo ---------- */
async function generateOneReplicate(
  token: string,
  promptEnriquecido: string
): Promise<string | null> {
  try {
    const resp = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=40",
        },
        body: JSON.stringify({
          input: { prompt: promptEnriquecido, aspect_ratio: "1:1", output_format: "png" },
        }),
        signal: AbortSignal.timeout(55000),
      }
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    const outputUrl = Array.isArray(json?.output) ? json.output[0] : json?.output;
    if (typeof outputUrl !== "string") return null;
    const img = await fetch(outputUrl, { signal: AbortSignal.timeout(30000) });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function generateWithReplicate(
  token: string,
  promptEnriquecido: string
): Promise<string[]> {
  const res = await Promise.all([
    generateOneReplicate(token, promptEnriquecido),
    generateOneReplicate(token, promptEnriquecido),
    generateOneReplicate(token, promptEnriquecido),
  ]);
  return res.filter((r): r is string => r !== null);
}

/* ---------- Presupuesto global (protección de gasto) ----------
   Costo estimado conservador por generación IA (3 imágenes, gpt-image-1
   low). El presupuesto mensual real lo impone OpenAI (hard limit); este
   contador es la segunda barrera en código antes de llegar a él. */
const COSTO_ESTIMADO_POR_GENERACION = 0.09; // USD, conservador
const PRESUPUESTO_MENSUAL_USD = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "7");
const AI_MONTHLY_LIMIT = Number(process.env.AI_MONTHLY_LIMIT ?? "100");

async function presupuestoDisponible(): Promise<{ ok: boolean; razon: string }> {
  if (!process.env.OPENAI_API_KEY && !process.env.REPLICATE_API_TOKEN) {
    return { ok: false, razon: "sin motor" };
  }
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(generaciones)
      .where(sql`creado_en >= date_trunc('month', now())`);
    const usadas = row?.n ?? 0;
    const gastoEstimado = usadas * COSTO_ESTIMADO_POR_GENERACION;
    if (gastoEstimado >= PRESUPUESTO_MENSUAL_USD) {
      return {
        ok: false,
        razon: `presupuesto mensual alcanzado (~$${gastoEstimado.toFixed(2)} de $${PRESUPUESTO_MENSUAL_USD})`,
      };
    }
    if (usadas >= AI_MONTHLY_LIMIT) {
      return { ok: false, razon: `tope de ${AI_MONTHLY_LIMIT} generaciones del mes alcanzado` };
    }
    return { ok: true, razon: "" };
  } catch {
    return { ok: true, razon: "" }; // ante fallo de BD, no bloquear
  }
}

/* ---------- Identidad del usuario (cookie anónima + hash de IP) ---------- */
function identidadUsuario(req: NextRequest): {
  uid: string;
  nuevaCookie: string | null;
} {
  const cookie = req.cookies.get(UID_COOKIE)?.value ?? "";
  if (cookie && cookie.startsWith("u:")) {
    return { uid: cookie, nuevaCookie: null };
  }
  /* Sin cookie: usamos hash de IP como identidad y emitimos cookie nueva */
  const ip = req.headers.get("x-forwarded-for") ?? null;
  const porIp = hashIp(ip);
  const nuevo = generarUid();
  return { uid: porIp ?? nuevo, nuevaCookie: nuevo };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: unknown;
    estilo?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 500).trim() : "";
  const estilo = typeof body.estilo === "string" ? body.estilo : undefined;

  const enriquecido = enriquecerPrompt(prompt, estilo);
  let variantes: string[] = [];
  let source: "ia" | "colección" = "colección";
  let iaError = "";
  let limiteAlcanzado = false;

  const { uid, nuevaCookie } = identidadUsuario(req);
  const usadas = await usadasUltimas24h(uid);

  /* ¿Hay motor de IA disponible y el usuario tiene ideas disponibles?
     Tres candados: límite por usuario (3/día), tope de generaciones del
     mes y presupuesto global en USD (default $7). */
  const hayMotor = Boolean(
    process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN
  );
  const puedeGenerarIA = usadas < LIMITE_POR_USUARIO;
  const presupuesto = await presupuestoDisponible();

  if (hayMotor && puedeGenerarIA && presupuesto.ok) {
    /* 1) OpenAI (decisión del usuario) */
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const resultado = await generateWithOpenAI(openaiKey, enriquecido);
        variantes = resultado.imgs;
        if (!resultado.imgs.length) {
          iaError = resultado.error || "OpenAI no devolvió imágenes";
        }
      } catch (e) {
        iaError = e instanceof Error ? e.message : "error desconocido OpenAI";
        console.error("[simulador] OpenAI excepción:", e);
        variantes = [];
      }
      if (variantes.length) source = "ia";
    }
    /* 2) Replicate como respaldo */
    if (!variantes.length && process.env.REPLICATE_API_TOKEN) {
      try {
        variantes = await generateWithReplicate(
          process.env.REPLICATE_API_TOKEN,
          enriquecido
        );
      } catch {
        variantes = [];
      }
      if (variantes.length) source = "ia";
    }
  } else if (hayMotor) {
    limiteAlcanzado = true;
    iaError = presupuesto.ok
      ? "límite diario por usuario alcanzado (protección de costo)"
      : `protección de gasto activa: ${presupuesto.razon}`;
    console.warn(`[simulador] IA bloqueada: ${iaError}`);
  }

  /* 3) Colección local (siempre disponible, gratis — la magia no se rompe) */
  let name = prompt || "Tu idea";
  if (!variantes.length) {
    const matched = matchDesign(prompt);
    variantes = [await fileToDataUrl(matched.path)];
    name = matched.name;
    source = "colección";
  } else {
    await registrarGeneracion(prompt || "(idea libre)", variantes.length, uid);
  }

  const restante = Math.max(0, LIMITE_POR_USUARIO - (source === "ia" ? usadas + 1 : usadas));

  const res = NextResponse.json({
    designs: variantes.map((data, i) => ({
      data,
      name: variantes.length > 1 ? `${name} — variante ${i + 1}` : name,
    })),
    source,
    variantes: variantes.length,
    restante,
    limiteAlcanzado,
    /* Solo para diagnóstico interno (no se muestra al cliente) */
    ...(source === "colección" && hayMotor ? { iaError } : {}),
  });

  /* Cookie anónima de identidad (30 días) */
  if (nuevaCookie) {
    res.cookies.set(UID_COOKIE, nuevaCookie, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
