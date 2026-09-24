import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Layers,
  MapPin,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  buildMexicanPortalUrls,
  type JobMatch,
  type JobSearchResult,
  MEXICAN_STATES,
  type MexicanState,
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
          "Encuentra vacantes en México en CompuTrabajo, OCCMundial, Indeed y LinkedIn con selección de múltiples estados de la república.",
      },
      {
        property: "og:title",
        content: "Vacantes en México para tu CV (Multi-estado) — RUMBO",
      },
      {
        property: "og:description",
        content:
          "Búsqueda de empleo en México con selección de múltiples estados de la república integrada con CompuTrabajo y OCCMundial.",
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

const STATE_PRESETS = [
  {
    name: "Toda la República",
    icon: "🇲🇽",
    states: ["Toda la República"],
    badge: "Nacional",
  },
  {
    name: "Hubs Tech",
    icon: "🚀",
    states: ["Ciudad de México (CDMX)", "Jalisco", "Nuevo León"],
    badge: "CDMX + GDL + MTY",
  },
  {
    name: "Corredor Bajío",
    icon: "🏭",
    states: ["Querétaro", "Guanajuato", "Aguascalientes", "San Luis Potosí"],
    badge: "QRO + GTO + AGS",
  },
  {
    name: "Zona Metropolitana",
    icon: "🏙️",
    states: ["Ciudad de México (CDMX)", "Estado de México (Edomex)"],
    badge: "CDMX + Edomex",
  },
  {
    name: "Norte Industrial",
    icon: "🌵",
    states: ["Nuevo León", "Coahuila", "Chihuahua", "Baja California"],
    badge: "Frontera / Norte",
  },
  {
    name: "Península Sureste",
    icon: "🌴",
    states: ["Yucatán", "Quintana Roo"],
    badge: "Mérida + Cancún",
  },
  {
    name: "100% Remoto",
    icon: "💻",
    states: ["Remoto (México)"],
    badge: "Teletrabajo",
  },
] as const;

const REGION_TABS = ["Todos", "Centro", "Norte", "Bajío", "Occidente", "Sur/Sureste"] as const;

function Empleos() {
  const navigate = useNavigate();
  const search = useServerFn(searchJobsForCv);
  const tailor = useServerFn(tailorCv);

  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Multi-state selection state
  const [selectedStates, setSelectedStates] = useState<string[]>([
    "Ciudad de México (CDMX)",
    "Jalisco",
    "Nuevo León",
  ]);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [selectedRegionTab, setSelectedRegionTab] = useState<string>("Todos");
  const [isStateSelectorExpanded, setIsStateSelectorExpanded] = useState(false);
  const [activePortalState, setActivePortalState] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<JobSearchResult | null>(null);

  // Platform and Location Filters for results
  const [selectedPlatform, setSelectedPlatform] = useState<string>("todos");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("todos");

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

  const isAllRepublic =
    selectedStates.length === 0 ||
    selectedStates.includes("Toda la República") ||
    selectedStates.some((s) => s.toLowerCase().includes("toda"));

  // Toggle individual state
  const toggleState = (stateName: string) => {
    if (stateName === "Toda la República") {
      setSelectedStates(["Toda la República"]);
      return;
    }
    setSelectedStates((prev) => {
      const clean = prev.filter((s) => s !== "Toda la República");
      if (clean.includes(stateName)) {
        const next = clean.filter((s) => s !== stateName);
        return next.length === 0 ? ["Toda la República"] : next;
      } else {
        return [...clean, stateName];
      }
    });
  };

  const removeState = (stateName: string) => {
    setSelectedStates((prev) => {
      const next = prev.filter((s) => s !== stateName);
      return next.length === 0 ? ["Toda la República"] : next;
    });
  };

  const clearAllStates = () => {
    setSelectedStates(["Toda la República"]);
  };

  // Filtered states list based on search and region tab
  const filteredStatesList = useMemo(() => {
    return MEXICAN_STATES.filter((st) => {
      const matchesRegion = selectedRegionTab === "Todos" || st.region === selectedRegionTab;
      const q = stateSearchQuery.trim().toLowerCase();
      const matchesQuery =
        !q || st.name.toLowerCase().includes(q) || st.short.toLowerCase().includes(q);
      return matchesRegion && matchesQuery;
    });
  }, [selectedRegionTab, stateSearchQuery]);

  // Detected role
  const detectedRole = result?.profile?.title || "Tu puesto objetivo";

  // Location for portal links
  const currentPortalLocation = useMemo(() => {
    if (activePortalState && selectedStates.includes(activePortalState)) {
      return activePortalState;
    }
    if (selectedStates.length > 0 && !isAllRepublic) {
      return selectedStates[0];
    }
    return "México";
  }, [activePortalState, selectedStates, isAllRepublic]);

  const portals = useMemo(() => {
    return buildMexicanPortalUrls(detectedRole, currentPortalLocation);
  }, [detectedRole, currentPortalLocation]);

  // Unique locations in returned jobs
  const availableResultLocations = useMemo(() => {
    if (!result?.jobs) return [];
    const locs = new Set<string>();
    for (const j of result.jobs) {
      if (j.location) {
        locs.add(j.location);
      }
    }
    return Array.from(locs);
  }, [result?.jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (!result?.jobs) return [];
    return result.jobs.filter((j) => {
      // Platform filter
      if (selectedPlatform === "computrabajo" && !j.source.toLowerCase().includes("computrabajo")) {
        return false;
      }
      if (selectedPlatform === "occ" && !j.source.toLowerCase().includes("occ")) {
        return false;
      }
      if (selectedPlatform === "indeed" && !j.source.toLowerCase().includes("indeed")) {
        return false;
      }
      if (selectedPlatform === "linkedin" && !j.source.toLowerCase().includes("linkedin")) {
        return false;
      }
      if (selectedPlatform === "remoto") {
        const isRem =
          j.location.toLowerCase().includes("remot") ||
          (j.modality && j.modality.toLowerCase().includes("remot"));
        if (!isRem) return false;
      }

      // Location filter
      if (selectedLocationFilter !== "todos" && j.location !== selectedLocationFilter) {
        return false;
      }

      return true;
    });
  }, [result?.jobs, selectedPlatform, selectedLocationFilter]);

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
          locations: selectedStates,
          location: selectedStates.join(", "),
        },
      });
      setResult(r);
      setSelectedPlatform("todos");
      setSelectedLocationFilter("todos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda en México.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink font-display">
      <div className="mx-auto max-w-[1260px] px-4 sm:px-6 py-6 space-y-6">
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
              <span className="hidden sm:inline">Pegar vacante de CompuTrabajo / OCC</span>
              <span className="sm:hidden">Importar</span>
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

        {/* Hero Banner for Mexico Multi-State */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-accent/5 to-blue-500/10 border border-emerald-500/20 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
              <span className="text-base leading-none">🇲🇽</span>
              <span>Búsqueda Multi-Estado en la República Mexicana</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Vacantes en CompuTrabajo, OCCMundial e Indeed
            </h1>
            <p className="text-sm text-muted max-w-2xl">
              Selecciona uno o varios estados de México para buscar simultáneamente. El algoritmo de
              IA distribuye y evalúa ofertas en tus zonas geográficas preferidas con puntuación de
              coincidencia.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl bg-surface border border-line hover:border-accent text-ink shadow-xs transition-colors flex items-center gap-2"
            >
              <ClipboardPaste className="size-4 text-emerald-600" />
              <span>Importar vacante directa</span>
            </button>
          </div>
        </div>

        {/* Main Grid: CV input column + Results column */}
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left Column: CV Input & Multi-State Selector */}
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
              rows={5}
              placeholder="Pega aquí tu experiencia laboral, educación y habilidades técnicas..."
              className="w-full rounded-xl bg-background border border-line p-3 text-sm outline-none focus:border-accent resize-y"
            />

            {/* Step 2: Multi-State Selector in Mexico */}
            <div className="space-y-3 pt-3 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <div className={label}>Paso 2 · Selección de Estados en México</div>
                  <div className="text-xs font-semibold text-ink mt-0.5 flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-600" />
                    <span>
                      {isAllRepublic
                        ? "Toda la República Mexicana"
                        : `${selectedStates.length} estado${selectedStates.length > 1 ? "s" : ""} seleccionado${selectedStates.length > 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>

                {!isAllRepublic && (
                  <button
                    type="button"
                    onClick={clearAllStates}
                    className="text-[11px] text-muted hover:text-destructive flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>

              {/* Active Selected States Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 rounded-xl bg-background/60 border border-line">
                {isAllRepublic ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted font-medium px-2 py-0.5">
                    <span>🇲🇽</span>
                    <span>Búsqueda abierta en toda la República Mexicana</span>
                  </div>
                ) : (
                  selectedStates.map((st) => (
                    <span
                      key={st}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent text-accent-foreground shadow-2xs"
                    >
                      <span>
                        {st
                          .replace(" (CDMX)", "")
                          .replace(" (Edomex)", "")
                          .replace(" (México)", "")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeState(st)}
                        className="hover:opacity-75 p-0.5 -mr-0.5"
                        title={`Quitar ${st}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <div className="text-[11px] text-muted font-medium">
                  Combinaciones rápidas por zona:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATE_PRESETS.map((preset) => {
                    const isActive =
                      preset.states.length === selectedStates.length &&
                      preset.states.every((s) => selectedStates.includes(s));

                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setSelectedStates([...preset.states])}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isActive
                            ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                            : "bg-background border-line text-muted hover:text-ink hover:border-muted"
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible / Expandable Full State Selector */}
              <div className="rounded-xl border border-line bg-background overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsStateSelectorExpanded((v) => !v)}
                  className="w-full p-2.5 text-xs font-semibold text-ink flex items-center justify-between hover:bg-surface/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="size-3.5 text-accent" />
                    <span>Explorar los 32 Estados de la República</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted text-[11px]">
                    <span>{isStateSelectorExpanded ? "Ocultar lista" : "Mostrar selector"}</span>
                    {isStateSelectorExpanded ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </div>
                </button>

                {isStateSelectorExpanded && (
                  <div className="p-3 border-t border-line space-y-3 bg-surface/50">
                    {/* Search and Region Filter */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted" />
                        <input
                          value={stateSearchQuery}
                          onChange={(e) => setStateSearchQuery(e.target.value)}
                          placeholder="Buscar estado (ej. Jalisco, Puebla, Yucatán)..."
                          className="w-full rounded-lg bg-background border border-line pl-8 pr-2.5 py-1.5 text-xs outline-none focus:border-accent"
                        />
                      </div>

                      {/* Region Tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                        {REGION_TABS.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setSelectedRegionTab(tab)}
                            className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
                              selectedRegionTab === tab
                                ? "bg-accent text-accent-foreground font-semibold"
                                : "text-muted hover:text-ink hover:bg-background"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* States Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {filteredStatesList.map((st) => {
                        const isSelected = selectedStates.includes(st.name);

                        return (
                          <button
                            key={st.code}
                            type="button"
                            onClick={() => toggleState(st.name)}
                            className={`p-1.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                                : "bg-background border-line text-muted hover:text-ink hover:border-muted"
                            }`}
                          >
                            <div className="min-w-0 flex-1 leading-tight truncate">
                              <span className="truncate block">{st.short}</span>
                              <span className="text-[9px] text-muted block opacity-75">
                                {st.region}
                              </span>
                            </div>
                            <div
                              className={`size-4 rounded flex items-center justify-center border shrink-0 ${
                                isSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-line bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="size-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted pt-1 border-t border-line">
                      <span>{filteredStatesList.length} estados en este filtro</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStates(["Toda la República"])}
                        className="text-accent font-semibold hover:underline"
                      >
                        Seleccionar Todo México
                      </button>
                    </div>
                  </div>
                )}
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
                  <span>
                    Buscar en {isAllRepublic ? "todo México" : `${selectedStates.length} estados`}
                  </span>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className={label}>Bolsas de Trabajo en México</div>
                  <h3 className="text-base font-semibold">
                    Abrir búsquedas directas en portales líderes
                  </h3>
                </div>
                <div className="text-xs text-muted font-mono flex items-center gap-1.5">
                  <span className="font-semibold text-ink">{detectedRole}</span>
                  <span>·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {currentPortalLocation}
                  </span>
                </div>
              </div>

              {/* State Switcher for Direct Portal Searches */}
              {selectedStates.length > 1 && !isAllRepublic && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-line/60">
                  <span className="text-[11px] text-muted font-medium mr-1">
                    Ver enlaces directos para:
                  </span>
                  {selectedStates.map((st) => {
                    const isCurrent = currentPortalLocation === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setActivePortalState(st)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          isCurrent
                            ? "bg-accent text-accent-foreground border-accent font-semibold shadow-2xs"
                            : "bg-background border-line text-muted hover:text-ink"
                        }`}
                      >
                        {st.replace(" (CDMX)", "").replace(" (Edomex)", "")}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Portal Links Grid */}
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
                    Vacantes de CompuTrabajo y OCC seleccionadas para tus estados
                  </h3>
                  <p className="text-sm text-muted max-w-md mx-auto">
                    Selecciona tus estados preferidos de la República Mexicana a la izquierda y sube
                    tu CV. Analizaremos las ofertas laborales y calcularemos la coincidencia ATS
                    exacta.
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
                    Escaneando vacantes en{" "}
                    {isAllRepublic ? "México" : `${selectedStates.length} estados`} y evaluando tu
                    CV...
                  </div>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    Consultando CompuTrabajo, OCCMundial, Indeed y ofertas remotas para:{" "}
                    <span className="font-semibold text-ink">
                      {isAllRepublic ? "Toda la República" : selectedStates.join(", ")}
                    </span>
                    .
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
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        <span>
                          {isAllRepublic
                            ? "Búsqueda en toda la República Mexicana"
                            : `Estados seleccionados: ${selectedStates.join(", ")} (${selectedStates.length})`}
                        </span>
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

                {/* Filter Tabs: Platform & Location Filter */}
                <div className="space-y-2 border-b border-line pb-3">
                  {/* Platform Filter */}
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

                  {/* Location Filter if diverse results */}
                  {availableResultLocations.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
                      <span className="text-[11px] text-muted font-medium flex items-center gap-1">
                        <Filter className="size-3 text-muted" />
                        <span>Filtrar por ciudad/estado:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLocationFilter("todos")}
                        className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                          selectedLocationFilter === "todos"
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "bg-background border border-line text-muted hover:text-ink"
                        }`}
                      >
                        Todas
                      </button>
                      {availableResultLocations.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setSelectedLocationFilter(loc)}
                          className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                            selectedLocationFilter === loc
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "bg-background border border-line text-muted hover:text-ink"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jobs List */}
                {filteredJobs.length === 0 ? (
                  <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-8 text-center text-sm text-muted">
                    No hay vacantes con los filtros seleccionados. Prueba cambiando la plataforma o
                    la ubicación.
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
                              <span className="flex items-center gap-1 text-ink font-medium">
                                <MapPin className="size-3.5 text-emerald-600" />
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
                                className="rounded-xl border border-line bg-background hover:border-accent px-3 py-1.5 text-xs font-semibold text-accent flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <span>Analizar en Analizador ATS</span>
                                <ArrowRight className="size-3" />
                              </button>

                              <button
                                onClick={() => makeCv(j)}
                                className="rounded-xl bg-accent text-accent-foreground px-3.5 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity ml-auto cursor-pointer"
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
                    className="rounded-xl border border-line bg-background hover:bg-surface px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Copiar texto
                  </button>
                  <button
                    onClick={printCv}
                    className="rounded-xl bg-accent text-accent-foreground px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
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
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
