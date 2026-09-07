import type { Metadata } from "next";
import { ArchivoBoundary } from "@/components/archivo/ArchivoBoundary";
import { ArchivoExperience } from "@/components/archivo/ArchivoExperience";

export const metadata: Metadata = {
  title: "NOCTA — Tattoo Studio",
  description:
    "Colección Archivo de Valentina Ríos. Experiencia scroll-driven con simulador de tatuaje: tu idea en tu piel.",
};

/**
 * Portada: renderiza la experiencia directamente (URL limpia, sin /archivo).
 * /archivo sigue disponible como ruta alternativa con la misma experiencia.
 *
 * REVERSA: restaurar el starter original descrito en el historial de commits.
 */
export default function HomePage() {
  return (
    <ArchivoBoundary>
      <ArchivoExperience />
    </ArchivoBoundary>
  );
}
