"use client";

/**
 * NOCTA — PANEL DEL ESTUDIO (mini-hub del artista)
 * Tres pestañas, cero fricción, sin videos (carga instantánea):
 *   SOLICITUDES → ver, aceptar o dejar pasar (mensaje redactado solo)
 *   AGENDA      → calendario con las citas (las aceptadas se cargan solas)
 *   IDEAS       → espacio de ideas y pendientes
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/inter-tight/700.css";

interface Lead {
  id: number;
  nombre: string;
  contacto: string;
  zona: string | null;
  concepto: string | null;
  fechaPreferida: string | null;
  estado: string;
  simulacion: string | null;
  creadoEn: string | null;
  respondidoEn: string | null;
}

interface Cita {
  id: number;
  fecha: string;
  titulo: string;
  detalle: string | null;
  creadoEn: string | null;
}

interface Nota {
  id: number;
  texto: string;
  hecho: boolean;
  creadoEn: string | null;
}

interface ModalData {
  mensaje: string;
  whatsapp: string | null;
  nombre: string;
}

type Tab = "solicitudes" | "agenda" | "ideas";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function haceCuando(iso: string | null): string {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function fmtDia(fecha: string): string {
  const [, m, d] = fecha.split("-");
  const mi = Number(m);
  return `${Number(d)} ${MESES[mi - 1]?.slice(0, 3) ?? m}`;
}

/* Detecta si el contacto es un teléfono (para el enlace de WhatsApp). */
function detectPhone(contacto: string): string | null {
  const digits = (contacto || "").replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

/* Mensaje redactado que el artista envía con un clic. */
function composeMsg(p: {
  nombre: string;
  zona?: string | null;
  concepto?: string | null;
}): string {
  const nombre = p.nombre || "hola";
  const partes: string[] = [
    `Hola ${nombre}! Soy del estudio NOCTA®.`,
    "Vi tu solicitud y me encanta tu idea.",
  ];
  if (p.concepto?.trim()) partes.push(`Sobre tu concepto: "${p.concepto.trim()}".`);
  if (p.zona?.trim()) partes.push(`Zona: ${p.zona.trim()}.`);
  partes.push("¿Te queda bien?");
  return partes.join(" ");
}

/* Celdas del mes (lunes primero, null = fuera de mes) */
function matrixMes(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay(); // 0=dom
  const offset = (first + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fechaDe(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function PanelApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [clave, setClave] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<Tab>("solicitudes");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [cargando, setCargando] = useState(true);

  const [modal, setModal] = useState<ModalData | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [toast, setToast] = useState("");
  const [dbError, setDbError] = useState(false);

  /* Modal de "programar cita" al aceptar una solicitud */
  const [programar, setProgramar] = useState<{
    lead: Lead;
    fecha: string;
  } | null>(null);

  /* Agenda */
  const [ym, setYm] = useState<{ y: number; m: number }>(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [sel, setSel] = useState<string>(hoyISO());
  const [nuevaFecha, setNuevaFecha] = useState(hoyISO());
  const [nuevoTitulo, setNuevoTitulo] = useState("");

  /* Ideas */
  const [nuevaIdea, setNuevaIdea] = useState("");

  const loadAll = useCallback(async () => {
    try {
      const [lr, cr, nr] = await Promise.all([
        fetch("/api/panel/leads", { cache: "no-store" }),
        fetch("/api/panel/citas", { cache: "no-store" }),
        fetch("/api/panel/ideas", { cache: "no-store" }),
      ]);
      if (lr.status === 401 || cr.status === 401 || nr.status === 401) {
        if (authed !== false) setAuthed(false);
        return;
      }
      const [ld, cd, nd] = (await Promise.all([
        lr.json(),
        cr.json(),
        nr.json(),
      ])) as [
        { ok?: boolean; leads?: Lead[] },
        { ok?: boolean; citas?: Cita[] },
        { ok?: boolean; notas?: Nota[] },
      ];
      /*
       * React 19 / Next 16: hacer setAuthed(true) junto a todos los set* de
       * datos en el MISMO commit, tras un await, dispara el error #310
       * (Render not wrapped in act). Separamos: primero cambia la sesión
       * (muestra el shell), y en el siguiente microtask se rellenan datos.
       */
      if (authed !== true) {
        setAuthed(true);
      }
      queueMicrotask(() => {
        if (ld.ok) setLeads(ld.leads ?? []);
        if (cd.ok) setCitas(cd.citas ?? []);
        if (nd.ok) setNotas(nd.notas ?? []);
        setDbError(!ld.ok && !cd.ok && !nd.ok);
        setCargando(false);
      });
    } catch {
      setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  /* Al montar: chequeo inicial. loadAll decide authed. */
  useEffect(() => {
    if (authed !== null) return; // ya decidido (p.ej. por login)
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Ya autenticado: carga datos + refresco cada 30s. */
  useEffect(() => {
    if (authed !== true) return;
    void loadAll();
    const t = setInterval(() => void loadAll(), 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  useEffect(() => {
    setNuevaFecha(sel);
  }, [sel]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/panel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave }),
      });
      if (res.ok) {
        /* Recarga completa de la página tras login correcto: esto reinicia
           React desde cero, eliminando el error #310 (Render not wrapped in
           act). Al volver a montar, la cookie de sesión ya está puesta y el
           panel carga directo autenticado. */
        window.location.reload();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setLoginError(data.error || "Clave incorrecta.");
      }
    } catch {
      setLoginError("Sin conexión. Intenta de nuevo.");
    }
  };

  const onLogout = async () => {
    await fetch("/api/panel/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
    setLeads([]);
    setCitas([]);
    setNotas([]);
  };

  /* ---------- Solicitudes ---------- */
  const empezarAceptar = (lead: Lead) => {
    /* 1º: elegir el día en el calendario → 2º se abre el modal de mensaje.
       La fecha propuesta = la preferida del cliente si es válida, si no hoy. */
    const propuesta = lead.fechaPreferida ?? hoyISO();
    setProgramar({ lead, fecha: propuesta });
  };

  const confirmarCitaYEnviar = async (lead: Lead, fecha: string) => {
    try {
      /* a) marcar solicitud como aceptada (sin crear cita todavía) */
      await fetch(`/api/panel/leads/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "aceptar" }),
      });
      /* b) crear la cita en la agenda con la fecha elegida */
      setCitas((cs) =>
        [
          ...cs,
          {
            id: Date.now(), // provisional; se sobreescribe con loadAll
            fecha,
            titulo: `Cita con ${lead.nombre}`.slice(0, 200),
            detalle: [lead.zona, lead.concepto].filter(Boolean).join(" · ").slice(0, 500) || null,
            creadoEn: new Date().toISOString(),
          },
        ].sort((a, b) => (a.fecha === b.fecha ? a.id - b.id : a.fecha.localeCompare(b.fecha)))
      );
      await fetch("/api/panel/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          titulo: `Cita con ${lead.nombre}`.slice(0, 200),
          detalle: [lead.zona, lead.concepto].filter(Boolean).join(" · ").slice(0, 500) || null,
        }),
      });
      /* c) actualizar estado local de la solicitud */
      setLeads((ls) =>
        ls.map((l) =>
          l.id === lead.id
            ? { ...l, estado: "aceptado", respondidoEn: new Date().toISOString() }
            : l
        )
      );
      setSel(fecha); // saltar al día programado
      setYm({ y: Number(fecha.slice(0, 4)), m: Number(fecha.slice(5, 7)) - 1 });
      setTab("agenda");
      void loadAll();
      setToast(`✓ ${lead.nombre} → cita el ${fmtDia(fecha)}`);
      setTimeout(() => setToast(""), 3500);

      /* d) abrir el mensaje redactado para el cliente (con la fecha) */
      const pos = { nombre: lead.nombre, zona: lead.zona, concepto: lead.concepto };
      const msj = `${composeMsg(pos)} Te propuse el ${fmtDia(fecha)}. ¿Te queda bien?`;
      const tel = detectPhone(lead.contacto);
      const waUrl = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msj)}` : null;
      setCopiado(false);
      setModal({ mensaje: msj, whatsapp: waUrl, nombre: lead.nombre });
    } catch {
      setToast("No pudimos programar la cita. Intenta de nuevo.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  const responder = async (lead: Lead, accion: "aceptar" | "declinar") => {
    /* aceptar SIEMPRE pasa antes por el selector de cita */
    if (accion === "aceptar") {
      empezarAceptar(lead);
      return;
    }
    try {
      await fetch(`/api/panel/leads/${lead.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "declinar" }),
      });
      setLeads((ls) =>
        ls.map((l) =>
          l.id === lead.id
            ? { ...l, estado: "declinado", respondidoEn: new Date().toISOString() }
            : l
        )
      );
      setToast("Solicitud dejada pasar.");
      setTimeout(() => setToast(""), 2500);
    } catch {
      setToast("No pudimos actualizar. Intenta de nuevo.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  /* Regenera el mensaje para una solicitud ya aceptada (sin crear otra cita) */
  const abrirMensajeAceptado = (lead: Lead) => {
    const wa = detectPhone(lead.contacto);
    setCopiado(false);
    setModal({
      mensaje: composeMsg({
        nombre: lead.nombre,
        zona: lead.zona,
        concepto: lead.concepto,
      }),
      whatsapp: wa,
      nombre: lead.nombre,
    });
  };

  const copiar = async () => {
    if (!modal) return;
    try {
      await navigator.clipboard.writeText(modal.mensaje);
      setCopiado(true);
    } catch {
      setToast("No pudimos copiar. Selecciona el texto manualmente.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  /* ---------- Agenda ---------- */
  const addCita = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoTitulo.trim()) return;
    try {
      const res = await fetch("/api/panel/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nuevaFecha, titulo: nuevoTitulo }),
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; cita?: Cita };
      if (data.ok && data.cita) {
        setCitas((cs) => [...cs, data.cita as Cita].sort((a, b) =>
          a.fecha === b.fecha ? a.id - b.id : a.fecha.localeCompare(b.fecha)
        ));
        setSel(nuevaFecha);
        setNuevoTitulo("");
      }
    } catch {
      setToast("No pudimos guardar la cita.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  const deleteCita = async (id: number) => {
    try {
      const res = await fetch(`/api/panel/citas/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (res.ok) setCitas((cs) => cs.filter((c) => c.id !== id));
    } catch {
      setToast("No pudimos borrar la cita.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  /* ---------- Ideas ---------- */
  const addIdea = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevaIdea.trim()) return;
    try {
      const res = await fetch("/api/panel/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: nuevaIdea }),
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; nota?: Nota };
      if (data.ok && data.nota) {
        setNotas((ns) => [data.nota as Nota, ...ns]);
        setNuevaIdea("");
      }
    } catch {
      setToast("No pudimos guardar la idea.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  const toggleIdea = async (nota: Nota) => {
    setNotas((ns) => ns.map((n) => (n.id === nota.id ? { ...n, hecho: !n.hecho } : n)));
    try {
      await fetch(`/api/panel/ideas/${nota.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hecho: !nota.hecho }),
      });
    } catch {
      /* sin red: revertir */
      setNotas((ns) => ns.map((n) => (n.id === nota.id ? { ...n, hecho: nota.hecho } : n)));
    }
  };

  const deleteIdea = async (id: number) => {
    try {
      const res = await fetch(`/api/panel/ideas/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (res.ok) setNotas((ns) => ns.filter((n) => n.id !== id));
    } catch {
      setToast("No pudimos borrar la idea.");
      setTimeout(() => setToast(""), 2500);
    }
  };

  /* ---------- Derivados (HOOKS siempre en el mismo orden: se declaran
     ANTES de cualquier return condicional para respetar las Reglas de
     React. Referencias: `leads`, `citas`, `notas`, `ym`, `sel`. ---------- */
  const citasDelDia = useMemo(
    () =>
      citas.filter((c) => c.fecha === sel).sort((a, b) => a.id - b.id),
    [citas, sel]
  );
  const porFecha = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of citas) map.set(c.fecha, (map.get(c.fecha) ?? 0) + 1);
    return map;
  }, [citas]);
  const celdas = useMemo(() => matrixMes(ym.y, ym.m), [ym]);

  const nuevas = leads.filter((l) => l.estado === "nuevo");
  const pendientes = notas.filter((n) => !n.hecho).length;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "solicitudes", label: "Solicitudes", count: nuevas.length },
    { key: "agenda", label: "Agenda" },
    { key: "ideas", label: "Ideas", count: pendientes },
  ];

  /* ---------- Login ---------- */
  if (authed === false) {
    return (
      <main className="grid min-h-screen place-items-center bg-black px-6 text-white">
        <form
          onSubmit={onLogin}
          className="w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-950/60 p-8"
        >
          <p className="text-2xl font-bold tracking-tight">
            NOCTA<sup className="text-[0.4em] font-medium">®</sup>
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
            Panel del estudio
          </p>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="Clave"
            autoFocus
            className="mt-6 w-full rounded-2xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
          />
          {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-white py-3 text-sm font-bold text-black transition hover:bg-neutral-200"
          >
            Entrar
          </button>
          <p className="mt-4 text-center text-[10px] text-neutral-600">
            Solo para el estudio. Si no tienes clave, pídela al administrador.
          </p>
        </form>
      </main>
    );
  }

  if (authed === null) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-sm text-neutral-500">
        …
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-6 md:px-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight">
              NOCTA<sup className="text-[0.4em] font-medium">®</sup>
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Panel del estudio
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadAll()}
              className="rounded-full border border-neutral-700 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition hover:border-white hover:text-white"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 transition hover:text-white"
            >
              Salir
            </button>
          </div>
        </header>

        {dbError && (
          <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 text-xs leading-relaxed text-amber-200">
            ✦ La bandeja no está conectada a su base de datos — agrega{" "}
            <code className="rounded bg-black/40 px-1">DATABASE_URL</code> en
            Vercel (Settings → Environment Variables) y redeploya. Mientras
            tanto, la página sigue funcionando.
          </div>
        )}

        {/* Tabs */}
        <div className="mt-10 flex gap-6 border-b border-neutral-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`pb-3 text-xs font-semibold uppercase tracking-widest transition ${
                tab === t.key
                  ? "border-b-2 border-white text-white"
                  : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 && ` (${t.count})`}
            </button>
          ))}
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-xs text-white shadow-2xl">
            {toast}
          </div>
        )}

        {/* ---------- SOLICITUDES ---------- */}
        {tab === "solicitudes" &&
          (cargando && leads.length === 0 ? (
            <p className="mt-12 text-center text-sm text-neutral-600">
              Cargando solicitudes…
            </p>
          ) : leads.length === 0 ? (
            <div className="mt-20 text-center">
              <p className="text-2xl">✦</p>
              <p className="mt-4 text-lg font-semibold">
                Aún no hay solicitudes.
              </p>
              <p className="mt-2 text-xs text-neutral-600">
                Cuando alguien pida una cita desde la página, aparecerá aquí.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className={`rounded-2xl border p-4 transition md:p-5 ${
                    lead.estado === "nuevo"
                      ? "border-neutral-700 bg-neutral-950/60"
                      : lead.estado === "aceptado"
                        ? "border-emerald-400/40 bg-emerald-400/5"
                        : "border-neutral-900 bg-transparent opacity-50"
                  }`}
                >
                  <div className="flex gap-4">
                    {lead.simulacion ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lead.simulacion}
                        alt={`Simulación de ${lead.nombre}`}
                        className="h-20 w-16 shrink-0 rounded-lg border border-neutral-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-neutral-800 text-neutral-700">
                        ✦
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-base font-bold">{lead.nombre}</p>
                        {lead.estado === "aceptado" && (
                          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                            Aceptada
                          </span>
                        )}
                        {lead.estado === "declinado" && (
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                            Dejada pasar
                          </span>
                        )}
                      </div>
                      {lead.concepto && (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-400">
                          {lead.concepto}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-neutral-600">
                        {[lead.zona, lead.fechaPreferida && `📅 ${lead.fechaPreferida}`]
                          .filter(Boolean)
                          .join(" · ")}
                        {lead.contacto && <span> · {lead.contacto}</span>} ·{" "}
                        {haceCuando(lead.creadoEn)}
                      </p>
                    </div>

                    {lead.estado === "nuevo" && (
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => void responder(lead, "aceptar")}
                          className="rounded-full bg-white px-5 py-2 text-xs font-bold text-black transition hover:bg-neutral-200"
                        >
                          Aceptar →
                        </button>
                        <button
                          type="button"
                          onClick={() => void responder(lead, "declinar")}
                          className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600 transition hover:text-neutral-400"
                        >
                          Dejar pasar
                        </button>
                      </div>
                    )}

                    {lead.estado === "aceptado" && (
                      <button
                        type="button"
                        onClick={() => abrirMensajeAceptado(lead)}
                        className="shrink-0 self-center rounded-full border border-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition hover:bg-white hover:text-black"
                      >
                        Contactar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}

        {/* ---------- AGENDA ---------- */}
        {tab === "agenda" && (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setYm((p) => (p.m === 0 ? { y: p.y - 1, m: 11 } : { y: p.y, m: p.m - 1 }))
                }
                className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-400 transition hover:border-white hover:text-white"
              >
                ←
              </button>
              <p className="text-sm font-bold uppercase tracking-[0.2em]">
                {MESES[ym.m]} {ym.y}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setYm({ y: d.getFullYear(), m: d.getMonth() });
                    setSel(hoyISO());
                  }}
                  className="rounded-full border border-neutral-700 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 transition hover:border-white hover:text-white"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setYm((p) => (p.m === 11 ? { y: p.y + 1, m: 0 } : { y: p.y, m: p.m + 1 }))
                  }
                  className="rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-400 transition hover:border-white hover:text-white"
                >
                  →
                </button>
              </div>
            </div>

            {/* Calendario */}
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
              <div className="grid grid-cols-7 gap-1">
                {DIAS.map((d) => (
                  <span
                    key={d}
                    className="pb-2 text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-600"
                  >
                    {d}
                  </span>
                ))}
                {celdas.map((day, i) => {
                  if (day === null) return <span key={`e-${i}`} />;
                  const fecha = fechaDe(ym.y, ym.m, day);
                  const esSel = fecha === sel;
                  const esHoy = fecha === hoyISO();
                  const tiene = porFecha.get(fecha) ?? 0;
                  return (
                    <button
                      key={fecha}
                      type="button"
                      onClick={() => setSel(fecha)}
                      className={`relative flex h-11 items-center justify-center rounded-xl text-xs font-semibold transition ${
                        esSel
                          ? "bg-white text-black"
                          : esHoy
                            ? "text-white ring-1 ring-white"
                            : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                      }`}
                    >
                      {day}
                      {tiene > 0 && (
                        <span
                          className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                            esSel ? "bg-black" : "bg-white"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Citas del día */}
            <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              {fmtDia(sel)} · {citasDelDia.length > 0
                ? `${citasDelDia.length} ${citasDelDia.length === 1 ? "cita" : "citas"}`
                : "nada agendado"}
            </p>

            {citasDelDia.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-600">
                Un día libre. Que fluya el arte. ✦
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {citasDelDia.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{c.titulo}</p>
                      {c.detalle && (
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          {c.detalle}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteCita(c.id)}
                      className="text-sm text-neutral-600 transition hover:text-white"
                      aria-label="Borrar cita"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Nueva cita */}
            <form
              onSubmit={(e) => void addCita(e)}
              className="mt-6 flex flex-col gap-2 rounded-2xl border border-neutral-800 p-4 sm:flex-row"
            >
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="rounded-2xl border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-xs text-white focus:border-white focus:outline-none [color-scheme:dark]"
              />
              <input
                type="text"
                value={nuevoTitulo}
                onChange={(e) => setNuevoTitulo(e.target.value)}
                placeholder="Nueva cita…"
                className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-900/60 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200"
              >
                Añadir
              </button>
            </form>
          </section>
        )}

        {/* ---------- IDEAS ---------- */}
        {tab === "ideas" && (
          <section className="mt-6">
            <form
              onSubmit={(e) => void addIdea(e)}
              className="flex gap-2"
            >
              <input
                type="text"
                value={nuevaIdea}
                onChange={(e) => setNuevaIdea(e.target.value)}
                placeholder="Anota una idea, un pendiente, una pieza…"
                className="flex-1 rounded-2xl border border-neutral-700 bg-neutral-950/60 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-3 text-xs font-bold text-black transition hover:bg-neutral-200"
              >
                Añadir
              </button>
            </form>

            {notas.length === 0 ? (
              <div className="mt-20 text-center">
                <p className="text-2xl">✦</p>
                <p className="mt-4 text-lg font-semibold">
                  Tu espacio para ideas y pendientes.
                </p>
                <p className="mt-2 text-xs text-neutral-600">
                  Ideas de piezas, referencias, cosas que no debes olvidar.
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-2">
                {notas.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleIdea(n)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                        n.hecho
                          ? "border-white bg-white text-black"
                          : "border-neutral-600 text-transparent hover:border-white"
                      }`}
                      aria-label={n.hecho ? "Marcar pendiente" : "Marcar hecha"}
                    >
                      ✓
                    </button>
                    <p
                      className={`min-w-0 flex-1 text-sm leading-relaxed ${
                        n.hecho
                          ? "text-neutral-600 line-through"
                          : "text-neutral-200"
                      }`}
                    >
                      {n.texto}
                    </p>
                    <button
                      type="button"
                      onClick={() => void deleteIdea(n.id)}
                      className="text-sm text-neutral-600 transition hover:text-white"
                      aria-label="Borrar idea"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {notas.length > 0 && (
              <p className="mt-6 text-center text-[10px] uppercase tracking-widest text-neutral-700">
                {notas.filter((n) => n.hecho).length} hechas · {pendientes} pendientes
              </p>
            )}
          </section>
        )}

        <p className="mt-12 text-center text-[10px] uppercase tracking-widest text-neutral-700">
          NOCTA ® 2026 · la bandeja del estudio
        </p>
      </div>

      {/* ---------- Modal: programar cita al aceptar ---------- */}
      {programar && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-700 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Programar cita · {programar.lead.nombre}
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {programar.lead.concepto || "Su idea"}{" "}
              {programar.lead.zona ? `· ${programar.lead.zona}` : ""}
            </p>
            <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Elige el día
            </label>
            <input
              type="date"
              value={programar.fecha}
              min={hoyISO()}
              onChange={(e) =>
                setProgramar((p) => (p ? { ...p, fecha: e.target.value } : p))
              }
              className="mt-2 w-full rounded-2xl border border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm text-white focus:border-white focus:outline-none [color-scheme:dark]"
            />
            {programar.lead.fechaPreferida && (
              <p className="mt-2 text-[11px] text-neutral-500">
                Prefería el {fmtDia(programar.lead.fechaPreferida)} (puedes
                cambiarlo)
              </p>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProgramar(null)}
                className="rounded-full border border-neutral-600 py-3 text-sm font-semibold text-neutral-300 transition hover:border-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (programar) {
                    const l = programar.lead;
                    const f = programar.fecha;
                    setProgramar(null);
                    void confirmarCitaYEnviar(l, f);
                  }
                }}
                className="rounded-full bg-white py-3 text-sm font-bold text-black transition hover:bg-neutral-200"
              >
                Confirmar →
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-neutral-600">
              Se guarda en tu agenda y se marca la solicitud como aceptada.
            </p>
          </div>
        </div>
      )}

      {/* ---------- Modal: mensaje redactado por el sistema ---------- */}
      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-neutral-700 bg-neutral-950 p-6 md:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-500">
              Mensaje para {modal.nombre} — listo para enviar
            </p>
            <blockquote className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm leading-relaxed text-neutral-200">
              {modal.mensaje}
            </blockquote>
            <div className="mt-6 grid gap-3">
              {modal.whatsapp && (
                <a
                  href={modal.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white py-3 text-center text-sm font-bold text-black transition hover:bg-neutral-200"
                >
                  Abrir en WhatsApp ↗
                </a>
              )}
              <button
                type="button"
                onClick={() => void copiar()}
                className="rounded-full border border-neutral-600 py-3 text-sm font-semibold transition hover:border-white"
              >
                {copiado ? "Copiado ✓" : "Copiar mensaje"}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="py-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 transition hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] leading-relaxed text-neutral-600">
              La solicitud quedó marcada como aceptada. Si el contacto es de
              Instagram o correo, usa "Copiar mensaje" y pégalo donde quieras.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
