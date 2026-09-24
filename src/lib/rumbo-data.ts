export type StageId = "guardada" | "postulada" | "entrevista" | "oferta" | "rechazo";

export const stages: { id: StageId; label: string }[] = [
  { id: "guardada", label: "Guardada" },
  { id: "postulada", label: "Postulada" },
  { id: "entrevista", label: "Entrevista" },
  { id: "oferta", label: "Oferta" },
  { id: "rechazo", label: "Rechazo" },
];

export type Application = {
  id: string;
  company: string;
  role: string;
  match: number;
  stage: StageId;
  note?: string;
  location: string;
  salary: string;
  suggestions: string[];
};

export const initialApplications: Application[] = [
  {
    id: "nordwind",
    company: "Nordwind Analytics",
    role: "Data Engineer",
    match: 74,
    stage: "guardada",
    location: "Barcelona · Remoto",
    salary: "48.000–55.000 €",
    suggestions: [
      "Menciona tus proyectos con modelado dimensional.",
      "Resume tu experiencia en SQL avanzado en una línea.",
      "Añade el volumen de datos que has manejado.",
    ],
  },
  {
    id: "kestrel",
    company: "Kestrel Labs",
    role: "Backend Engineer",
    match: 61,
    stage: "guardada",
    location: "Valencia · Presencial",
    salary: "45.000–52.000 €",
    suggestions: [
      "Destaca las APIs que has diseñado desde cero.",
      "Incluye la experiencia con colas de mensajes.",
      "Acorta la sección de estudios para ganar espacio.",
    ],
  },
  {
    id: "vela",
    company: "Vela Systems",
    role: "Senior Data Engineer",
    match: 88,
    stage: "postulada",
    location: "Madrid · Remoto",
    salary: "55.000–65.000 €",
    suggestions: [
      "Sube tu experiencia en liderazgo técnico al principio.",
      "Cuantifica el ahorro de costes de tu última migración.",
      "Nombra la nube que usan en la oferta.",
    ],
  },
  {
    id: "bruma",
    company: "Bruma Cloud",
    role: "Data Platform",
    match: 79,
    stage: "postulada",
    location: "Sevilla · Híbrido",
    salary: "50.000–58.000 €",
    suggestions: [
      "Añade tu trabajo con infraestructura como código.",
      "Menciona la observabilidad de tus pipelines.",
      "Ajusta el resumen a la plataforma interna que describen.",
    ],
  },
  {
    id: "solara",
    company: "Solara Energy",
    role: "Staff Data Engineer",
    match: 93,
    stage: "entrevista",
    note: "Entrevista · mar 14:00",
    location: "Madrid · Híbrido",
    salary: "60.000–70.000 €",
    suggestions: [
      "Resalta tu experiencia con pipelines de datos en tiempo real.",
      "Añade métricas de impacto en la sección de logros.",
      "Incluye la herramienta de orquestación que piden.",
    ],
  },
  {
    id: "cobre",
    company: "Cobre Digital",
    role: "Data Engineer",
    match: 85,
    stage: "entrevista",
    note: "Técnica · jue 10:30",
    location: "Bilbao · Remoto",
    salary: "52.000–60.000 €",
    suggestions: [
      "Prepara un ejemplo de depuración de un pipeline caído.",
      "Menciona tus tests de calidad de datos.",
      "Recorta la experiencia anterior a 2018.",
    ],
  },
  {
    id: "almendra",
    company: "Almendra AI",
    role: "Lead Data Engineer",
    match: 96,
    stage: "oferta",
    note: "Oferta · 62.000 €",
    location: "Remoto · España",
    salary: "62.000 €",
    suggestions: [
      "Prepara tu contrapropuesta con datos del mercado.",
      "Pide por escrito el detalle de las acciones.",
      "Confirma el presupuesto de formación anual.",
    ],
  },
  {
    id: "piedra",
    company: "Piedra Software",
    role: "Data Engineer",
    match: 58,
    stage: "rechazo",
    location: "Zaragoza · Presencial",
    salary: "42.000–48.000 €",
    suggestions: [
      "Pide feedback concreto al reclutador.",
      "Refuerza tu portafolio con un caso público.",
      "Guarda la empresa para volver a intentarlo en 6 meses.",
    ],
  },
];

export const stageAccent: Record<StageId, string> = {
  guardada: "text-muted",
  postulada: "text-muted",
  entrevista: "text-accent",
  oferta: "text-good",
  rechazo: "text-bad",
};

export function nextStage(stage: StageId): StageId | null {
  const order: StageId[] = ["guardada", "postulada", "entrevista", "oferta"];
  const i = order.indexOf(stage);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1]!;
}
