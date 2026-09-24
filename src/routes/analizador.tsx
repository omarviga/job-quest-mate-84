import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Lightbulb,
  Percent,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import avatarLucia from "@/assets/avatar-lucia.jpg";
import {
  clearAllAnalysisReports,
  deleteAnalysisReport,
  extractJobTitle,
  formatReportDate,
  getSavedReports,
  type SavedAnalysisReport,
  saveAnalysisReport,
} from "@/lib/analyzer-history";
import {
  analyzeCvMatch,
  type KeywordSuggestion,
  type MatchAnalysisResult,
} from "@/lib/analyzer.functions";
import { exportAnalysisToPdf } from "@/lib/export-pdf";

export const Route = createFileRoute("/analizador")({
  head: () => ({
    meta: [
      { title: "Analizador de Coincidencia CV vs. Vacante — RUMBO" },
      {
        name: "description",
        content:
          "Analiza el porcentaje de coincidencia entre tu currículum y la vacante con IA de Gemini. Guarda tu historial de reportes y sugerencias de palabras clave.",
      },
      { property: "og:title", content: "Analizador de Coincidencia CV vs. Vacante — RUMBO" },
      {
        property: "og:description",
        content:
          "Descubre tu porcentaje de coincidencia, historial de evaluaciones y las palabras clave que necesita tu CV para superar los filtros de selección.",
      },
    ],
  }),
  component: AnalizadorPage,
});

const labelClass = "font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

const SAMPLE_CV = `Lucía Ferrer
lucia.ferrer@email.com | +34 612 345 678 | Madrid, España | linkedin.com/in/luciaferrer

RESUMEN PROFESIONAL
Data Engineer con más de 5 años de experiencia diseñando, construyendo y optimizando pipelines de datos escalables (ETL/ELT), arquitecturas de lagos de datos (Data Lakehouse) y almacenes analíticos en la nube (AWS/GCP). Experta en Python, SQL avanzado, Apache Spark, dbt y orquestación con Apache Airflow. Orientada a la confiabilidad de datos y reducción de latencia en modelos de analítica y machine learning.

EXPERIENCIA LABORAL
Senior Data Engineer | DataSphere Corp (Madrid / Remoto) | 2022 - Actualidad
- Diseñé e implementé pipelines de ingesta en tiempo real y batch procesando más de 8 TB diarios utilizando Apache Spark, Kafka y AWS (S3, EMR, Redshift).
- Migré modelos analíticos a dbt y Snowflake, reduciendo los tiempos de ejecución de consultas en un 42% y los costos de cómputo en un 28%.
- Implementé controles de calidad de datos automatizados con Great Expectations y orquestación integral con Airflow / MWAA.

Data Engineer | Kestrel Analytics (Barcelona) | 2019 - 2022
- Construí pipelines ETL con Python y PySpark sobre Google Cloud Platform (BigQuery, Cloud Storage, Dataflow).
- Desarrollé modelos dimensionales (Kimball) para soportar dashboards de BI en Tableau y Looker con más de 200 usuarios activos.
- Colaboré con científicos de datos para desplegar características para modelos predictivos de churn y detección de anomalías.

HABILIDADES TÉCNICAS
- Lenguajes: Python, SQL (PostgreSQL, BigQuery, Snowflake), Bash
- Big Data & Procesamiento: Apache Spark (PySpark), Kafka, Databricks
- Orquestación & CI/CD: Apache Airflow, dbt, Docker, Git, Terraform
- Cloud Platforms: AWS (S3, EMR, Lambda, Redshift, Glue), GCP (BigQuery, Dataflow)
- Calidad de Datos & Pruebas: Great Expectations, Pytest

EDUCACIÓN
Grado en Ingeniería Informática | Universidad Politécnica de Madrid (2015 - 2019)`;

const SAMPLE_JOB_DATA = `Puesto: Senior Data Engineer
Empresa: Solara Cloud Technologies (Remoto)

Acerca del rol:
Buscamos un Senior Data Engineer apasionado por la infraestructura de datos moderna para liderar el diseño y evolución de nuestra plataforma de analítica y streaming en tiempo real.

Responsabilidades:
- Diseñar, construir y mantener pipelines de datos robustos y tolerantes a fallos utilizando Apache Spark, Kafka y Snowflake.
- Modelar datos analíticos en Snowflake utilizando dbt bajo metodologías dimensionales y Data Vault 2.0.
- Orquestar flujos de trabajo complejos con Apache Airflow y Kubernetes.
- Implementar infraestructura como código con Terraform en AWS.
- Definir estándares de gobernanza, linaje de datos y observabilidad con DataHub y Monte Carlo.
- Colaborar estrechamente con equipos de Machine Learning y Product Analytics.

Requisitos mínimos:
- 5+ años de experiencia comprobable como Data Engineer o Data Platform Engineer.
- Dominio experto de Python y SQL avanzado (optimización de queries, particionamiento, clustering).
- Experiencia sólida con procesamiento distribuido en Apache Spark (PySpark) y streaming con Kafka.
- Experiencia en Snowflake y modelado con dbt.
- Experiencia con orquestación moderna (Airflow, Dagster o Prefect) y contenedores (Docker, Kubernetes).
- Familiaridad con AWS (S3, IAM, ECS/EKS).
- Nivel de inglés profesional (conversacional y técnico).

Requisitos deseables:
- Certificación oficial en AWS (Data Analytics Specialty) o Snowflake SnowPro.
- Experiencia previa con Kubernetes e infraestructura con Terraform.
- Conocimiento de prácticas de MLOps y feature stores (Feast).`;

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMatchTheme(percentage: number) {
  if (percentage >= 80) {
    return {
      textColor: "text-good",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      badgeColor: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      label: "Alta compatibilidad",
    };
  }
  if (percentage >= 60) {
    return {
      textColor: "text-warn",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      label: "Compatibilidad media",
    };
  }
  return {
    textColor: "text-bad",
    bgColor: "bg-rose-500/10 border-rose-500/20",
    badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    label: "Brechas importantes",
  };
}

function AnalizadorPage() {
  const runAnalysis = useServerFn(analyzeCvMatch);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"nuevo" | "historial">("nuevo");

  // Form State
  const [jobDescription, setJobDescription] = useState("");
  const [cvMode, setCvMode] = useState<"text" | "pdf">("text");
  const [cvText, setCvText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Running state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MatchAnalysisResult | null>(null);
  const [currentJobTitle, setCurrentJobTitle] = useState("");

  // History state
  const [history, setHistory] = useState<SavedAnalysisReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedAnalysisReport | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");

  // History Search & Filter
  const [historySearch, setHistorySearch] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"todos" | "alta" | "media" | "baja">("todos");

  // Clipboard copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Load history on mount
  useEffect(() => {
    setHistory(getSavedReports());
  }, []);

  // Summary Metrics calculated from History
  const historyMetrics = useMemo(() => {
    if (history.length === 0) {
      return { total: 0, avgScore: 0, maxScore: 0, totalKeywords: 0 };
    }
    const total = history.length;
    const sum = history.reduce((acc, r) => acc + r.result.matchPercentage, 0);
    const avgScore = Math.round(sum / total);
    const maxScore = Math.max(...history.map((r) => r.result.matchPercentage));
    const uniqueKeywords = new Set<string>();
    history.forEach((r) => {
      r.result.suggestedKeywords?.forEach((k) => uniqueKeywords.add(k.keyword.toLowerCase()));
    });
    return {
      total,
      avgScore,
      maxScore,
      totalKeywords: uniqueKeywords.size,
    };
  }, [history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesSearch =
        item.jobTitle.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.jobSnippet.toLowerCase().includes(historySearch.toLowerCase()) ||
        item.result.suggestedKeywords.some((k) =>
          k.keyword.toLowerCase().includes(historySearch.toLowerCase()),
        );

      if (!matchesSearch) return false;

      if (scoreFilter === "alta") return item.result.matchPercentage >= 80;
      if (scoreFilter === "media")
        return item.result.matchPercentage >= 60 && item.result.matchPercentage < 80;
      if (scoreFilter === "baja") return item.result.matchPercentage < 60;
      return true;
    });
  }, [history, historySearch, scoreFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSavedSuccessMsg("");

    if (!jobDescription.trim()) {
      setError("Por favor introduce la descripción del puesto.");
      return;
    }

    if (cvMode === "text" && !cvText.trim()) {
      setError("Por favor pega el texto de tu currículum o sube un archivo PDF.");
      return;
    }

    if (cvMode === "pdf" && !pdfFile) {
      setError("Por favor selecciona un archivo PDF de tu currículum.");
      return;
    }

    setLoading(true);
    setResult(null);

    const detectedTitle = extractJobTitle(jobDescription);
    setCurrentJobTitle(detectedTitle);

    try {
      const pdfBase64 = cvMode === "pdf" && pdfFile ? await toBase64(pdfFile) : null;
      const res = await runAnalysis({
        data: {
          jobDescription: jobDescription.trim(),
          cvText: cvMode === "text" ? cvText.trim() : null,
          pdfBase64,
        },
      });

      setResult(res);

      // Auto-save to localStorage
      const newSaved = saveAnalysisReport({
        jobTitle: detectedTitle,
        jobSnippet: jobDescription.slice(0, 160).replace(/\s+/g, " ") + "...",
        jobDescriptionFull: jobDescription,
        cvMode,
        cvTitle:
          cvMode === "pdf" && pdfFile
            ? pdfFile.name
            : cvText.split("\n")[0]?.slice(0, 40) || "CV en Texto",
        cvText: cvMode === "text" ? cvText : undefined,
        result: res,
      });

      // Update history in state
      setHistory((prev) => [newSaved, ...prev.filter((r) => r.id !== newSaved.id)]);
      setSavedSuccessMsg("Reporte guardado automáticamente en tu historial local.");

      setTimeout(() => {
        document.getElementById("resultados-analisis")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al analizar con Gemini. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        setError("Solo se admiten archivos PDF.");
        return;
      }
      setPdfFile(file);
      setError("");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        setError("Solo se admiten archivos PDF.");
        return;
      }
      setPdfFile(file);
      setError("");
    }
  }

  function copyKeyword(kw: string) {
    navigator.clipboard.writeText(kw);
    setCopiedKey(kw);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  function copyAllKeywords(keywords: KeywordSuggestion[]) {
    if (!keywords || keywords.length === 0) return;
    const list = keywords.map((k) => `• ${k.keyword} (${k.category}) — ${k.action}`).join("\n");
    navigator.clipboard.writeText(list);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function handleLoadReportIntoForm(report: SavedAnalysisReport) {
    setJobDescription(report.jobDescriptionFull);
    if (report.cvText) {
      setCvMode("text");
      setCvText(report.cvText);
    }
    setResult(report.result);
    setCurrentJobTitle(report.jobTitle);
    setSelectedReport(null);
    setActiveTab("nuevo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteReport(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = deleteAnalysisReport(id);
    setHistory(updated);
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
  }

  function handleClearAllHistory() {
    if (
      window.confirm("¿Estás seguro de que deseas vaciar todo el historial de análisis guardados?")
    ) {
      clearAllAnalysisReports();
      setHistory([]);
      setSelectedReport(null);
    }
  }

  const [exportingPdf, setExportingPdf] = useState(false);

  function handleExportPdf(
    reportTitle: string,
    reportResult: MatchAnalysisResult,
    dateStr?: string,
  ) {
    try {
      setExportingPdf(true);
      exportAnalysisToPdf({
        jobTitle: reportTitle,
        candidateName: "Lucía Ferrer",
        dateStr,
        result: reportResult,
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink font-display">
      <div className="mx-auto max-w-[1440px] px-5 py-5">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface ring-1 ring-black/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground font-mono text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              R
            </Link>
            <div className="leading-tight">
              <Link to="/" className="text-[15px] font-semibold tracking-tight hover:underline">
                RUMBO
              </Link>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Centro de control
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              to="/"
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors"
            >
              Tablero
            </Link>
            <Link
              to="/empleos"
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors"
            >
              Vacantes para mi CV
            </Link>
            <Link
              to="/analizador"
              className="px-3 py-1.5 text-xs font-semibold text-accent-foreground bg-accent rounded-md shadow-xs transition-colors"
            >
              Analizador de Coincidencia
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold">Lucía Ferrer</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Data Engineer
              </div>
            </div>
            <img
              src={avatarLucia}
              alt="Lucía Ferrer"
              width={36}
              height={36}
              className="size-9 rounded-full object-cover outline-1 -outline-offset-1 outline-black/5"
            />
          </div>
        </header>

        {/* Hero Section */}
        <section className="mt-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs text-muted mb-2 font-mono">
                <span>IA de Gemini</span>
                <span aria-hidden="true">·</span>
                <span>Memoria Local</span>
                <span aria-hidden="true">·</span>
                <span>Optimización ATS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
                Analizador de Coincidencia CV vs. Vacante
              </h1>
              <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
                Evalúa tu currículum contra cualquier vacante con Google Gemini, descubre tu
                puntuación de afinidad, consulta sugerencias de palabras clave y revisa tu historial
                guardado en tu dispositivo.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-surface border border-line rounded-xl p-1 shadow-xs shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("nuevo");
                  setSelectedReport(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "nuevo" && !selectedReport
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>Nuevo Análisis</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("historial")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "historial" || selectedReport
                    ? "bg-accent text-accent-foreground shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                <History className="size-3.5" />
                <span>Historial de Evaluaciones</span>
                <span className="font-mono text-[10px] bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
                  {history.length}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VIEW 1: NUEVO ANÁLISIS */}
        {/* ========================================================================= */}
        {activeTab === "nuevo" && !selectedReport && (
          <div className="space-y-6">
            {/* Quick stats mini-banner */}
            {history.length > 0 && (
              <div className="rounded-xl bg-surface/70 border border-line px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <History className="size-3.5 text-accent" />
                    <strong className="text-ink font-mono">{history.length}</strong> análisis
                    guardados en memoria
                  </span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Coincidencia promedio:{" "}
                    <strong className="text-ink font-mono">{historyMetrics.avgScore}%</strong>
                  </span>
                  <span className="hidden sm:inline" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    Mejor match:{" "}
                    <strong className="text-good font-mono">{historyMetrics.maxScore}%</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("historial")}
                  className="font-medium text-accent hover:underline flex items-center gap-1"
                >
                  <span>Ver historial completo</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>
            )}

            {/* Main Form */}
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
            >
              {/* Column 1: Job Description */}
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={labelClass}>Paso 1</span>
                    <h2 className="text-lg font-semibold text-ink">Descripción de la Vacante</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJobDescription(SAMPLE_JOB_DATA)}
                    className="text-xs font-mono font-medium text-accent hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="size-3.5" />
                    Cargar ejemplo
                  </button>
                </div>

                <p className="text-xs text-muted">
                  Pega aquí el texto completo de la oferta de empleo: requisitos mínimos,
                  tecnologías, responsabilidades y habilidades deseadas.
                </p>

                <div className="relative">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Pega aquí la descripción del puesto (requisitos, tecnologías, experiencia requerida)..."
                    rows={13}
                    className="w-full rounded-xl bg-background border border-line p-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent font-sans leading-relaxed resize-y"
                  />
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-muted">
                    <span>{jobDescription.length.toLocaleString()} caracteres</span>
                    {jobDescription && (
                      <button
                        type="button"
                        onClick={() => setJobDescription("")}
                        className="hover:text-destructive transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Candidate CV */}
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={labelClass}>Paso 2</span>
                    <h2 className="text-lg font-semibold text-ink">Tu Currículum</h2>
                  </div>

                  {/* Toggle CV mode */}
                  <div className="flex items-center bg-background rounded-lg p-1 border border-line">
                    <button
                      type="button"
                      onClick={() => setCvMode("text")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        cvMode === "text"
                          ? "bg-surface text-ink shadow-xs"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCvMode("pdf")}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        cvMode === "pdf"
                          ? "bg-surface text-ink shadow-xs"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Archivo PDF
                    </button>
                  </div>
                </div>

                {cvMode === "text" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted">
                        Pega el contenido en texto de tu CV (experiencia, habilidades, estudios).
                      </p>
                      <button
                        type="button"
                        onClick={() => setCvText(SAMPLE_CV)}
                        className="text-xs font-mono font-medium text-accent hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Sparkles className="size-3.5" />
                        Cargar CV de Lucía
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        value={cvText}
                        onChange={(e) => setCvText(e.target.value)}
                        placeholder="Pega aquí el contenido de tu CV (experiencia, tecnologías, educación)..."
                        rows={13}
                        className="w-full rounded-xl bg-background border border-line p-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent font-sans leading-relaxed resize-y"
                      />
                      <div className="flex items-center justify-between mt-1 text-[11px] font-mono text-muted">
                        <span>{cvText.length.toLocaleString()} caracteres</span>
                        {cvText && (
                          <button
                            type="button"
                            onClick={() => setCvText("")}
                            className="hover:text-destructive transition-colors"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-muted">
                      Sube tu archivo PDF. La IA de Gemini leerá y analizará directamente el
                      documento sin pérdida de formato.
                    </p>

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                        isDragging
                          ? "border-accent bg-accent/5"
                          : "border-line bg-background hover:border-muted"
                      }`}
                    >
                      <input
                        type="file"
                        id="cv-pdf-upload"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {pdfFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center">
                            <FileText className="size-6" />
                          </div>
                          <div className="font-medium text-sm text-ink">{pdfFile.name}</div>
                          <div className="text-xs font-mono text-muted">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB · Listo para analizar
                          </div>
                          <div className="flex gap-2 mt-2">
                            <label
                              htmlFor="cv-pdf-upload"
                              className="px-3 py-1.5 text-xs font-medium text-ink bg-surface border border-line rounded-lg cursor-pointer hover:bg-background"
                            >
                              Cambiar archivo
                            </label>
                            <button
                              type="button"
                              onClick={() => setPdfFile(null)}
                              className="px-3 py-1.5 text-xs font-medium text-destructive bg-surface border border-line rounded-lg hover:bg-background"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="cv-pdf-upload"
                          className="cursor-pointer flex flex-col items-center gap-2"
                        >
                          <div className="size-12 rounded-full bg-surface border border-line grid place-items-center text-muted">
                            <Upload className="size-5" />
                          </div>
                          <div className="text-sm font-medium text-ink">
                            Haz clic para seleccionar o arrastra tu PDF aquí
                          </div>
                          <div className="text-xs text-muted">Documentos PDF de hasta 10 MB</div>
                        </label>
                      )}
                    </div>

                    <div className="rounded-lg bg-surface border border-line p-3 text-xs text-muted flex items-start gap-2">
                      <Lightbulb className="size-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        Gemini analiza la estructura visual y semántica del PDF directamente para
                        extraer habilidades y cronología con máxima precisión.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions / Submit Banner */}
              <div className="lg:col-span-2 rounded-2xl bg-surface ring-1 ring-black/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted">
                  {cvMode === "pdf" && pdfFile
                    ? `Archivo cargado: ${pdfFile.name}`
                    : cvMode === "text" && cvText
                      ? `CV cargado: ${cvText.split("\n")[0] || "Texto listo"}`
                      : "Introduce la vacante y tu currículum para comenzar."}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-accent-foreground px-6 py-3 font-semibold text-sm shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Analizando con Gemini IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      <span>Analizar Coincidencia y Palabras Clave</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Error Alert */}
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-destructive flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0" />
                <div className="flex-1">{error}</div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="text-muted hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            {/* Results Section */}
            {result && (
              <ReportDetailSection
                title={currentJobTitle || "Análisis Reciente"}
                dateLabel="Recién generado"
                result={result}
                savedNotice={savedSuccessMsg}
                copiedKey={copiedKey}
                copiedAll={copiedAll}
                onCopyKey={copyKeyword}
                onCopyAll={copyAllKeywords}
                onExportPdf={() =>
                  handleExportPdf(currentJobTitle || "Análisis Reciente", result, "Recién generado")
                }
                isExporting={exportingPdf}
                onNewAnalysis={() => {
                  setResult(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onViewHistory={() => setActiveTab("historial")}
              />
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: HISTORIAL DE EVALUACIONES */}
        {/* ========================================================================= */}
        {activeTab === "historial" && !selectedReport && (
          <div className="space-y-6 rise">
            {/* KPI Performance Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-1">
                <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wider">
                  <History className="size-3.5" />
                  <span>Análisis guardados</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                  {historyMetrics.total}
                </div>
                <div className="text-[11px] text-muted">Registros en localStorage</div>
              </div>

              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-1">
                <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wider">
                  <BarChart3 className="size-3.5" />
                  <span>Afinidad media</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                  {historyMetrics.avgScore}%
                </div>
                <div className="text-[11px] text-muted">Promedio de tus vacantes</div>
              </div>

              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-1">
                <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wider">
                  <TrendingUp className="size-3.5 text-good" />
                  <span>Mejor resultado</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-good">
                  {historyMetrics.maxScore}%
                </div>
                <div className="text-[11px] text-muted">Mayor coincidencia lograda</div>
              </div>

              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-1">
                <div className="flex items-center gap-1.5 text-muted text-xs font-mono uppercase tracking-wider">
                  <Sparkles className="size-3.5 text-accent" />
                  <span>Palabras clave</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-accent">
                  {historyMetrics.totalKeywords}
                </div>
                <div className="text-[11px] text-muted">Términos únicos sugeridos</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="size-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar por puesto, empresa o palabra clave..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border border-line text-xs sm:text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center bg-background rounded-lg p-1 border border-line text-xs">
                  <button
                    type="button"
                    onClick={() => setScoreFilter("todos")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      scoreFilter === "todos"
                        ? "bg-surface text-ink font-semibold shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreFilter("alta")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      scoreFilter === "alta"
                        ? "bg-surface text-good font-semibold shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    ≥80% Alta
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreFilter("media")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      scoreFilter === "media"
                        ? "bg-surface text-warn font-semibold shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    60–79% Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setScoreFilter("baja")}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      scoreFilter === "baja"
                        ? "bg-surface text-bad font-semibold shadow-xs"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    &lt;60% Baja
                  </button>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-line text-xs text-muted hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Vaciar historial</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reports List */}
            {filteredHistory.length > 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((report) => {
                  const theme = getMatchTheme(report.result.matchPercentage);
                  return (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className="group rounded-2xl bg-surface ring-1 ring-black/5 hover:ring-accent/40 p-5 sm:p-6 transition-all cursor-pointer space-y-4 hover:shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-mono text-xs px-2.5 py-0.5 rounded-md border font-bold ${theme.badgeColor}`}
                            >
                              {report.result.matchPercentage}% COINCIDENCIA
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-mono text-muted">
                              <Clock className="size-3" />
                              {formatReportDate(report.timestamp)}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-background border border-line text-muted">
                              {report.cvMode === "pdf" ? "PDF" : "Texto"}: {report.cvTitle}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-ink group-hover:text-accent transition-colors truncate">
                            {report.jobTitle}
                          </h3>

                          <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                            {report.result.matchVerdict}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPdf(
                                report.jobTitle,
                                report.result,
                                formatReportDate(report.timestamp),
                              );
                            }}
                            className="p-1.5 rounded-lg border border-line bg-background text-muted hover:text-accent hover:border-accent/40 transition-colors"
                            title="Descargar reporte y sugerencias de palabras clave en PDF"
                          >
                            <Download className="size-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLoadReportIntoForm(report);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-line bg-background text-ink hover:bg-surface text-xs font-medium transition-colors"
                            title="Cargar esta descripción y CV en el formulario de análisis"
                          >
                            Cargar en formulario
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteReport(report.id, e)}
                            className="p-1.5 rounded-lg text-muted hover:text-destructive hover:bg-rose-500/10 transition-colors"
                            title="Eliminar del historial"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Keywords Preview Bar */}
                      {report.result.suggestedKeywords &&
                        report.result.suggestedKeywords.length > 0 && (
                          <div className="border-t border-line/60 pt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-mono text-muted uppercase tracking-wider shrink-0">
                              Palabras clave sugeridas:
                            </span>
                            {report.result.suggestedKeywords.slice(0, 4).map((kw, idx) => (
                              <span
                                key={idx}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${
                                  kw.importance === "crítica"
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold"
                                    : "bg-surface border border-line text-ink/80"
                                }`}
                              >
                                {kw.keyword}
                              </span>
                            ))}
                            {report.result.suggestedKeywords.length > 4 && (
                              <span className="text-[10px] font-mono text-muted">
                                +{report.result.suggestedKeywords.length - 4} más
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-12 text-center space-y-4">
                <div className="size-12 rounded-full bg-accent/10 text-accent grid place-items-center mx-auto">
                  <History className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {historySearch || scoreFilter !== "todos"
                      ? "No se encontraron análisis con estos filtros"
                      : "Aún no tienes análisis guardados"}
                  </h3>
                  <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                    {historySearch || scoreFilter !== "todos"
                      ? "Prueba cambiando tu búsqueda o limpiando los filtros de puntuación."
                      : "Ejecuta tu primer análisis en el formulario y se guardará automáticamente en este dispositivo."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch("");
                    setScoreFilter("todos");
                    setActiveTab("nuevo");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="size-3.5" />
                  <span>Realizar un análisis ahora</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DETALLE DE REPORTE SELECCIONADO DESDE EL HISTORIAL */}
        {/* ========================================================================= */}
        {selectedReport && (
          <div className="space-y-6 rise">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                ← Volver al listado de historial
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    handleExportPdf(
                      selectedReport.jobTitle,
                      selectedReport.result,
                      formatReportDate(selectedReport.timestamp),
                    )
                  }
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-surface border border-line text-ink hover:bg-background transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Descargar este reporte y palabras clave en PDF"
                >
                  <Download className="size-3.5 text-accent" />
                  <span>Descargar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleLoadReportIntoForm(selectedReport)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-surface border border-line text-ink hover:bg-background transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="size-3.5 text-accent" />
                  <span>Cargar datos en el formulario</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteReport(selectedReport.id, e)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-destructive/30 text-destructive hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <ReportDetailSection
              title={selectedReport.jobTitle}
              dateLabel={`Guardado ${formatReportDate(selectedReport.timestamp)}`}
              result={selectedReport.result}
              copiedKey={copiedKey}
              copiedAll={copiedAll}
              onCopyKey={copyKeyword}
              onCopyAll={copyAllKeywords}
              onExportPdf={() =>
                handleExportPdf(
                  selectedReport.jobTitle,
                  selectedReport.result,
                  formatReportDate(selectedReport.timestamp),
                )
              }
              isExporting={exportingPdf}
              onNewAnalysis={() => {
                setSelectedReport(null);
                setActiveTab("nuevo");
              }}
              onViewHistory={() => setSelectedReport(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface ReportDetailSectionProps {
  title: string;
  dateLabel: string;
  result: MatchAnalysisResult;
  savedNotice?: string;
  copiedKey: string | null;
  copiedAll: boolean;
  onCopyKey: (kw: string) => void;
  onCopyAll: (kws: KeywordSuggestion[]) => void;
  onExportPdf?: () => void;
  isExporting?: boolean;
  onNewAnalysis: () => void;
  onViewHistory: () => void;
}

function ReportDetailSection({
  title,
  dateLabel,
  result,
  savedNotice,
  copiedKey,
  copiedAll,
  onCopyKey,
  onCopyAll,
  onExportPdf,
  isExporting = false,
  onNewAnalysis,
  onViewHistory,
}: ReportDetailSectionProps) {
  const theme = getMatchTheme(result.matchPercentage);

  return (
    <section id="resultados-analisis" className="mt-8 space-y-6 rise">
      <div className="border-t border-line pt-6">
        {/* Title Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={labelClass}>Reporte de compatibilidad</span>
              <span className="text-[11px] font-mono text-muted">· {dateLabel}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink mt-0.5">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onExportPdf && (
              <button
                type="button"
                onClick={onExportPdf}
                disabled={isExporting}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-line text-ink hover:bg-background transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Descargar reporte completo y sugerencias de palabras clave en PDF"
              >
                <Download className="size-3.5 text-accent" />
                <span>{isExporting ? "Generando..." : "Descargar PDF"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onViewHistory}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-line text-ink hover:bg-background transition-colors flex items-center gap-1.5"
            >
              <History className="size-3.5 text-muted" />
              <span>Ver Historial</span>
            </button>
            <button
              type="button"
              onClick={onNewAnalysis}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Nuevo Análisis
            </button>
          </div>
        </div>

        {savedNotice && (
          <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Main Score & Verdict Card */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${theme.bgColor}`}
        >
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted">
              <Percent className="size-4" />
              <span>Nivel de compatibilidad estimado</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-ink">
              {result.matchPercentage >= 80
                ? "¡Alta coincidencia para este puesto!"
                : result.matchPercentage >= 60
                  ? "Coincidencia moderada con potencial de optimización"
                  : "Brechas significativas detectadas"}
            </h3>
            <p className="text-sm text-ink/80 leading-relaxed">{result.matchVerdict}</p>
          </div>

          <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-surface/90 border border-line min-w-[160px] text-center shrink-0">
            <div className={`text-5xl font-mono font-bold tabular-nums ${theme.textColor}`}>
              {result.matchPercentage}%
            </div>
            <div className="text-[11px] font-mono text-muted uppercase tracking-wider mt-1">
              Match Score
            </div>
          </div>
        </div>

        {/* Suggested Keywords Section (User's primary request) */}
        <div className="mt-6 rounded-2xl bg-surface ring-1 ring-black/5 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className={labelClass}>Recomendaciones ATS</span>
              <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                Palabras Clave Sugeridas para Optimizar tu CV
              </h3>
              <p className="text-xs text-muted mt-1">
                Términos, tecnologías y competencias críticas presentes en la vacante que debes
                incluir o enfatizar.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-line px-3.5 py-2 text-xs font-mono font-medium text-ink hover:bg-surface transition-colors shadow-xs"
                  title="Descargar este reporte y palabras clave como PDF"
                >
                  <Download className="size-3.5 text-accent" />
                  <span>Descargar en PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onCopyAll(result.suggestedKeywords)}
                className="inline-flex items-center gap-2 rounded-lg bg-background border border-line px-3.5 py-2 text-xs font-mono font-medium text-ink hover:bg-surface transition-colors"
              >
                <Copy className="size-3.5" />
                {copiedAll ? "¡Copiadas!" : "Copiar todas"}
              </button>
            </div>
          </div>

          {result.suggestedKeywords && result.suggestedKeywords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.suggestedKeywords.map((kw: KeywordSuggestion) => (
                <div
                  key={kw.keyword}
                  className="rounded-xl border border-line bg-background p-4 flex flex-col justify-between gap-3 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-ink">{kw.keyword}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            kw.importance === "crítica"
                              ? "bg-rose-500/10 text-rose-600 font-semibold"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {kw.importance === "crítica" ? "Crítica" : "Recomendada"}
                        </span>
                      </div>
                      <div className="text-xs text-muted mt-0.5 font-mono">{kw.category}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCopyKey(kw.keyword)}
                      title="Copiar palabra clave"
                      className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface transition-colors"
                    >
                      {copiedKey === kw.keyword ? (
                        <CheckCircle2 className="size-4 text-good" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-ink/80 leading-relaxed bg-surface rounded-lg p-2.5 border border-line/60">
                    {kw.action}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              No se detectaron palabras clave faltantes indispensables.
            </p>
          )}
        </div>

        {/* Strengths vs Gaps 2-Column Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fortalezas */}
          <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-good shrink-0" />
              <div>
                <span className={labelClass}>Alineación actual</span>
                <h4 className="text-base font-bold text-ink">Fortalezas detectadas</h4>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-ink/90">
              {result.matchingStrengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-good font-bold">✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Brechas críticas */}
          <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-warn shrink-0" />
              <div>
                <span className={labelClass}>Puntos ciegos</span>
                <h4 className="text-base font-bold text-ink">Requisitos o brechas a cubrir</h4>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm text-ink/90">
              {result.criticalGaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="text-warn font-bold">!</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Plan */}
        <div className="mt-6 rounded-2xl bg-surface ring-1 ring-black/5 p-6 sm:p-8 space-y-4">
          <span className={labelClass}>Estrategia de postulación</span>
          <h3 className="text-lg font-bold text-ink">
            Plan de acción para elevar tu porcentaje de coincidencia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {result.actionPlan.map((step, idx) => (
              <div key={idx} className="rounded-xl bg-background border border-line p-4 space-y-2">
                <div className="font-mono text-xs font-bold text-accent">0{idx + 1}.</div>
                <p className="text-xs text-ink/90 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-muted">
              ¿Quieres ver vacantes reales con puntuación automática?
            </span>
            <Link
              to="/empleos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
            >
              <span>Explorar vacantes afines a mi CV</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
