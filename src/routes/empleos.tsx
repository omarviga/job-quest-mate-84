import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  buildMexicanPortalUrls,
  type JobMatch,
  type JobSearchResult,
  MEXICAN_REGIONS,
  searchJobsForCv,
  tailorCv,
} from "@/lib/jobs.functions";

export const Route = createFileRoute("/empleos")({
  head: () => ({
    meta: [
      { title: "Vacantes en México (CompuTrabajo, OCC, Indeed) — RUMBO" },
      {
        name: "description",
        content:
          "Encuentra vacantes en México en CompuTrabajo, OCCMundial, Indeed y LinkedIn ordenadas por coincidencia con tu CV.",
      },
      {
        property: "og:title",
        content: "Vacantes en México para tu CV — RUMBO",
      },
      {
        property: "og:description",
        content:
          "Búsqueda de empleo exclusiva en México integrada con CompuTrabajo y OCCMundial con puntuación de coincidencia por IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Empleos,
});

const label = "font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

function toBase64(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function Empleos() {
  const navigate = useNavigate();
  const search = useServerFn(searchJobsForCv);
  const tailor = useServerFn(tailorCv);

  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState("México");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<JobSearchResult | null>(null);

  // Platform Filter
  const [selectedPlatform, setSelectedPlatform] = useState<string>("todos");

  // Tailor CV Modal State
  const [cvJob, setCvJob] = useState<JobMatch | null>(null);
  const [cvOut, setCvOut] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");
  const [copiedCv, setCopiedCv] = useState(false);

  // Quick Paste Job Modal State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedJobTitle, setPastedJobTitle] = useState("");
  const [pastedJobDescription, setPastedJobDescription] = useState("");

  // Portal links helper based on detected or placeholder role
  const detectedRole = result?.profile?.title || "Tu puesto objetivo";
  const portals = useMemo(() => {
    return buildMexicanPortalUrls(detectedRole, location);
  }, [detectedRole, location]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!result?.jobs) return [];
    if (selectedPlatform === "todos") return result.jobs;
    if (selectedPlatform === "computrabajo") {
      return result.jobs.filter((j) => j.source.toLowerCase().includes("computrabajo"));
    }
    if (selectedPlatform === "occ") {
      return result.jobs.filter((j) => j.source.toLowerCase().includes("occ"));
    }
    if (selectedPlatform === "indeed") {
      return result.jobs.filter((j) => j.source.toLowerCase().includes("indeed"));
    }
    if (selectedPlatform === "linkedin") {
      return result.jobs.filter((j) => j.source.toLowerCase().includes("linkedin"));
    }
    if (selectedPlatform === "remoto") {
      return result.jobs.filter(
        (j) =>
          j.location.toLowerCase().includes("remot") ||
          (j.modality && j.modality.toLowerCase().includes("remot")),
      );
    }
    return result.jobs;
  }, [result?.jobs, selectedPlatform]);

  // Platform counts
  const platformCounts = useMemo(() => {
    const jobs = result?.jobs ?? [];
    return {
      todos: jobs.length,
      computrabajo: jobs.filter((j) => j.source.toLowerCase().includes("computrabajo")).length,
      occ: jobs.filter((j) => j.source.toLowerCase().includes("occ")).length,
      indeed: jobs.filter((j) => j.source.toLowerCase().includes("indeed")).length,
      linkedin: jobs.filter((j) => j.source.toLowerCase().includes("linkedin")).length,
      remoto: jobs.filter(
        (j) =>
          j.location.toLowerCase().includes("remot") ||
          (j.modality && j.modality.toLowerCase().includes("remot")),
      ).length,
    };
  }, [result?.jobs]);

  async function makeCv(job: JobMatch) {
    setCvJob(job);
    setCvOut("");
    setCvError("");
    setCvLoading(true);
    setCopiedCv(false);
    try {
      const pdfBase64 = file ? await toBase64(file) : null;
      const r = await tailor({
        data: {
          cvText: cvText.trim() || null,
          pdfBase64,
          job: {
            title: job.title,
            company: job.company,
            location: job.location,
            text: job.text.slice(0, 4000),
          },
        },
      });
      setCvOut(r.cv);
    } catch (e) {
      setCvError(e instanceof Error ? e.message : "No se pudo crear el CV.");
    } finally {
      setCvLoading(false);
    }
  }

  function printCv() {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = cvOut
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/^[-*] (.*)$/gm, "<li>$1</li>")
      .replace(/\n{2,}/g, "<br/>")
      .replace(/\n/g, " ");
    w.document.write(
      `<html><head><title>CV - ${cvJob?.company ?? ""}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:32px auto;font-size:13px;line-height:1.45}h1{margin:0}h2{border-bottom:1px solid #999;font-size:15px;margin-top:16px}li{margin-left:18px}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.print();
  }

  function handleSendToAnalyzer(job: JobMatch) {
    const fullDesc = `${job.title} en ${job.company} (${job.location})\n${job.salary ? `Salario: ${job.salary}\n` : ""}\n${job.text}`;
    navigate({
      to: "/analizador",
      search: {
        jobTitle: `${job.title} — ${job.company}`,
        jobDescription: fullDesc,
      },
    });
  }

  function handleSendPastedToAnalyzer(e: React.FormEvent) {
    e.preventDefault();
    if (!pastedJobDescription.trim()) return;
    navigate({
      to: "/analizador",
      search: {
        jobTitle: pastedJobTitle.trim() || "Vacante importada (CompuTrabajo / OCC)",
        jobDescription: pastedJobDescription.trim(),
      },
    });
  }

  async function run() {
    setError("");
    if (!cvText.trim() && !file) return setError("Sube un PDF o pega el texto de tu CV.");
    if (file && file.size > 10 * 1024 * 1024) return setError("El PDF debe pesar menos de 10 MB.");
    setLoading(true);
    try {
      const pdfBase64 = file ? await toBase64(file) : null;
      const r = await search({
        data: {
          cvText: cvText.trim() || null,
          pdfBase64,
          location: location.trim() || "México",
        },
      });
      setResult(r);
      setSelectedPlatform("todos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda en México.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink font-display">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Top Bar */}
        <header className="flex items-center justify-between rounded-2xl bg-surface ring-1 ring-black/5 px-4 py-3 shadow-xs">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground font-mono text-sm font-semibold shadow-xs">
              R
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">RUMBO</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Mercado Laboral México
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-surface text-ink hover:bg-background transition-colors flex items-center gap-1.5"
            >
              <ClipboardPaste className="size-3.5 text-accent" />
              <span>Pegar vacante de CompuTrabajo / OCC</span>
            </button>
            <Link
              to="/analizador"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line bg-surface text-ink hover:bg-background transition-colors"
            >
              Analizador ATS
            </Link>
            <Link
              to="/"
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-muted hover:text-ink transition-colors"
            >
              ← Tablero
            </Link>
          </div>
        </header>

        {/* Hero Banner for Mexico */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-accent/5 to-blue-500/10 border border-emerald-500/20 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              <span className="text-base leading-none">🇲🇽</span>
              <span>Búsqueda Exclusiva en México</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Vacantes en CompuTrabajo, OCCMundial e Indeed
            </h1>
            <p className="text-sm text-muted max-w-2xl">
              Compara tu CV contra ofertas activas en la República Mexicana y obtén tu porcentaje de
              coincidencia ATS, prestaciones y salario en MXN.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-surface border border-line hover:border-accent text-ink shadow-xs transition-colors flex items-center gap-2"
            >
              <ClipboardPaste className="size-4 text-emerald-600" />
              <span>Importar de CompuTrabajo / OCC</span>
            </button>
          </div>
        </div>

        {/* Main Grid: CV input column + Results column */}
        <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
          {/* Left Column: CV Input & Location Controls */}
          <section className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-4 h-fit shadow-xs">
            <div>
              <div className={label}>Paso 1 · Tu Currículum</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                Carga tu CV para analizar
              </h2>
            </div>

            {/* PDF Upload */}
            <label className="block rounded-xl border border-dashed border-line p-4 text-center cursor-pointer hover:bg-background/80 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <FileText className="size-6 mx-auto mb-1 text-muted" />
              <div className="text-sm font-medium text-ink">
                {file ? file.name : "Subir archivo PDF de tu CV"}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {file ? "Haz clic para cambiar de archivo" : "PDF de hasta 10 MB"}
              </div>
            </label>

            <div className="flex items-center gap-2">
              <div className="h-px bg-line flex-1" />
              <span className={label}>o en texto</span>
              <div className="h-px bg-line flex-1" />
            </div>

            {/* Textarea */}
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={6}
              placeholder="Pega aquí tu experiencia laboral, educación y habilidades técnicas..."
              className="w-full rounded-xl bg-background border border-line p-3 text-sm outline-none focus:border-accent resize-y"
            />

            {/* Mexico Location Selector */}
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <div className={label}>Paso 2 · Ubicación en México</div>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  🇲🇽 Solo México
                </span>
              </div>

              <div className="relative">
                <MapPin className="size-4 absolute left-3 top-3 text-muted" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. CDMX, Guadalajara, Monterrey o Remoto..."
                  className="w-full rounded-xl bg-background border border-line pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>

              {/* Quick Mexican Presets */}
              <div className="space-y-1">
                <div className="text-[11px] text-muted font-medium">Sugerencias rápidas:</div>
                <div className="flex flex-wrap gap-1.5">
                  {MEXICAN_REGIONS.map((reg) => (
                    <button
                      key={reg.code}
                      type="button"
                      onClick={() => setLocation(reg.label)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                        location === reg.label
                          ? "bg-accent text-accent-foreground border-accent font-semibold"
                          : "bg-background border-line text-muted hover:text-ink hover:border-muted"
                      }`}
                    >
                      {reg.label.replace(" (México)", "")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={run}
              disabled={loading}
              className="w-full rounded-xl bg-accent text-accent-foreground py-3 text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Buscando en CompuTrabajo y OCC...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Buscar vacantes en México</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                {error}
              </div>
            )}
          </section>

          {/* Right Column: Search Results & Mexican Portals */}
          <section className="space-y-5">
            {/* Live Mexican Portals Quick Search Bar */}
            <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className={label}>Bolsas de Trabajo en México</div>
                  <h3 className="text-base font-semibold">
                    Abrir búsquedas directas en portales líderes
                  </h3>
                </div>
                <span className="text-xs text-muted font-mono hidden sm:inline">
                  {detectedRole} · {location || "México"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {portals.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col justify-between p-3 rounded-xl border border-line bg-background hover:border-accent hover:shadow-xs transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink group-hover:text-accent transition-colors">
                          {p.name}
                        </span>
                        <ExternalLink className="size-3 text-muted group-hover:text-accent transition-colors" />
                      </div>
                      <span className="text-[10px] text-muted mt-0.5 block">{p.badge}</span>
                    </div>
                    <div className="mt-2 text-[11px] font-semibold text-accent flex items-center gap-0.5">
                      <span>Buscar</span>
                      <ChevronRight className="size-3" />
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Empty State */}
            {!result && !loading && (
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-10 text-center space-y-3">
                <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mx-auto">
                  <Briefcase className="size-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    Vacantes de CompuTrabajo y OCC seleccionadas para ti
                  </h3>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Sube o pega tu CV a la izquierda y calcularemos la coincidencia exacta de cada
                    oferta del mercado mexicano contra tus habilidades.
                  </p>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-12 text-center space-y-4">
                <RefreshCw className="size-8 text-accent animate-spin mx-auto" />
                <div className="space-y-1">
                  <div className="text-base font-semibold">
                    Escaneando vacantes en México y evaluando tu CV...
                  </div>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    Analizando puestos en CompuTrabajo, OCCMundial, Indeed y ofertas remotas.
                    Calculando porcentaje de coincidencia con IA.
                  </p>
                </div>
              </div>
            )}

            {/* Results Section */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Detected Profile Card */}
                <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <div className={label}>Perfil Detectado para México</div>
                      <div className="text-lg font-bold text-ink mt-0.5">
                        {result.profile.title} ·{" "}
                        <span className="text-muted font-normal">{result.profile.seniority}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                        {result.jobs.length} vacantes encontradas
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted leading-relaxed">{result.profile.summary}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-muted font-medium mr-1">
                      Palabras clave clave:
                    </span>
                    {result.profile.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-lg bg-background border border-line px-2 py-0.5 font-mono text-[11px] text-ink"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Platform Filter Tabs */}
                <div className="flex items-center justify-between gap-2 flex-wrap border-b border-line pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform("todos")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        selectedPlatform === "todos"
                          ? "bg-ink text-background"
                          : "bg-surface text-muted hover:text-ink border border-line"
                      }`}
                    >
                      Todos ({platformCounts.todos})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform("computrabajo")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        selectedPlatform === "computrabajo"
                          ? "bg-emerald-600 text-white"
                          : "bg-surface text-muted hover:text-ink border border-line"
                      }`}
                    >
                      <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                      <span>CompuTrabajo ({platformCounts.computrabajo})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform("occ")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        selectedPlatform === "occ"
                          ? "bg-blue-600 text-white"
                          : "bg-surface text-muted hover:text-ink border border-line"
                      }`}
                    >
                      <span className="size-2 rounded-full bg-blue-500 inline-block" />
                      <span>OCCMundial ({platformCounts.occ})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlatform("remoto")}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                        selectedPlatform === "remoto"
                          ? "bg-purple-600 text-white"
                          : "bg-surface text-muted hover:text-ink border border-line"
                      }`}
                    >
                      <Globe className="size-3" />
                      <span>100% Remoto ({platformCounts.remoto})</span>
                    </button>
                  </div>
                </div>

                {/* Jobs List */}
                {filteredJobs.length === 0 ? (
                  <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-8 text-center text-sm text-muted">
                    No hay vacantes con el filtro "{selectedPlatform}". Selecciona "Todos" para ver
                    las ofertas disponibles.
                  </div>
                ) : (
                  filteredJobs.map((j) => {
                    const isComputrabajo = j.source.toLowerCase().includes("computrabajo");
                    const isOcc = j.source.toLowerCase().includes("occ");

                    return (
                      <div
                        key={j.id}
                        className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 hover:ring-accent transition shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-4">
                          {/* Match Score Indicator */}
                          <div
                            className={`grid size-14 shrink-0 place-items-center rounded-xl font-mono text-lg font-bold shadow-xs ${
                              j.match >= 80
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                                : j.match >= 60
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30"
                                  : "bg-background text-muted ring-1 ring-line"
                            }`}
                          >
                            <div className="text-center leading-none">
                              <div>{j.match}%</div>
                              <div className="text-[9px] font-sans font-medium uppercase mt-0.5 opacity-80">
                                Coincidencia
                              </div>
                            </div>
                          </div>

                          {/* Job Details */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-ink">{j.title}</h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Platform Badge */}
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    isComputrabajo
                                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25"
                                      : isOcc
                                        ? "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/25"
                                        : "bg-background text-muted border border-line"
                                  }`}
                                >
                                  {j.source}
                                </span>

                                {/* Modality Badge */}
                                {j.modality && (
                                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-background border border-line text-muted">
                                    {j.modality}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted flex-wrap">
                              <span className="font-semibold text-ink flex items-center gap-1">
                                <Building2 className="size-3.5 text-muted" />
                                {j.company}
                              </span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3.5 text-muted" />
                                {j.location}
                              </span>
                              {j.salary && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                    <DollarSign className="size-3.5" />
                                    {j.salary}
                                  </span>
                                </>
                              )}
                            </div>

                            {j.reason && (
                              <p className="text-xs text-ink/80 pt-1 font-medium bg-accent/5 p-2 rounded-lg border border-accent/10">
                                💡 Coincidencia con tu CV: {j.reason}
                              </p>
                            )}

                            <p className="text-xs text-muted line-clamp-3 pt-1">{j.text}</p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-3 flex-wrap">
                              <a
                                href={j.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border border-line bg-background hover:bg-surface px-3 py-1.5 text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors"
                              >
                                <span>Ver en {j.source}</span>
                                <ExternalLink className="size-3 text-muted" />
                              </a>

                              <button
                                onClick={() => handleSendToAnalyzer(j)}
                                className="rounded-xl border border-line bg-background hover:border-accent px-3 py-1.5 text-xs font-semibold text-accent flex items-center gap-1.5 transition-colors"
                              >
                                <span>Analizar en Analizador ATS</span>
                                <ArrowRight className="size-3" />
                              </button>

                              <button
                                onClick={() => makeCv(j)}
                                className="rounded-xl bg-accent text-accent-foreground px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity ml-auto"
                              >
                                Adaptar mi CV a esta vacante
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Tailor CV Modal */}
      {cvJob && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setCvJob(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface ring-1 ring-black/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-4">
              <div>
                <div className={label}>CV Personalizado para Vacante Mexicana</div>
                <div className="font-semibold text-base">
                  {cvJob.title} · {cvJob.company}
                </div>
                <div className="text-xs text-muted">
                  Plataforma: {cvJob.source} · {cvJob.location}
                </div>
              </div>
              <button
                onClick={() => setCvJob(null)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-background transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {cvLoading && (
                <div className="text-center py-12 space-y-3">
                  <RefreshCw className="size-7 text-accent animate-spin mx-auto" />
                  <p className="text-sm text-muted">
                    Adaptando tu CV con las palabras clave y requisitos de {cvJob.company}...
                  </p>
                </div>
              )}
              {cvError && (
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  {cvError}
                </div>
              )}
              {cvOut && (
                <textarea
                  value={cvOut}
                  onChange={(e) => setCvOut(e.target.value)}
                  className="w-full min-h-[50vh] rounded-xl bg-background border border-line p-4 font-mono text-xs outline-none focus:border-accent resize-y"
                />
              )}
            </div>

            {cvOut && (
              <div className="flex items-center justify-between border-t border-line p-4">
                <div className="text-xs text-muted">
                  {copiedCv && (
                    <span className="text-accent font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> ¡Copiado al portapapeles!
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(cvOut);
                      setCopiedCv(true);
                      setTimeout(() => setCopiedCv(false), 3000);
                    }}
                    className="rounded-xl border border-line bg-background hover:bg-surface px-4 py-2 text-xs font-semibold"
                  >
                    Copiar texto
                  </button>
                  <button
                    onClick={printCv}
                    className="rounded-xl bg-accent text-accent-foreground px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Printer className="size-3.5" />
                    <span>Descargar PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Paste Modal: Paste from CompuTrabajo or OCC */}
      {showPasteModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setShowPasteModal(false)}
        >
          <div
            className="w-full max-w-xl flex flex-col rounded-2xl bg-surface ring-1 ring-black/10 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className={label}>Importar de Bolsa de Trabajo</div>
                <h3 className="text-base font-bold">Pegar vacante de CompuTrabajo u OCC</h3>
                <p className="text-xs text-muted mt-0.5">
                  Copia el texto de cualquier oferta en México para enviarla al Analizador ATS y
                  probar tus CVs.
                </p>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-muted hover:text-ink p-1 rounded-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSendPastedToAnalyzer} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-ink block mb-1">
                  Título del puesto o vacante:
                </label>
                <input
                  value={pastedJobTitle}
                  onChange={(e) => setPastedJobTitle(e.target.value)}
                  placeholder="Ej. Desarrollador Full Stack — CompuTrabajo México"
                  className="w-full rounded-xl bg-background border border-line px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink block mb-1">
                  Descripción completa de la vacante (texto copiado):
                </label>
                <textarea
                  value={pastedJobDescription}
                  onChange={(e) => setPastedJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Pega aquí los requisitos, responsabilidades, prestaciones y perfil solicitado..."
                  className="w-full rounded-xl bg-background border border-line p-3 text-xs outline-none focus:border-accent resize-y"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-line text-muted hover:text-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!pastedJobDescription.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>Abrir en Analizador ATS</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
