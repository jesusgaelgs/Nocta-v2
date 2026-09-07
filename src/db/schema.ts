import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Solicitudes de cita desde /agenda (leads para el artista).
 */
export const citaSolicitudes = pgTable("cita_solicitudes", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 120 }).notNull(),
  contacto: varchar("contacto", { length: 200 }).notNull(),
  zona: varchar("zona", { length: 120 }),
  concepto: text("concepto"),
  fechaPreferida: varchar("fecha_preferida", { length: 60 }),
  estado: varchar("estado", { length: 20 }).notNull().default("nuevo"),
  simulacion: text("simulacion"),
  respondidoEn: timestamp("respondido_en", { withTimezone: true }),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Citas del estudio (agenda). Se crean automáticamente al aceptar
 * una solicitud con fecha preferida, o manualmente por el artista.
 */
export const citas = pgTable("citas", {
  id: serial("id").primaryKey(),
  fecha: varchar("fecha", { length: 10 }).notNull(), // YYYY-MM-DD
  titulo: varchar("titulo", { length: 200 }).notNull(),
  detalle: text("detalle"),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Ideas / pendientes del artista. Notas simples con estado "hecho".
 */
export const notas = pgTable("notas", {
  id: serial("id").primaryKey(),
  texto: text("texto").notNull(),
  hecho: boolean("hecho").notNull().default(false),
  creadoEn: timestamp("creado_en", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
