"use client";

import { Component, type ReactNode } from "react";

/**
 * Red de seguridad: si el motor fallara por cualquier razón,
 * nunca dejamos una página en blanco.
 */
export class ArchivoBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[archivo] motor falló:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <main
          style={{
            minHeight: "100vh",
            background: "#000",
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontFamily: "Inter Tight, system-ui, sans-serif",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.3em", opacity: 0.6 }}>
              NOCTA® — COLECCIÓN ARCHIVO
            </p>
            <p style={{ fontSize: 15, marginTop: 12, opacity: 0.9 }}>
              La experiencia no pudo cargar.
            </p>
            <a
              href="/"
              style={{
                display: "inline-block",
                marginTop: 24,
                padding: "12px 28px",
                borderRadius: 999,
                background: "#fff",
                color: "#000",
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              ← Volver al inicio
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
