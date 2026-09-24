import type { MatchAnalysisResult } from "./analyzer.functions";

export interface SavedAnalysisReport {
  id: string;
  timestamp: string; // ISO date string
  jobTitle: string;
  jobSnippet: string;
  jobDescriptionFull: string;
  cvMode: "text" | "pdf";
  cvTitle: string;
  cvText?: string;
  result: MatchAnalysisResult;
}

const STORAGE_KEY = "rumbo_analysis_history_v1";

export function extractJobTitle(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/^(puesto|vacante|rol|position|cargo|title):/i.test(line)) {
      return line
        .replace(/^[^:]+:\s*/i, "")
        .trim()
        .slice(0, 60);
    }
  }

  // Look for first prominent line without punctuation spam
  for (const line of lines) {
    if (line.length > 5 && line.length < 80 && !line.startsWith("http")) {
      return line.slice(0, 60);
    }
  }

  return lines[0]?.slice(0, 50) || "Vacante sin título";
}

export function formatReportDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Reciente";
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
      return `Hace ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    }
    if (diffDays === 1) {
      return "Ayer";
    }
    if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    }
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Reciente";
  }
}

const DEFAULT_SEEDED_REPORTS: SavedAnalysisReport[] = [
  {
    id: "sample-solara-data-eng",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    jobTitle: "Senior Data Engineer — Solara Cloud",
    jobSnippet:
      "Plataforma de analítica y streaming en tiempo real con Spark, Kafka, Snowflake y dbt...",
    jobDescriptionFull: `Puesto: Senior Data Engineer\nEmpresa: Solara Cloud Technologies (Remoto)\nRequisitos: 5+ años en Python, Apache Spark, Kafka, Snowflake, dbt, Airflow y Kubernetes.`,
    cvMode: "text",
    cvTitle: "CV Lucía Ferrer (Data Engineer)",
    cvText: `Lucía Ferrer - Senior Data Engineer con más de 5 años de experiencia diseñando pipelines de datos escalables (ETL/ELT), arquitecturas de lagos de datos y almacenes analíticos en la nube (AWS/GCP). Experta en Python, SQL avanzado, Apache Spark, dbt y orquestación con Apache Airflow.`,
    result: {
      matchPercentage: 84,
      matchVerdict:
        "Excelente alineación técnica en infraestructura de datos, Spark y dbt. Brecha menor en certificaciones AWS y observabilidad con herramientas tipo Monte Carlo.",
      matchingStrengths: [
        "Dominio demostrado de Python, SQL avanzado y Apache Spark procesando más de 8 TB/día.",
        "Experiencia en migraciones a Snowflake y dbt con optimización del 42% en tiempos de consulta.",
        "Orquestación probada con Apache Airflow / MWAA y contenedores Docker.",
      ],
      criticalGaps: [
        "Falta mención de experiencia en observabilidad de datos con herramientas tipo Monte Carlo o DataHub.",
        "No se especifica certificación oficial en AWS o Snowflake SnowPro.",
      ],
      suggestedKeywords: [
        {
          keyword: "Data Observability / Monte Carlo",
          category: "Gobernanza y Calidad",
          importance: "crítica",
          action: "Menciona prácticas de monitoreo de datos y linaje en tu rol en DataSphere.",
        },
        {
          keyword: "Kubernetes (K8s)",
          category: "Infraestructura",
          importance: "crítica",
          action: "Destaca si ejecutaste Airflow o cargas Spark sobre clústeres Kubernetes.",
        },
        {
          keyword: "Data Vault 2.0",
          category: "Arquitectura de Datos",
          importance: "recomendada",
          action: "Añade metodologías de modelado analítico empleadas con dbt.",
        },
      ],
      actionPlan: [
        "Añadir una viñeta sobre observabilidad y linaje de datos en la experiencia más reciente.",
        "Explicitar el despliegue y ejecución de pipelines sobre entornos orquestados con Kubernetes.",
        "Destacar el nivel de inglés técnico y profesional en el resumen inicial.",
      ],
    },
  },
  {
    id: "sample-fintech-analytics",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    jobTitle: "Analytics Engineer — Neobank Global",
    jobSnippet: "Modelado semántico, métricas de retención, dbt Core, BigQuery y Tableau...",
    jobDescriptionFull: `Puesto: Analytics Engineer\nEmpresa: Neobank Global\nRequisitos: SQL experto, BigQuery, dbt, Looker/Tableau y métricas de producto financiero.`,
    cvMode: "text",
    cvTitle: "CV Lucía Ferrer (Versión Analytics)",
    result: {
      matchPercentage: 91,
      matchVerdict:
        "Alineación casi perfecta en stack analítico (BigQuery, dbt, Tableau) y modelado dimensional Kimball.",
      matchingStrengths: [
        "Historial sólido con BigQuery y desarrollo de modelos dimensionales Kimball en Kestrel.",
        "Dominio avanzado de dbt y Tableau con más de 200 usuarios activos.",
      ],
      criticalGaps: [
        "La vacante enfatiza métricas de cohorts y churn en fintech; se recomienda detallar el impacto financiero de los modelos.",
      ],
      suggestedKeywords: [
        {
          keyword: "Semantic Layer / Métricas Centralizadas",
          category: "BI & Analytics",
          importance: "recomendada",
          action: "Enfatizar la definición de métricas únicas de negocio en dbt.",
        },
        {
          keyword: "Cohorts & Churn Analysis",
          category: "Fintech Analytics",
          importance: "recomendada",
          action: "Mencionar el cálculo de métricas financieras de recurrencia en el CV.",
        },
      ],
      actionPlan: [
        "Cuantificar el impacto de los dashboards en la toma de decisiones estratégicas.",
        "Resaltar el trabajo en conjunto con equipos de producto y analítica de negocio.",
      ],
    },
  },
];

export function getSavedReports(): SavedAnalysisReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEEDED_REPORTS));
      return DEFAULT_SEEDED_REPORTS;
    }
    const parsed = JSON.parse(raw) as SavedAnalysisReport[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error("Error loading analysis history from localStorage:", e);
    return [];
  }
}

export function saveAnalysisReport(
  data: Omit<SavedAnalysisReport, "id" | "timestamp">,
): SavedAnalysisReport {
  const newReport: SavedAnalysisReport = {
    ...data,
    id: `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window === "undefined") return newReport;

  try {
    const current = getSavedReports();
    const updated = [newReport, ...current.filter((r) => r.id !== newReport.id)].slice(0, 40);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving analysis report to localStorage:", e);
  }

  return newReport;
}

export function deleteAnalysisReport(id: string): SavedAnalysisReport[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getSavedReports();
    const updated = current.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Error deleting analysis report from localStorage:", e);
    return [];
  }
}

export function clearAllAnalysisReports(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Error clearing analysis reports from localStorage:", e);
  }
}
