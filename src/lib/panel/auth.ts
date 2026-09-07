import { createHash } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "nocta_panel";

export function panelHash(clave: string): string {
  return createHash("sha256").update(clave).digest("hex");
}

export function panelConfigured(): boolean {
  return Boolean(process.env.PANEL_KEY);
}

/** ¿La sesión del panel es válida? (cookie httpOnly) */
export async function isPanelAuthed(): Promise<boolean> {
  const key = process.env.PANEL_KEY;
  if (!key) return false;
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === panelHash(key);
}

export { COOKIE_NAME };
