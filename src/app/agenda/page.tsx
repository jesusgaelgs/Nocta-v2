import type { Metadata } from "next";
import { AgendaForm } from "@/components/agenda/AgendaForm";

export const metadata: Metadata = {
  title: "NOCTA — Agenda",
  description:
    "Elige entre la disponibilidad real de Valentina Ríos, NOCTA Tattoo Studio.",
};

export default function AgendaPage() {
  return <AgendaForm />;
}
