/**
 * Catálogo de diseños de colección para el simulador.
 * Fuente de "demo mode": cuando no hay claves de IA configuradas,
 * el simulador proyecta estos diseños sobre la piel.
 */

export interface SimuladorDesign {
  id: string;
  name: string;
  /** Ruta pública relativa a /public */
  path: string;
  /** Palabras clave (ES + EN) para el matcher */
  keywords: string[];
}

export const DEMO_DESIGNS: SimuladorDesign[] = [
  {
    id: "floral",
    name: "Botánico",
    path: "/simulador/designs/design-floral.jpg",
    keywords: [
      "flor", "flores", "floral", "rosa", "rosas", "rose", "peonia", "peonía",
      "peony", "botanic", "botánico", "jardin", "jardín", "garden", "vines",
      "enredadera", "hojas", "leaves", "ramo", "bouquet",
    ],
  },
  {
    id: "mandala",
    name: "Mandala",
    path: "/simulador/designs/design-mandala.jpg",
    keywords: [
      "mandala", "geometric", "geométrico", "geometrico", "sagrado", "sacred",
      "simetria", "simetría", "symmetry", "patron", "patrón", "pattern",
      "fractal", "espiritual",
    ],
  },
  {
    id: "serpent",
    name: "Serpiente",
    path: "/simulador/designs/design-serpent.jpg",
    keywords: [
      "serpiente", "serpent", "snake", "cobra", "vibora", "víbora", "reptil",
      "reptile", "dragon", "dragón", "tentacion", "tentación",
    ],
  },
  {
    id: "moth",
    name: "Polilla",
    path: "/simulador/designs/design-moth.jpg",
    keywords: [
      "polilla", "moth", "mariposa", "butterfly", "insecto", "insect", "alas",
      "wings", "nocturno", "nocturnal", "bicho",
    ],
  },
  {
    id: "wave",
    name: "Ola japonesa",
    path: "/simulador/designs/design-wave.jpg",
    keywords: [
      "ola", "wave", "japones", "japonesa", "japón", "japan", "japanese",
      "agua", "water", "mar", "sea", "oceano", "océano", "ocean", "hannya",
      "sol", "sun", "tempestad", "kanagawa",
    ],
  },
  {
    id: "celestial",
    name: "Celestial",
    path: "/simulador/designs/design-celestial.jpg",
    keywords: [
      "luna", "moon", "lunar", "estrellas", "stars", "celestial", "cosmos",
      "cosmico", "cósmico", "universo", "universe", "sol", "sun", "galaxia",
      "galaxy", "eclipse", "fases",
    ],
  },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Empareja un prompt de texto con un diseño de la colección. */
export function matchDesign(prompt: string): SimuladorDesign {
  const text = normalize(prompt || "");
  if (!text) return randomDesign();

  let best: SimuladorDesign | null = null;
  let bestScore = 0;
  for (const d of DEMO_DESIGNS) {
    let score = 0;
    for (const kw of d.keywords) {
      if (text.includes(normalize(kw))) score += 1;
    }
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best ?? randomDesign();
}

export function randomDesign(): SimuladorDesign {
  return DEMO_DESIGNS[Math.floor(Math.random() * DEMO_DESIGNS.length)];
}
