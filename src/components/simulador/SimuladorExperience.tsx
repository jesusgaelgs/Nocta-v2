"use client";

/**
 * NOCTA — SIMULADOR
 * Tu idea en tu piel: sube una foto, describe tu concepto y proyéctalo.
 * - Generación vía /api/simulador/generate (IA si hay claves, colección si no)
 * - Composición 100% local: tinta negra sobre piel con blend "multiply"
 * - Drag, pinch, escala, rotación, opacidad y descarga PNG
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import { DEMO_DESIGNS } from "@/lib/simulador/designs";

type BlendMode = "multiply" | "screen" | "normal";

interface DesignState {
  src: string;
  name: string;
  source: "ia" | "colección";
}

interface Transform {
  x: number;
  y: number;
  scale: number;
  rot: number;
}

const MAX_SIDE = 1600;

const COMPOSITE: Record<BlendMode, GlobalCompositeOperation> = {
  multiply: "multiply",
  normal: "source-over",
  screen: "screen",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

export function SimuladorExperience() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const designImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPhoto, setHasPhoto] = useState(false);
  const [uploadHint, setUploadHint] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [design, setDesign] = useState<DesignState | null>(null);
  const [error, setError] = useState("");
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
    rot: 0,
  });
  const [opacity, setOpacity] = useState(0.92);
  const [blend, setBlend] = useState<BlendMode>("multiply");
  const [drawVersion, setDrawVersion] = useState(0);

  /* ---------- Dibujo del lienzo ---------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    const designImg = designImgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    if (photo) {
      ctx.drawImage(photo, 0, 0, w, h);
    } else {
      ctx.fillStyle = "#f5f2ee";
      ctx.fillRect(0, 0, w, h);
    }

    if (designImg && designImg.complete && designImg.naturalWidth > 0) {
      const base = Math.min(w, h) * 0.42 * transform.scale;
      const ratio = designImg.naturalHeight / designImg.naturalWidth;
      const dw = base;
      const dh = base * ratio;
      ctx.save();
      ctx.translate(w / 2 + transform.x, h / 2 + transform.y);
      ctx.rotate((transform.rot * Math.PI) / 180);
      ctx.globalAlpha = opacity;
      ctx.globalCompositeOperation = COMPOSITE[blend];
      ctx.drawImage(designImg, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
  }, [blend, opacity, transform]);

  useEffect(() => {
    if (!design) return;
    let cancelled = false;
    loadImage(design.src)
      .then((img) => {
        if (cancelled) return;
        designImgRef.current = img;
        setDrawVersion((v) => v + 1);
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo cargar el diseño generado.");
      });
    return () => {
      cancelled = true;
    };
  }, [design]);

  useEffect(() => {
    draw();
  }, [draw, drawVersion]);

  /* ---------- Foto ---------- */
  const applyPhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadHint("Usa una imagen (JPG, PNG o WebP).");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setUploadHint("Máximo 12 MB. Comparte una foto más ligera.");
      return;
    }
    setUploadHint("");
    try {
      let source: CanvasImageSource;
      try {
        source = await createImageBitmap(file);
      } catch {
        source = await loadImage(
          await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("lectura fallida"));
            reader.readAsDataURL(file);
          })
        );
      }
      const iw =
        (source as HTMLImageElement).naturalWidth || (source as ImageBitmap).width;
      const ih =
        (source as HTMLImageElement).naturalHeight || (source as ImageBitmap).height;
      const scale = Math.min(1, MAX_SIDE / Math.max(iw, ih));
      const w = Math.max(1, Math.round(iw * scale));
      const h = Math.max(1, Math.round(ih * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("canvas no disponible");
      ctx.drawImage(source, 0, 0, w, h);
      photoRef.current = c;
      const cv = canvasRef.current;
      if (cv) {
        cv.width = w;
        cv.height = h;
      }
      setHasPhoto(true);
      setTransform({ x: 0, y: 0, scale: 1, rot: 0 });
      setDrawVersion((v) => v + 1);
    } catch {
      setUploadHint("No pudimos leer esa imagen. Prueba con otra.");
    }
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void applyPhoto(f);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void applyPhoto(f);
  };

  /* ---------- Generación ---------- */
  const generate = useCallback(
    async (text: string) => {
      setGenerating(true);
      setError("");
      try {
        const resp = await fetch("/api/simulador/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        if (!resp.ok) throw new Error("El generador respondió con error.");
        const data = (await resp.json()) as {
          design?: string;
          name?: string;
          source?: "ia" | "colección";
        };
        if (!data.design) throw new Error("Respuesta vacía del generador.");
        setDesign({
          src: data.design,
          name: data.name || "Tu idea",
          source: data.source === "ia" ? "ia" : "colección",
        });
        setTransform((t) => ({ ...t, x: 0, y: 0, scale: 1, rot: 0 }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Algo falló al generar el diseño."
        );
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  /* ---------- Interacción con el lienzo ---------- */
  const canvasScale = () => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    return canvas.getBoundingClientRect().width / canvas.width;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.size === 1) {
      dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    } else if (pinchRef.current.size === 2) {
      const [a, b] = [...pinchRef.current.values()];
      pinchStartRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: transform.scale,
      };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!pinchRef.current.has(e.pointerId)) return;
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const s = canvasScale();

    if (pinchRef.current.size === 1 && dragRef.current?.id === e.pointerId) {
      const dx = (e.clientX - dragRef.current.x) / s;
      const dy = (e.clientY - dragRef.current.y) / s;
      dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pinchRef.current.size === 2 && pinchStartRef.current) {
      const [a, b] = [...pinchRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const start = pinchStartRef.current;
      if (start && start.dist > 0) {
        const ratio = dist / start.dist;
        setTransform((t) => ({
          ...t,
          scale: Math.min(3.5, Math.max(0.15, start.scale * ratio)),
        }));
      }
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    pinchRef.current.delete(e.pointerId);
    if (pinchRef.current.size < 2) pinchStartRef.current = null;
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  /* ---------- Descarga ---------- */
  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "nocta-simulacion.png";
    a.click();
  };

  const clearPhoto = () => {
    photoRef.current = null;
    canvasRef.current && (canvasRef.current.width = 900);
    canvasRef.current && (canvasRef.current.height = 1200);
    setHasPhoto(false);
    setDrawVersion((v) => v + 1);
  };

  /* Guarda la simulación para la agenda (localStorage) y navega.
     La foto nunca sube a un servidor: solo viaja si el cliente
     consiente incluirla en su solicitud. */
  const guardarYAgendar = () => {
    const canvas = canvasRef.current;
    if (canvas && design) {
      try {
        const data = canvas.toDataURL("image/jpeg", 0.82);
        localStorage.setItem(
          "nocta-simulacion",
          JSON.stringify({ data, fecha: Date.now() })
        );
      } catch {
        /* cuota llena o lienzo enorme: seguimos sin adjuntar */
      }
    }
    window.location.href = "/agenda";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
        {/* Nav */}
        <nav className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            NOCTA<sup className="text-[0.45em] font-medium">®</sup>
          </span>
          <div className="flex items-center gap-6 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
            <Link href="/archivo" className="transition hover:text-white">
              ← Archivo
            </Link>
            <Link href="/agenda" className="transition hover:text-white">
              [ Agendar ]
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <header className="mt-16 text-center md:mt-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-neutral-500">
            Simulador de tatuaje
          </p>
          <h1 className="mt-4 text-5xl font-bold tracking-tighter md:text-7xl">
            TU IDEA EN TU PIEL
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-400">
            Sube una foto de la zona, describe tu concepto y proyéctalo sobre ti
            en segundos. Cero fricción, cero compromiso — solo eliges entre la
            disponibilidad real de la artista.
          </p>
        </header>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Columna izquierda: foto + idea */}
          <section className="space-y-8">
            {/* Paso 1: foto */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                01 · Tu piel
              </p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
                  hasPhoto
                    ? "border-emerald-400/60 bg-emerald-400/5"
                    : "border-neutral-700 bg-neutral-900/50 hover:border-neutral-500"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {hasPhoto ? (
                  <>
                    <span className="text-lg">✓</span>
                    <p className="mt-2 text-sm font-semibold text-emerald-300">
                      Foto lista — se proyectará sobre ella
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Arrastra el diseño sobre la piel en el lienzo
                    </p>
                    <button
                      type="button"
                      className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-400 underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPhoto();
                      }}
                    >
                      quitar foto
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">⤓</span>
                    <p className="mt-2 text-sm font-semibold">
                      Arrastra o haz clic para subir tu foto
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      JPG · PNG · WebP — máx. 12 MB. La foto nunca sale de tu
                      dispositivo.
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              {uploadHint && (
                <p className="mt-2 text-xs text-amber-300">{uploadHint}</p>
              )}
            </div>

            {/* Paso 2: idea */}
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                02 · Tu idea
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Ej: una rosa de trazo fino que envuelva el antebrazo, minimalista…"
                className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-900/50 p-4 text-sm leading-relaxed text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void generate(prompt)}
                  className="flex-1 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-neutral-200 disabled:opacity-40"
                >
                  {generating ? "Generando…" : "Generar diseño"}
                </button>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => void generate("")}
                  className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-semibold transition hover:border-white disabled:opacity-40"
                >
                  Sorpréndeme ✦
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

              <p className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                O elige de la colección
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_DESIGNS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      setDesign({ src: d.path, name: d.name, source: "colección" })
                    }
                    className="group overflow-hidden rounded-xl border border-neutral-800 bg-white p-1 transition hover:border-white"
                    title={d.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.path}
                      alt={d.name}
                      className="aspect-square w-full object-contain mix-blend-multiply"
                      loading="lazy"
                    />
                    <span className="block py-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 group-hover:text-white">
                      {d.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Columna derecha: lienzo */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
                03 · Proyección
              </p>
              {design && (
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                    design.source === "ia"
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {design.source === "ia" ? "✦ IA" : "colección"} · {design.name}
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
              <canvas
                ref={canvasRef}
                width={900}
                height={1200}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="w-full touch-none rounded-xl"
                style={{ aspectRatio: "3 / 4", background: "#f5f2ee" }}
              />
              <p className="mt-2 text-center text-[11px] text-neutral-600">
                {hasPhoto
                  ? "Arrastra para mover · pellizca para escalar"
                  : "Sin foto aún: el lienzo es un papel en blanco. Sube una foto para proyectar sobre piel."}
              </p>

              {design && (
                <div className="mt-4 grid gap-4 border-t border-neutral-800 pt-4 text-xs sm:grid-cols-3">
                  <label className="block">
                    <span className="text-neutral-500">Escala</span>
                    <input
                      type="range"
                      min={0.15}
                      max={3.5}
                      step={0.01}
                      value={transform.scale}
                      onChange={(e) =>
                        setTransform((t) => ({
                          ...t,
                          scale: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full accent-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-neutral-500">Rotación</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={transform.rot}
                      onChange={(e) =>
                        setTransform((t) => ({
                          ...t,
                          rot: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full accent-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-neutral-500">Opacidad</span>
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.01}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="mt-1 w-full accent-white"
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    ["multiply", "Tinta negra"],
                    ["normal", "Normal"],
                    ["screen", "Tinta blanca"],
                  ] as [BlendMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBlend(mode)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      blend === mode
                        ? "bg-white text-black"
                        : "border border-neutral-700 text-neutral-400 hover:border-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={download}
                    disabled={!design}
                    className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200 disabled:opacity-30"
                  >
                    ⤓ Descargar PNG
                  </button>
                  <button
                    type="button"
                    onClick={guardarYAgendar}
                    className="rounded-full border border-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest transition hover:bg-white hover:text-black"
                  >
                    Agendar
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-24 flex flex-col items-center justify-between gap-4 border-t border-neutral-900 pt-6 text-[11px] font-medium uppercase tracking-widest text-neutral-600 md:flex-row">
          <span>NOCTA ® 2026</span>
          <span className="max-w-sm text-center text-[10px] normal-case leading-relaxed tracking-normal">
            La foto se procesa en tu navegador y nunca se sube a un servidor.
            Los diseños generados son orientativos; Valentina ajusta el trazo
            final contigo.
          </span>
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
