"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";

const ZONAS = [
  "Brazo / antebrazo",
  "Manos / dedos",
  "Pecho / clavícula",
  "Espalda / hombro",
  "Costillas / abdomen",
  "Pierna / tobillo",
  "Cuello / nuca",
  "Otra zona",
];

const HORARIOS = [
  "Mar · Jue · Sáb",
  "12:00 — 20:00",
];

export function AgendaForm() {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [zona, setZona] = useState(ZONAS[0]);
  const [concepto, setConcepto] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">(
    "idle"
  );
  const [mensaje, setMensaje] = useState("");
  const [sim, setSim] = useState<string | null>(null);
  const [incluirSim, setIncluirSim] = useState(true);

  /* Recupera la simulación que el cliente guardó desde /simulador */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nocta-simulacion");
      if (raw) {
        const parsed = JSON.parse(raw) as { data?: unknown; fecha?: unknown };
        if (
          typeof parsed.data === "string" &&
          parsed.data.startsWith("data:image/")
        ) {
          setSim(parsed.data);
        }
      }
    } catch {
      /* sin simulación */
    }
  }, []);

  const quitarSim = () => {
    setSim(null);
    try {
      localStorage.removeItem("nocta-simulacion");
    } catch {
      /* noop */
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEstado("enviando");
    try {
      const resp = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          contacto,
          zona,
          concepto,
          fechaPreferida: fecha,
          simulacion: sim && incluirSim ? sim : undefined,
        }),
      });
      const data = (await resp.json()) as { ok?: boolean; error?: string };
      if (resp.ok && data.ok) {
        setEstado("ok");
        setMensaje(
          "Solicitud recibida. Valentina te responderá por tu medio de contacto para confirmar fecha y presupuesto."
        );
      } else {
        setEstado("error");
        setMensaje(data.error || "Algo falló. Intenta de nuevo.");
      }
    } catch {
      setEstado("error");
      setMensaje("No pudimos conectar. Intenta de nuevo.");
    }
  };

  const inputCls =
    "w-full rounded-2xl border border-neutral-700 bg-neutral-900/50 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white focus:outline-none";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-6 md:px-8">
        <nav className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            NOCTA<sup className="text-[0.45em] font-medium">®</sup>
          </span>
          <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            <Link href="/archivo" className="transition hover:text-white">
              ← Archivo
            </Link>
            <Link href="/simulador" className="transition hover:text-white">
              Simulador
            </Link>
          </div>
        </nav>

        <header className="mt-16 text-center md:mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
            Agenda · Valentina Ríos
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tighter md:text-6xl">
            TU PIEL, SU TRAZO
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
            Cero fricción, cero compromiso: cuéntanos tu idea y elige entre la
            disponibilidad real de la artista. Si vienes del simulador, pega tu
            concepto tal cual.
          </p>
        </header>

        {estado === "ok" ? (
          <section className="mx-auto mt-14 max-w-md rounded-3xl border border-emerald-400/40 bg-emerald-400/5 p-8 text-center">
            <p className="text-3xl">✓</p>
            <h2 className="mt-3 text-xl font-bold">Solicitud recibida</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              {mensaje}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/simulador"
                className="rounded-full border border-neutral-600 px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition hover:border-white"
              >
                Seguir simulando
              </Link>
              <Link
                href="/archivo"
                className="rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-black transition hover:bg-neutral-200"
              >
                Volver al archivo
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mx-auto mt-12 max-w-md space-y-5 rounded-3xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8"
          >
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                Nombre
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="¿Cómo te llamas?"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                Contacto (IG, WhatsApp o correo)
              </label>
              <input
                required
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="@tuig o +52 …"
                className={inputCls}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                  Zona
                </label>
                <select
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  {ZONAS.map((z) => (
                    <option key={z} value={z} className="bg-neutral-900">
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                  Fecha preferida (opcional)
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={`${inputCls} [color-scheme:dark]`}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
                Tu idea
              </label>
              <textarea
                rows={4}
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Describe tu concepto, tamaño aproximado, estilo…"
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </div>

            {sim && (
              <div className="flex items-center gap-4 rounded-2xl border border-neutral-800 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sim}
                  alt="Tu simulación"
                  className="h-24 w-18 shrink-0 rounded-lg border border-neutral-800 object-cover"
                  style={{ width: 72 }}
                />
                <div className="min-w-0 flex-1">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={incluirSim}
                      onChange={(e) => setIncluirSim(e.target.checked)}
                      className="h-4 w-4 accent-white"
                    />
                    Incluir mi simulación
                  </label>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                    Así la artista ve exactamente lo que imaginaste. Sin
                    marcarla, no se adjunta nada.
                  </p>
                  <button
                    type="button"
                    onClick={quitarSim}
                    className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-600 underline-offset-4 hover:text-white hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-neutral-800 p-4 text-[11px] uppercase tracking-widest text-neutral-500">
              {HORARIOS.map((h) => (
                <p key={h} className="leading-relaxed">
                  {h}
                </p>
              ))}
              <p className="mt-1 normal-case tracking-normal text-neutral-600">
                Estudio en CDMX · consulta por piezas grandes o viaje
              </p>
            </div>

            {estado === "error" && (
              <p className="text-xs text-red-400">{mensaje}</p>
            )}

            <button
              type="submit"
              disabled={estado === "enviando"}
              className="w-full rounded-full bg-white py-3.5 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-40"
            >
              {estado === "enviando" ? "Enviando…" : "Enviar solicitud"}
            </button>
          </form>
        )}

        <footer className="mt-24 flex flex-col items-center justify-between gap-4 border-t border-neutral-900 pt-6 text-[11px] font-medium uppercase tracking-widest text-neutral-600 md:flex-row">
          <span>NOCTA ® 2026</span>
          <Link
            href="/panel"
            className="transition hover:text-neutral-300"
          >
            Panel del estudio
          </Link>
          <span>AVISO DE PRIVACIDAD</span>
        </footer>
      </div>
    </main>
  );
}
