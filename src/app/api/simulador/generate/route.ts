import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { generaciones } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";
import { matchDesign } from "@/lib/simulador/designs";

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
): Promise<string[]> {
  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: promptEnriquecido,
      n: 3,
      size: "1024x1024",
      quality: "low",
      output_format: "b64_json",
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!resp.ok) {
    /* Si n=3 falla, intentar con n=1 */
    const single = await fetch("https://api.openai.com/v1/images/generations", {
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
        output_format: "b64_json",
      }),
      signal: AbortSignal.timeout(55000),
    });
    if (!single.ok) return [];
    const j = await single.json();
    const b64 = j?.data?.[0]?.b64_json;
    return typeof b64 === "string" ? [`data:image/png;base64,${b64}`] : [];
  }
  const json = await resp.json();
  const imgs: string[] = [];
  for (const item of (json?.data ?? []) as { b64_json?: string }[]) {
    if (typeof item.b64_json === "string") {
      imgs.push(`data:image/png;base64,${item.b64_json}`);
    }
  }
  return imgs;
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

/* ---------- Cuota mensual ---------- */
async function bajoCuota(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY && !process.env.REPLICATE_API_TOKEN) return false;
  const limite = Number(process.env.AI_MONTHLY_LIMIT ?? "100");
  if (!Number.isFinite(limite) || limite <= 0) return true;
  try {
    await ensureSchema();
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(generaciones)
      .where(
        sql`creado_en >= date_trunc('month', now())`
      );
    return (row?.n ?? 0) < limite;
  } catch {
    return true; // ante fallo de BD, no bloquear la experiencia
  }
}

async function registrar(prompt: string, variantes: number) {
  try {
    await ensureSchema();
    await db.insert(generaciones).values({ prompt, variantes });
  } catch (e) {
    console.error("[simulador] no se pudo registrar la generación:", e);
  }
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

  if (await bajoCuota()) {
    /* 1) OpenAI (decisión del usuario) */
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        variantes = await generateWithOpenAI(openaiKey, enriquecido);
      } catch {
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
  }

  /* 3) Colección local */
  let name = prompt || "Tu idea";
  if (!variantes.length) {
    const matched = matchDesign(prompt);
    variantes = [await fileToDataUrl(matched.path)];
    name = matched.name;
    source = "colección";
  } else {
    await registrar(prompt || "(idea libre)", variantes.length);
  }

  return NextResponse.json({
    designs: variantes.map((data, i) => ({
      data,
      name: variantes.length > 1 ? `${name} — variante ${i + 1}` : name,
    })),
    source,
    variantes: variantes.length,
  });
}
