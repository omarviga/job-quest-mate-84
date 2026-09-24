import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { searchJobsForCv, tailorCv, type JobMatch, type JobSearchResult } from "@/lib/jobs.functions";

export const Route = createFileRoute("/empleos")({
  head: () => ({
    meta: [
      { title: "Vacantes para tu CV — RUMBO" },
      {
        name: "description",
        content: "Sube o pega tu CV y RUMBO encuentra vacantes reales ordenadas por coincidencia con tu perfil.",
      },
      { property: "og:title", content: "Vacantes para tu CV — RUMBO" },
      {
        property: "og:description",
        content: "Búsqueda de empleo real con puntuación de coincidencia por IA.",
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

function portalLinks(role: string, where: string) {
  const r = encodeURIComponent(role);
  const w = encodeURIComponent(where || "México");
  const slug = (v: string) => v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [
    { name: "LinkedIn", url: `https://www.linkedin.com/jobs/search/?keywords=${r}&location=${w}` },
    { name: "Indeed", url: `https://mx.indeed.com/jobs?q=${r}&l=${w}` },
    { name: "OCC", url: `https://www.occ.com.mx/empleos/de-${slug(role)}/${where ? `en-${slug(where)}/` : ""}` },
    { name: "Computrabajo", url: `https://mx.computrabajo.com/trabajo-de-${slug(role)}${where ? `-en-${slug(where)}` : ""}` },
    { name: "Glassdoor", url: `https://www.glassdoor.com.mx/Empleo/empleos.htm?sc.keyword=${r}` },
  ];
}

function Empleos() {
  const search = useServerFn(searchJobsForCv);
  const [cvText, setCvText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<JobSearchResult | null>(null);
  const tailor = useServerFn(tailorCv);
  const [cvJob, setCvJob] = useState<JobMatch | null>(null);
  const [cvOut, setCvOut] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState("");

  async function makeCv(job: JobMatch) {
    setCvJob(job);
    setCvOut("");
    setCvError("");
    setCvLoading(true);
    try {
      const pdfBase64 = file ? await toBase64(file) : null;
      const r = await tailor({
        data: {
          cvText: cvText.trim() || null,
          pdfBase64,
          job: { title: job.title, company: job.company, location: job.location, text: job.text.slice(0, 4000) },
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
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>").replace(/^## (.*)$/gm, "<h2>$1</h2>").replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^[-*] (.*)$/gm, "<li>$1</li>")
      .replace(/\n{2,}/g, "<br/>").replace(/\n/g, " ");
    w.document.write(`<html><head><title>CV - ${cvJob?.company ?? ""}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:32px auto;font-size:13px;line-height:1.45}h1{margin:0}h2{border-bottom:1px solid #999;font-size:15px;margin-top:16px}li{margin-left:18px}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  }

  async function run() {
    setError("");
    if (!cvText.trim() && !file) return setError("Sube un PDF o pega el texto de tu CV.");
    if (file && file.size > 10 * 1024 * 1024) return setError("El PDF debe pesar menos de 10 MB.");
    setLoading(true);
    try {
      const pdfBase64 = file ? await toBase64(file) : null;
      const r = await search({
        data: { cvText: cvText.trim() || null, pdfBase64, location: location.trim() || null },
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la búsqueda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-ink font-display">
      <div className="mx-auto max-w-[1200px] px-5 py-5 space-y-5">
        <header className="flex items-center justify-between rounded-2xl bg-surface ring-1 ring-black/5 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground font-mono text-sm font-semibold">
              R
            </div>
            <div className="text-[15px] font-semibold tracking-tight">RUMBO</div>
          </Link>
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-ink">
            ← Tablero
          </Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl bg-surface ring-1 ring-black/5 p-5 space-y-4 h-fit">
            <div>
              <div className={label}>Tu CV</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">Vacantes acordes a tu perfil</h1>
            </div>
            <label className="block rounded-xl border border-dashed border-line p-4 text-center cursor-pointer hover:bg-background">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-sm font-medium">{file ? file.name : "Subir PDF"}</div>
              <div className="text-xs text-muted mt-1">{file ? "Clic para cambiar" : "Máx. 10 MB"}</div>
            </label>
            <div className={label}>o pega el texto</div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={7}
              placeholder="Experiencia, habilidades, estudios…"
              className="w-full rounded-xl bg-background ring-1 ring-black/5 p-3 text-sm outline-none focus:ring-accent"
            />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ubicación preferida (opcional)"
              className="w-full rounded-xl bg-background ring-1 ring-black/5 px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={run}
              disabled={loading}
              className="w-full rounded-xl bg-accent text-accent-foreground py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Analizando CV y buscando…" : "Buscar vacantes"}
            </button>
            {error && <p className="text-sm text-bad">{error}</p>}
          </section>

          <section className="space-y-4">
            {!result && !loading && (
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-10 text-center text-sm text-muted">
                Añade tu CV y te mostraremos vacantes reales ordenadas por coincidencia.
              </div>
            )}
            {loading && (
              <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-10 text-center text-sm text-muted animate-pulse">
                Leyendo tu CV, buscando ofertas y calculando coincidencias… (puede tardar un minuto)
              </div>
            )}
            {result && !loading && (
              <>
                <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-5">
                  <div className={label}>Perfil detectado</div>
                  <div className="mt-1 text-lg font-semibold">
                    {result.profile.title} · <span className="text-muted">{result.profile.seniority}</span>
                  </div>
                  <p className="text-sm text-muted mt-1">{result.profile.summary}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted font-mono">
                    <span className="rounded-md bg-accent-soft px-2 py-0.5">
                      {result.jobs.length} vacantes
                    </span>
                    <span>·</span>
                    <span>
                      {[...new Set(result.jobs.map((j) => j.source))].join(" · ")}
                    </span>
                  </div>
                  <div className={`${label} mt-4`}>Buscar también en</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {portalLinks(result.profile.title, location).map((p) => (
                      <a
                        key={p.name}
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg ring-1 ring-black/10 bg-background px-3 py-1.5 text-xs font-semibold hover:ring-accent"
                      >
                        {p.name} ↗
                      </a>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {result.profile.keywords.map((k) => (
                      <span key={k} className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[11px]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                {result.jobs.length === 0 && (
                  <div className="rounded-2xl bg-surface ring-1 ring-black/5 p-8 text-center text-sm text-muted">
                    No encontramos vacantes abiertas para este perfil ahora mismo. Prueba más tarde.
                  </div>
                )}
                {result.jobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex gap-4 rounded-2xl bg-surface ring-1 ring-black/5 p-4 hover:ring-accent transition"
                  >
                    <div
                      className={`grid size-14 shrink-0 place-items-center rounded-xl font-mono text-lg font-semibold ${j.match >= 80 ? "bg-good/15 text-good" : j.match >= 60 ? "bg-warn/15 text-warn" : "bg-background text-muted"
                        }`}
                    >
                      {j.match}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{j.title}</div>
                      <div className="text-sm text-muted truncate">
                        {j.company} · {j.location}
                      </div>
                      {j.reason && <p className="text-sm mt-1">{j.reason}</p>}
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                        {j.source} {j.posted && `· ${j.posted}`}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => makeCv(j)}
                          className="rounded-lg bg-accent text-accent-foreground px-3 py-1.5 text-xs font-semibold"
                        >
                          Crear CV para esta vacante
                        </button>
                        <a
                          href={j.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg ring-1 ring-black/10 px-3 py-1.5 text-xs font-semibold"
                        >
                          Ver oferta ↗
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
      {cvJob && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setCvJob(null)}>
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-surface ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-4">
              <div>
                <div className={label}>CV a medida</div>
                <div className="font-semibold">{cvJob.title} · {cvJob.company}</div>
              </div>
              <button onClick={() => setCvJob(null)} className="text-muted hover:text-ink text-sm">Cerrar ✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {cvLoading && <p className="text-sm text-muted animate-pulse">Adaptando tu CV a la vacante… (puede tardar un minuto)</p>}
              {cvError && <p className="text-sm text-bad">{cvError}</p>}
              {cvOut && (
                <textarea
                  value={cvOut}
                  onChange={(e) => setCvOut(e.target.value)}
                  className="w-full min-h-[50vh] rounded-xl bg-background ring-1 ring-black/5 p-3 font-mono text-xs outline-none"
                />
              )}
            </div>
            {cvOut && (
              <div className="flex justify-end gap-2 border-t border-line p-4">
                <button onClick={() => navigator.clipboard.writeText(cvOut)} className="rounded-lg ring-1 ring-black/10 px-3 py-2 text-sm font-semibold">Copiar</button>
                <button onClick={printCv} className="rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-semibold">Descargar PDF</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
