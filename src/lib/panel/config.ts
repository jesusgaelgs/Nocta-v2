/**
 * Config del panel y utilidades de mensajería.
 * Se personaliza con variables de entorno (o valores por defecto).
 */

export const MARCA = process.env.MARCA || "NOCTA";
export const ARTIST_NAME = process.env.ARTIST_NAME || "Valentina Ríos";
export const ARTIST_EMAIL = process.env.ARTIST_EMAIL || "";

export interface LeadResumen {
  nombre: string;
  zona?: string | null;
  concepto?: string | null;
  fechaPreferida?: string | null;
  simulacion?: string | null;
  contacto?: string;
}

/** Detecta si el contacto es un número de teléfono (para WhatsApp). */
export function detectWhatsApp(contacto: string): string | null {
  const digits = (contacto || "").replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

/**
 * El mensaje que el artista "envía" con un clic al aceptar.
 * Cálido, humano, cero texto genérico de SaaS.
 */
export function composeMensaje(lead: LeadResumen): string {
  const partes: string[] = [
    `Hola ${lead.nombre}! Soy ${ARTIST_NAME} de ${MARCA}®.`,
    "Vi tu solicitud y me encanta tu idea.",
  ];
  if (lead.concepto?.trim()) {
    partes.push(`Sobre tu concepto: "${lead.concepto.trim()}".`);
  }
  if (lead.zona?.trim()) {
    partes.push(`Zona: ${lead.zona.trim()}.`);
  }
  if (lead.fechaPreferida?.trim()) {
    partes.push(`¿Te queda bien el ${lead.fechaPreferida.trim()}?`);
  }
  if (lead.simulacion) {
    partes.push("Tu simulación me ayudó a entenderlo perfecto.");
  }
  partes.push("¿Hablamos de detalles y presupuesto?");
  return partes.join(" ");
}
