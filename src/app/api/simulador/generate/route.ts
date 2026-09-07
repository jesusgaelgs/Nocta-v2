import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { matchDesign } from "@/lib/simulador/designs";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/simulador/generate
 * Body: { prompt: string }
 * Respuesta: { design: dataUrl, name: string, source: "ia" | "colección" }
 *
 * Prioridad de generación:
 *  1. Replicate (REPLICATE_API_TOKEN) → flux-schnell
 *  2. OpenAI (OPENAI_API_KEY) → gpt-image-1
 *  3. Colección local (matcher por palabras clave) — funciona sin claves.
 */

const INK_PROMPT = (userPrompt: string) =>
  `Black ink tattoo design: ${userPrompt}. Pure black linework on a pure white background, ` +
  `fine-line style, high contrast, clean minimal composition, centered, no shading, ` +
  `no gradients, no text, tattoo flash sheet aesthetic.`;

async function fileToDataUrl(publicPath: string): Promise<string> {
  const buf = await readFile(path.join(process.cwd(), "public", publicPath));
  const ext = publicPath.split(".").pop()?.toLowerCase() ?? "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

async function generateWithReplicate(
  token: string,
  prompt: string
): Promise<string | null> {
  try {
    const resp = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=30",
        },
        body: JSON.stringify({
          input: {
            prompt: INK_PROMPT(prompt),
            aspect_ratio: "1:1",
            output_format: "png",
          },
        }),
        signal: AbortSignal.timeout(45000),
      }
    );
    if (!resp.ok) return null;
    const json = await resp.json();
    const outputUrl = Array.isArray(json?.output)
      ? json.output[0]
      : json?.output;
    if (typeof outputUrl !== "string") return null;
    const img = await fetch(outputUrl, { signal: AbortSignal.timeout(30000) });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

async function generateWithOpenAI(
  key: string,
  prompt: string
): Promise<string | null> {
  try {
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: INK_PROMPT(prompt),
        size: "1024x1024",
        output_format: "b64_json",
        quality: "medium",
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (typeof b64 !== "string") return null;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { prompt?: unknown };
  const prompt =
    typeof body.prompt === "string" ? body.prompt.slice(0, 500).trim() : "";

  // 1) Replicate
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (replicateToken) {
    const design = await generateWithReplicate(replicateToken, prompt);
    if (design) {
      return NextResponse.json({ design, name: prompt || "Tu idea", source: "ia" });
    }
  }

  // 2) OpenAI
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const design = await generateWithOpenAI(openaiKey, prompt);
    if (design) {
      return NextResponse.json({ design, name: prompt || "Tu idea", source: "ia" });
    }
  }

  // 3) Colección local (modo sin claves)
  const matched = matchDesign(prompt);
  const design = await fileToDataUrl(matched.path);
  return NextResponse.json({
    design,
    name: matched.name,
    source: "colección",
  });
}
