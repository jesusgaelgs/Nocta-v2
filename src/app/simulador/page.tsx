import type { Metadata } from "next";
import { SimuladorExperience } from "@/components/simulador/SimuladorExperience";

export const metadata: Metadata = {
  title: "NOCTA — Simulador",
  description:
    "Tu idea en tu piel: sube una foto, describe tu concepto y proyéctalo sobre ti en segundos. Cero fricción, cero compromiso.",
};

export default function SimuladorPage() {
  return <SimuladorExperience />;
}
