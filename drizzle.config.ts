import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Lee DATABASE_URL desde el .env — funciona tanto en el sandbox
 * como en producción (Supabase, Docker local, etc.).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
