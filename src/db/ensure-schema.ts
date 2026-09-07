import { pool } from "@/db";

/**
 * Auto-migración idempotente: garantiza las tablas del panel
 * (leads, citas, notas) sin correr `drizzle-kit push`.
 */
let done = false;

export async function ensureSchema(): Promise<void> {
  if (done || !pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cita_solicitudes (
        id serial PRIMARY KEY,
        nombre varchar(120) NOT NULL,
        contacto varchar(200) NOT NULL,
        zona varchar(120),
        concepto text,
        fecha_preferida varchar(60),
        creado_en timestamptz NOT NULL DEFAULT now(),
        estado varchar(20) NOT NULL DEFAULT 'nuevo',
        simulacion text,
        respondido_en timestamptz
      )
    `);
    await pool.query(
      `ALTER TABLE cita_solicitudes ADD COLUMN IF NOT EXISTS estado varchar(20) NOT NULL DEFAULT 'nuevo'`
    );
    await pool.query(
      `ALTER TABLE cita_solicitudes ADD COLUMN IF NOT EXISTS simulacion text`
    );
    await pool.query(
      `ALTER TABLE cita_solicitudes ADD COLUMN IF NOT EXISTS respondido_en timestamptz`
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id serial PRIMARY KEY,
        fecha varchar(10) NOT NULL,
        titulo varchar(200) NOT NULL,
        detalle text,
        creado_en timestamptz NOT NULL DEFAULT now()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notas (
        id serial PRIMARY KEY,
        texto text NOT NULL,
        hecho boolean NOT NULL DEFAULT false,
        creado_en timestamptz NOT NULL DEFAULT now()
      )
    `);

    done = true;
  } catch (e) {
    console.error("[ensure-schema] no se pudo asegurar el esquema:", e);
  }
}
