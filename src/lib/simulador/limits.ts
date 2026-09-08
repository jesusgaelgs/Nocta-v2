import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { generaciones } from "@/db/schema";
import { ensureSchema } from "@/db/ensure-schema";

/**
 * Límite por usuario del simulador de IA.
 *
 * Identidad sin fricción (no pedimos login, alineado con la filosofía):
 *  1. Cookie anónima `nocta_uid` (principal, persiste ~30 días).
 *  2. Hash de la IP (x-forwarded-for) como respaldo si se borra la cookie.
 *
 * No es un sistema anti-fraude (eso exigiría login), pero detiene el abuso
 * casual que dispara el costo. El cliente nunca ve "créditos": al agotar sus
 * 3 ideas, se le invita a agendar (el límite es el empujón del embudo).
 */

export const LIMITE_POR_USUARIO = Number(process.env.AI_USER_DAILY_LIMIT ?? "3");
export const UID_COOKIE = "nocta_uid";

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const limpia = ip.split(",")[0].trim();
  if (!limpia || limpia === "unknown") return null;
  return `ip:${createHash("sha256").update(limpia).digest("hex").slice(0, 20)}`;
}

export function generarUid(): string {
  return `u:${randomUUID()}`;
}

/** Cuenta generaciones IA del usuario en las últimas 24 h (rodantes). */
export async function usadasUltimas24h(uid: string): Promise<number> {
  try {
    await ensureSchema();
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(generaciones)
      .where(
        sql`uid = ${uid} AND creado_en >= now() - interval '24 hours'`
      );
    return row?.n ?? 0;
  } catch {
    return 0; // ante fallo, no bloquear la experiencia
  }
}

export async function registrarGeneracion(
  prompt: string,
  variantes: number,
  uid: string | null
): Promise<void> {
  try {
    await ensureSchema();
    await db.insert(generaciones).values({ prompt, variantes, uid });
  } catch (e) {
    console.error("[simulador] no se pudo registrar la generación:", e);
  }
}
