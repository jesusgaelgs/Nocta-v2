import type { Metadata } from "next";
import { ArchivoBoundary } from "@/components/archivo/ArchivoBoundary";
import { ArchivoExperience } from "@/components/archivo/ArchivoExperience";

export const metadata: Metadata = {
  title: "NOCTA — Archivo",
  description:
    "Colección Archivo de Valentina Ríos. Experiencia scroll-driven: prueba el simulador y proyecta tu idea en tu piel.",
};

/**
 * Ruta aislada /archivo (Opción 2 — segura).
 * NO toca la portada actual. Reversa: borrar esta carpeta.
 */
export default function ArchivoPage() {
  return (
    <ArchivoBoundary>
      <ArchivoExperience />
    </ArchivoBoundary>
  );
}
