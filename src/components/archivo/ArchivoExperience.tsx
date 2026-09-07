"use client";

/**
 * NOCTA — ARCHIVO
 * Motor de animación portado de prmpt. Portado fielmente:
 *  - scrub de video por cursor X con dead zone (RAF)
 *  - panel negro que sube con el primer 100vh de scroll
 *  - cards que escalan según posición en viewport (transform-origin por mitad de grid)
 *  - cursor custom con mix-blend-mode: exclusion
 *  - scroll 100% RAF-driven (cero eventos de scroll)
 *  - entradas escalonadas (logo 0s · nav 0.15s · caption 0.3s · info 0.45s)
 *  - outro con overlay blanco + botón "simular" + footer
 *
 * Assets: footage de tatuaje (Pexels) como primarios para que la experiencia
 * se vea viva; los placeholders originales de prmpt quedan como fallback
 * (onError) y se sustituirán por los assets finales de NOCTA.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";
import "./archivo.css";

/* ---- Videos hero: locales (incluidos en el zip) + CDN + prmpt (fallbacks) ---- */
const VIDEO_LEFT = "/videos/hero-left.mp4";
const VIDEO_RIGHT = "/videos/hero-right.mp4";
const VIDEO_LEFT_PEXELS =
  "https://videos.pexels.com/video-files/9738022/9738022-hd_1920_1080_24fps.mp4";
const VIDEO_RIGHT_PEXELS =
  "https://videos.pexels.com/video-files/5095610/5095610-hd_1920_1080_25fps.mp4";
const VIDEO_LEFT_PRMTP_FALLBACK =
  "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154433_532a85d3-dabf-4265-b8bd-19ac6af31842.mp4";
const VIDEO_RIGHT_PRMTP_FALLBACK =
  "https://d8j0ntlcm91z4.cloudfront.net/user_39ca84eAE1ODL9hbR5VhoEj8tBf/hf_20260625_154401_a664f076-b971-4557-8728-40ef9ea4c49b.mp4";

/* ---- Galería: local (incluida en el zip) + CDN + prmpt (fallbacks) ---- */
const GALLERY: string[] = [
  "/images/gallery/g1.jpg",
  "/images/gallery/g2.jpg",
  "/images/gallery/g3.jpg",
  "/images/gallery/g4.jpg",
  "/images/gallery/g5.jpg",
  "/images/gallery/g6.jpg",
  "/images/gallery/g7.jpg",
  "/images/gallery/g8.jpg",
  "/images/gallery/g9.jpg",
  "/images/gallery/g10.jpg",
];

const GALLERY_PEXELS: string[] = [
  "https://images.pexels.com/photos/9356536/pexels-photo-9356536.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/7147781/pexels-photo-7147781.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/7147786/pexels-photo-7147786.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/20531514/pexels-photo-20531514.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/7005787/pexels-photo-7005787.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/18875530/pexels-photo-18875530.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/12509430/pexels-photo-12509430.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/11364054/pexels-photo-11364054.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/5025087/pexels-photo-5025087.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  "https://images.pexels.com/photos/29212050/pexels-photo-29212050.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
];

const GALLERY_PRMTP_FALLBACK: string[] = [
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_104530_521b2f85-c0f3-4d0e-9704-b578315b4cb9.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103711_76ccdb8b-5043-4f47-9c54-4379713393ea.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103728_394f6a1b-85e2-4386-a4f6-408472a0a5b7.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103739_86743e0e-16a7-4bee-bf38-dd67985344dc.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103748_b2215dc8-a3a7-470d-b19a-5b87fa7d0c37.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103758_e919ce72-5c9d-4b87-9be6-d7647b34825c.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103808_013583d0-3386-4547-9832-37c7d8edb3ac.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103937_a0c49d0a-33eb-4ead-aea6-c1baf241acbc.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_103956_d18ed8fd-7b6f-4b86-91f9-20010fe38670.png&w=1920&q=85",
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260629_104034_ba5a9963-87ff-4008-a545-6bd686c088b5.png&w=1920&q=85",
];

const SYMBOLS = ["8", "$", "^^", "%", "/"];

const CAPTION_TEXT =
  "Tu idea en tu piel. Antes de agendar, prueba el simulador: sube una foto real de tu piel, describe tu concepto y proyéctalo sobre ti en segundos. Cero fricción, cero compromiso — solo eliges entre la disponibilidad real de la artista.";

/* ---- 4.11 buildLayout(count, cols): dispersión por filas ---- */
function buildLayout(count: number, cols: number): number[][] {
  const rows: number[][] = [];
  let idx = 0;
  let r = 0;
  while (idx < count) {
    const row: number[] = new Array<number>(cols).fill(-1);
    const a = (r * 2 + (r % 2)) % cols;
    row[a] = idx++;
    if (r % 3 === 0 && idx < count) {
      let b = (a + 2) % cols;
      if (b === a) b = (a + 1) % cols;
      row[b] = idx++;
    }
    rows.push(row);
    r++;
  }
  return rows;
}

interface LenisLike {
  stop?: () => void;
  start?: () => void;
}

export function ArchivoExperience() {
  const [cols, setCols] = useState<number>(4);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const videoLeftRef = useRef<HTMLVideoElement | null>(null);
  const videoRightRef = useRef<HTMLVideoElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const symbolRef = useRef<HTMLSpanElement | null>(null);
  const buyRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const cellsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const cardsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const swappedRef = useRef<Map<number, number>>(new Map());

  const layout = useMemo(() => buildLayout(GALLERY.length, cols), [cols]);

  const setCellRef =
    (i: number) =>
    (el: HTMLDivElement | null) => {
      if (el) cellsRef.current.set(i, el);
      else cellsRef.current.delete(i);
    };

  const setCardRef =
    (i: number) =>
    (el: HTMLDivElement | null) => {
      if (el) cardsRef.current.set(i, el);
      else cardsRef.current.delete(i);
    };

  /* ---- Grid responsive: 2 cols (<640) · 3 cols (640–1024) · 4 cols (≥1024) ---- */
  useEffect(() => {
    const mqDesktop = window.matchMedia("(min-width: 1024px)");
    const mqTablet = window.matchMedia("(min-width: 640px)");
    const apply = () =>
      setCols(mqDesktop.matches ? 4 : mqTablet.matches ? 3 : 2);
    apply();
    mqDesktop.addEventListener("change", apply);
    mqTablet.addEventListener("change", apply);
    return () => {
      mqDesktop.removeEventListener("change", apply);
      mqTablet.removeEventListener("change", apply);
    };
  }, []);

  /* ---- EL MOTOR ---- */
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const videoLeft = videoLeftRef.current;
    const videoRight = videoRightRef.current;
    const panel = panelRef.current;
    const wrap = wrapRef.current;
    const overlay = overlayRef.current;
    const info = infoRef.current;
    const symbolEl = symbolRef.current;
    const buy = buyRef.current;
    const footer = footerRef.current;
    const cursorEl = cursorRef.current;
    if (
      !root ||
      !canvas ||
      !videoLeft ||
      !videoRight ||
      !panel ||
      !wrap ||
      !overlay ||
      !info ||
      !buy ||
      !footer
    ) {
      return;
    }

    /* Lenis defensivo: si el shell global inyectara Lenis, lo detenemos en esta ruta. */
    const win = window as unknown as Record<string, LenisLike | undefined>;
    const lenis = win.lenis ?? win.__lenis;
    if (lenis && typeof lenis.stop === "function") lenis.stop();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch =
      window.matchMedia("(hover: none), (pointer: coarse)").matches ||
      navigator.maxTouchPoints > 0;

    let vh = window.innerHeight;
    let maxScroll = 0;
    let mouseX = window.innerWidth / 2;
    let activeSide: "left" | "right" = "right";
    let outroOffset = 166;
    let loadedCount = 0;
    let revealed = false;
    let raf = 0;
    let fallbackTimer = 0;
    let lastSymT = 0;
    let lastSymY = -9999;
    let symIdx = 0;

    /* ---------- 4.13 Medición ---------- */
    const measure = () => {
      vh = window.innerHeight;
      maxScroll = Math.max(0, wrap.scrollHeight - vh);
      outroOffset = window.innerWidth < 640 ? 132 : 166;
      info.dataset.outroOffset = String(outroOffset);
      root.style.height = `${vh + maxScroll + vh * 2}px`;
    };

    /* ---------- Opacidad del canvas ---------- */
    const revealCanvas = () => {
      if (revealed) return;
      if (
        loadedCount >= 2 ||
        videoLeft.readyState >= 1 ||
        videoRight.readyState >= 1
      ) {
        revealed = true;
        canvas.style.opacity = "1";
      }
    };

    /* Revelado forzoso: el canvas SIEMPRE se muestra (video o backdrop).
       Clave en móvil: si el video tarda o no carga (Low Power Mode, red lenta),
       el hero nunca queda vacío. */
    const forceReveal = () => {
      if (revealed) return;
      revealed = true;
      canvas.style.opacity = "1";
    };

    const onVideoData = () => {
      loadedCount += 1;
      revealCanvas();
    };

    /* ---------- Fallback de fuente en cadena: CDN → prmpt ---------- */
    const swapVideoSource = (video: HTMLVideoElement, chain: string[]) => {
      const step = Number(video.dataset.swapped || "0");
      const next = chain[step];
      if (!next) return;
      video.dataset.swapped = String(step + 1);
      video.src = next;
      video.load();
    };
    const onVideoError = (video: HTMLVideoElement, chain: string[]) => () => {
      swapVideoSource(video, chain);
      forceReveal();
    };
    const onLeftError = onVideoError(videoLeft, [
      VIDEO_LEFT_PEXELS,
      VIDEO_LEFT_PRMTP_FALLBACK,
    ]);
    const onRightError = onVideoError(videoRight, [
      VIDEO_RIGHT_PEXELS,
      VIDEO_RIGHT_PRMTP_FALLBACK,
    ]);

    /* ---------- 4.9 Móvil/táctil: autoplay alternado ---------- */
    let touchEnded: (() => void) | null = null;
    let touchRetry: (() => void) | null = null;
    let touchSide: "left" | "right" = "left";
    if (touch && !reduced) {
      const other = (s: "left" | "right"): "left" | "right" =>
        s === "left" ? "right" : "left";
      const playSide = (s: "left" | "right") => {
        touchSide = s;
        videoLeft.style.display = s === "left" ? "block" : "none";
        videoRight.style.display = s === "right" ? "block" : "none";
        const v = s === "left" ? videoLeft : videoRight;
        v.currentTime = 0;
        v.play().catch(() => {});
      };
      touchEnded = () => {
        playSide(other(touchSide));
      };
      /* Reintento con la primera interacción del usuario (Low Power Mode,
         políticas de autoplay): al tocar la página, si el video está pausado,
         se reanuda. */
      touchRetry = () => {
        const v = touchSide === "left" ? videoLeft : videoRight;
        if (v.paused) v.play().catch(() => {});
      };
      videoLeft.addEventListener("ended", touchEnded);
      videoRight.addEventListener("ended", touchEnded);
      window.addEventListener("pointerdown", touchRetry, { passive: true });
      playSide("left");
    }

    /* ---------- Cursor custom (solo desktop ≥1024px, no táctil) ---------- */
    const applyCursorMode = () => {
      const show = window.innerWidth >= 1024 && !touch;
      root.classList.toggle("no-cursor", show);
      if (cursorEl) cursorEl.style.display = show ? "block" : "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      if (!cursorEl) return;
      if (window.innerWidth < 1024 || touch) return;
      cursorEl.style.left = `${e.clientX}px`;
      cursorEl.style.top = `${e.clientY}px`;
    };

    /* ---------- 4.12 Fases de scroll: tick 100% RAF ---------- */
    const tick = () => {
      const scrollY = window.scrollY;

      /* Fase 1 (0 → vh): el panel negro sube · Fase 2 (> vh): el wrap sube */
      if (scrollY <= vh) {
        panel.style.transform = `translateY(${vh - scrollY}px)`;
        wrap.style.transform = "translateY(0px)";
        canvas.style.visibility = "visible";
      } else {
        panel.style.transform = "translateY(0px)";
        const over = Math.min(scrollY - vh, maxScroll);
        wrap.style.transform = `translateY(${-over}px)`;
        canvas.style.visibility = "hidden";
      }

      /* Outro */
      const extra = Math.max(0, scrollY - vh - maxScroll);
      const progress = Math.min(extra / Math.max(vh - 100, 1), 1);
      overlay.style.opacity = String(progress);
      info.style.transform = `translateY(${-outroOffset * progress}px)`;
      buy.style.transform = `scale(${progress})`;
      footer.style.opacity = String(progress);

      /* Símbolo del círculo: cambia al hacer scroll (throttle 80ms) */
      const now = performance.now();
      if (now - lastSymT > 80 && Math.abs(scrollY - lastSymY) > 16) {
        lastSymT = now;
        lastSymY = scrollY;
        let next = Math.floor(Math.random() * SYMBOLS.length);
        if (next === symIdx) next = (next + 1) % SYMBOLS.length;
        symIdx = next;
        if (symbolEl) symbolEl.textContent = SYMBOLS[next];
      }

      /* Scrub por cursor X (desktop no táctil) con dead zone.
         Híbrido: dentro del dead zone el video se REPRODUCE (se ve en
         movimiento aunque no toques el mouse); al mover el cursor fuera,
         el scrub toma el control del tiempo. */
      if (!touch && !reduced) {
        const width = window.innerWidth;
        const dead = Math.max(30, width * 0.05);
        const center = width / 2;
        const dist = Math.abs(mouseX - center);

        if (dist > dead) {
          const side: "left" | "right" = mouseX < center ? "right" : "left";
          if (side !== activeSide) {
            activeSide = side;
            videoLeft.style.display = side === "left" ? "block" : "none";
            videoRight.style.display = side === "right" ? "block" : "none";
          }
        }

        const active = activeSide === "left" ? videoLeft : videoRight;

        if (dist <= dead) {
          /* Dead zone: reproducción continua (sin loop attribute para no
             romper la alternancia de móvil; reiniciamos al terminar). */
          if (active.ended) active.currentTime = 0;
          if (active.paused && active.readyState >= 2) {
            active.play().catch(() => {});
          }
        } else {
          /* Scrub: pausar para que el seek mande sin pelear con el play */
          if (!active.paused) active.pause();
          const d = active.duration;
          let target = 0;
          if (Number.isFinite(d) && d > 0) {
            const range = center - dead;
            const t =
              activeSide === "right"
                ? (center - dead - mouseX) / range
                : (mouseX - center - dead) / range;
            target = Math.min(Math.max(t, 0), 1) * d;
          }
          if (
            !active.seeking &&
            Number.isFinite(d) &&
            d > 0 &&
            Math.abs(active.currentTime - target) > 0.03
          ) {
            active.currentTime = target;
          }
        }
      }

      /* Cards: escala según posición vertical (transform-origin por mitad de grid) */
      cellsRef.current.forEach((cell, i) => {
        const card = cardsRef.current.get(i);
        if (!card) return;
        const rect = cell.getBoundingClientRect();
        const top = rect.top;
        const bottom = rect.bottom;
        if (bottom <= 0 || top >= vh) {
          card.style.transform = "scale(0)";
          return;
        }
        const enter = Math.min(1, (vh - top) / (vh * 0.6));
        const exit = Math.min(1, bottom / (vh * 0.4));
        const s = Math.max(0, Math.min(enter, exit));
        card.style.transform = `scale(${s})`;
      });

      raf = requestAnimationFrame(tick);
    };

    /* ---------- Listeners + init ---------- */
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    /* El cursor custom crece al pasar sobre el CTA "simular" */
    const buyLink = buy.querySelector("a");
    const onBuyEnter = () => cursorEl?.classList.add("cursor-hot");
    const onBuyLeave = () => cursorEl?.classList.remove("cursor-hot");
    buyLink?.addEventListener("mouseenter", onBuyEnter);
    buyLink?.addEventListener("mouseleave", onBuyLeave);

    const onResize = () => {
      measure();
      applyCursorMode();
    };
    window.addEventListener("resize", onResize);

    const resizeObserver = new ResizeObserver(() => measure());
    resizeObserver.observe(wrap);

    videoLeft.addEventListener("loadeddata", onVideoData);
    videoRight.addEventListener("loadeddata", onVideoData);
    videoLeft.addEventListener("loadedmetadata", revealCanvas);
    videoRight.addEventListener("loadedmetadata", revealCanvas);
    videoLeft.addEventListener("error", onLeftError);
    videoRight.addEventListener("error", onRightError);

    /* Estado inicial. OJO: en táctil NO pisamos aquí los displays —
       playSide("left") del autoplay ya eligió cuál se ve. */
    if (!touch) {
      videoLeft.style.display = "none";
      videoRight.style.display = "block";
    }
    if (videoLeft.readyState >= 2) loadedCount += 1;
    if (videoRight.readyState >= 2) loadedCount += 1;
    revealCanvas();
    measure();
    applyCursorMode();
    fallbackTimer = window.setTimeout(forceReveal, 2000);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      buyLink?.removeEventListener("mouseenter", onBuyEnter);
      buyLink?.removeEventListener("mouseleave", onBuyLeave);
      cursorEl?.classList.remove("cursor-hot");
      resizeObserver.disconnect();
      videoLeft.removeEventListener("loadeddata", onVideoData);
      videoRight.removeEventListener("loadeddata", onVideoData);
      videoLeft.removeEventListener("loadedmetadata", revealCanvas);
      videoRight.removeEventListener("loadedmetadata", revealCanvas);
      videoLeft.removeEventListener("error", onLeftError);
      videoRight.removeEventListener("error", onRightError);
      if (touchEnded) {
        videoLeft.removeEventListener("ended", touchEnded);
        videoRight.removeEventListener("ended", touchEnded);
      }
      if (touchRetry) {
        window.removeEventListener("pointerdown", touchRetry);
      }
      if (lenis && typeof lenis.start === "function") lenis.start();
      videoLeft.pause();
      videoRight.pause();
    };
  }, []);

  /* Fallback de imágenes en cadena: CDN → prmpt */
  const handleImgError = (i: number) => {
    const step = swappedRef.current.get(i) ?? 0;
    const chain = [GALLERY_PEXELS[i], GALLERY_PRMTP_FALLBACK[i]].filter(
      (u): u is string => Boolean(u)
    );
    const next = chain[step];
    if (!next) return;
    swappedRef.current.set(i, step + 1);
    const card = cardsRef.current.get(i);
    const img = card?.querySelector("img");
    if (img) img.src = next;
  };

  return (
    <div id="scroll-spacer" ref={rootRef}>
      {/* 4.8 Contenedor de video */}
      <div id="main-canvas" ref={canvasRef}>
        <video
          ref={videoLeftRef}
          src={VIDEO_LEFT}
          poster="/images/archivo-backdrop.jpg"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
        />
        <video
          ref={videoRightRef}
          src={VIDEO_RIGHT}
          poster="/images/archivo-backdrop.jpg"
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* 4.11 Panel negro + galería */}
      <div id="panel-black" ref={panelRef} style={{ transform: "translateY(100vh)" }}>
        <div id="panel-wrap" ref={wrapRef}>
          <div
            id="bp-grid"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {layout.map((row, r) =>
              row.map((idx, c) =>
                idx === -1 ? (
                  <div
                    key={`s-${r}-${c}`}
                    className="bp-cell bp-spacer"
                    aria-hidden="true"
                  />
                ) : (
                  <div
                    key={`cell-${idx}`}
                    className="bp-cell"
                    ref={setCellRef(idx)}
                  >
                    <div
                      className="bp-card"
                      ref={setCardRef(idx)}
                      style={{
                        transform: "scale(0)",
                        transformOrigin:
                          c < cols / 2 ? "right bottom" : "left bottom",
                      }}
                    >
                      <img
                        src={GALLERY[idx]}
                        alt={`Archivo pieza ${idx + 1}`}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                        onError={() => handleImgError(idx)}
                      />
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>

      {/* 4.10 Overlay blanco */}
      <div id="outro-overlay" ref={overlayRef} aria-hidden="true" />

      {/* 4.2 Cursor custom */}
      <div id="cursor" ref={cursorRef} aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="22.75"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
          />
          <path
            d="M24 16v16M16 24h16"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>

      {/* 4.3 Wordmark NOCTA® */}
      <div id="logo" aria-hidden="true">
        NOCTA<sup>®</sup>
      </div>

      {/* 4.4 Caption */}
      <p id="caption">{CAPTION_TEXT}</p>

      {/* 4.5 Nav */}
      <nav id="nav" aria-label="Archivo">
        <a className="nav-about" href="/panel">
          ESTUDIO
        </a>
        <svg
          className="nav-burger"
          viewBox="0 0 40 40"
          aria-hidden="true"
        >
          <path d="M0 14H40" stroke="#fff" strokeWidth="2.5" fill="none" />
          <path d="M0 26H40" stroke="#fff" strokeWidth="2.5" fill="none" />
        </svg>
        <a className="nav-agendar" href="/agenda">
          [ AGENDAR ]
        </a>
      </nav>

      {/* 4.6 Product info */}
      <div id="outro-info" ref={infoRef} data-outro-offset="166">
        <div className="info-circle">
          <svg width="44" height="44" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="18.75"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
            />
          </svg>
          <span id="circle-symbol" ref={symbolRef}>
            8
          </span>
        </div>
        <div className="info-label">
          COLECCIÓN ARCHIVO
          <br />
          VALENTINA RÍOS
        </div>
        <div className="info-big">TU IDEA</div>
      </div>

      {/* 4.7 CTA "simular" */}
      <div id="outro-buy" ref={buyRef} style={{ transform: "scale(0)" }}>
        <span className="cta-label" aria-hidden="true">
          PRUEBA EL SIMULADOR ↘
        </span>
        <a href="/simulador">
          <span className="cta-pulse" aria-hidden="true" />
          simular
          <span className="cta-arrow" aria-hidden="true">
            →
          </span>
        </a>
      </div>

      {/* 4.10 Footer */}
      <footer id="outro-footer" ref={footerRef}>
        <span>NOCTA ® 2026</span>
        <a href="/panel" className="panel-link">
          PANEL DEL ESTUDIO
        </a>
        <span>AVISO DE PRIVACIDAD</span>
      </footer>
    </div>
  );
}
