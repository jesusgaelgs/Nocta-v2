import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOCTA — Tattoo Studio",
  description:
    "Plataforma de NOCTA Tattoo Studio: experiencia Archivo, simulador de tatuaje y agenda con Valentina Ríos.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
