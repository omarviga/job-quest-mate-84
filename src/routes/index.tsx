import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import avatarLucia from "@/assets/avatar-lucia.jpg";
import cvPreview from "@/assets/cv-preview.jpg";
import {
  initialApplications,
  nextStage,
  stageAccent,
  stages,
  type Application,
  type StageId,
} from "@/lib/rumbo-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RUMBO — Centro de control de tu búsqueda de empleo" },
      {
        name: "description",
        content:
          "Rastrea tus postulaciones por etapa, mide tu coincidencia con cada vacante y adapta tu CV con sugerencias de IA.",
      },
      { property: "og:title", content: "RUMBO — Centro de control de tu búsqueda de empleo" },
      {
        property: "og:description",
        content:
          "Tablero de postulaciones, métricas de respuesta y sugerencias para tu CV en un solo panel.",
      },
    ],
  }),
  component: Index,
});

const labelClass = "font-mono text-[10px] uppercase tracking-[0.15em] text-muted";

function Index() {
  const [apps, setApps] = useState<Application[]>(initialApplications);
  const [selectedId, setSelectedId] = useState<string>("solara");
  const [onlyStrong, setOnlyStrong] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ company: "", role: "", match: "70" });
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () =>
      apps.filter((a) => {
        if (onlyStrong && a.match < 80) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
      }),
    [apps, onlyStrong, query],
  );

  const selected = apps.find((a) => a.id === selectedId) ?? apps[0]!;
  const active = apps.filter((a) => a.stage !== "rechazo").length;
  const interviews = apps.filter((a) => a.stage === "entrevista").length;
  const answered = apps.filter((a) => a.stage === "entrevista" || a.stage === "oferta").length;
  const rate = Math.round((answered / apps.length) * 100);
  const avgMatch = Math.round(apps.reduce((s, a) => s + a.match, 0) / apps.length);
  const advanceTo = nextStage(selected.stage);

  function advance() {
    if (!advanceTo) return;
    setApps((prev) =>
      prev.map((a) => {
        if (a.id !== selected.id) return a;
        const { note: _note, ...rest } = a;
        return { ...rest, stage: advanceTo };
      }),
    );
  }

  function addApplication() {
    const company = draft.company.trim();
    const role = draft.role.trim();
    if (!company || !role) return;
    const match = Math.min(99, Math.max(10, Number(draft.match) || 70));
    const id = `${company.toLowerCase().replace(/\s+/g, "-")}-${apps.length}`;
    const created: Application = {
      id,
      company,
      role,
      match,
      stage: "guardada",
      location: "Por confirmar",
      salary: "Por confirmar",
      suggestions: [
        "Pega la descripción de la vacante para afinar la coincidencia.",
        "Adapta tu resumen profesional al puesto.",
        "Añade dos logros medibles recientes.",
      ],
    };
    setApps((prev) => [created, ...prev]);
    setSelectedId(id);
    setDraft({ company: "", role: "", match: "70" });
    setAdding(false);
  }

  return (
    <div className="min-h-screen bg-background text-ink font-display">
      <div className="mx-auto max-w-[1440px] px-5 py-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface ring-1 ring-black/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground font-mono text-sm font-semibold">
              R
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">RUMBO</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Centro de control
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-background ring-1 ring-black/5 px-3 py-2 w-64">
            <span className="font-mono text-[10px] text-muted">BUSCAR</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ingeniería de datos, Madrid…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/empleos"
              className="rounded-lg bg-accent text-accent-foreground px-3 py-2 text-sm font-semibold"
            >
              Vacantes para mi CV
            </Link>
            <div className="text-right leading-tight">
              <div className="text-sm font-semibold">Lucía Ferrer</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                Data Engineer
              </div>
            </div>
            <img
              src={avatarLucia}
              alt="Lucía Ferrer"
              width={816}
              height={816}
              className="size-9 rounded-full object-cover outline-1 -outline-offset-1 outline-black/5"
            />
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric
            label="Postulaciones activas"
            value={String(active)}
            hint="▲ 3 esta semana"
            hintClass="text-good"
          />
          <Metric
            label="Entrevistas próximas"
            value={String(interviews)}
            hint="próxima en 2 días"
            hintClass="text-accent"
            delay="60ms"
          />
          <Metric
            label="Tasa de respuesta"
            value={`${rate}%`}
            hint="media 4,2 días"
            hintClass="text-muted"
            delay="120ms"
          />
          <Metric
            label="Coincidencia media"
            value={`${avgMatch}%`}
            hint={`sobre ${apps.length} vacantes`}
            hintClass="text-muted"
            delay="180ms"
          />
        </section>

        <section className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Tablero de postulaciones</h2>
              <span className={labelClass}>mueve una ficha con un clic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdding((v) => !v)}
                className="rounded-lg bg-ink text-ink-foreground text-sm font-medium px-3 py-2 transition-colors hover:bg-accent"
              >
                + Nueva postulación
              </button>
              <button
                onClick={() => setOnlyStrong((v) => !v)}
                className={`rounded-lg text-sm font-medium px-3 py-2 ring-1 transition-colors ${
                  onlyStrong
                    ? "bg-accent-soft ring-accent/40 text-accent"
                    : "bg-surface ring-black/10"
                }`}
              >
                {onlyStrong ? "Coincidencia ≥ 80%" : "Filtrar"}
              </button>
            </div>
          </div>

          {adding && (
            <div className="mb-3 rounded-2xl bg-surface ring-1 ring-black/5 p-4 rise">
              <div className={labelClass}>Nueva postulación</div>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field
                  label="Empresa"
                  value={draft.company}
                  onChange={(v) => setDraft((d) => ({ ...d, company: v }))}
                />
                <Field
                  label="Puesto"
                  value={draft.role}
                  onChange={(v) => setDraft((d) => ({ ...d, role: v }))}
                />
                <Field
                  label="Coincidencia %"
                  value={draft.match}
                  onChange={(v) => setDraft((d) => ({ ...d, match: v }))}
                  width="w-28"
                />
                <button
                  onClick={addApplication}
                  className="rounded-lg bg-accent text-accent-foreground text-sm font-semibold px-4 py-2 transition-colors hover:bg-ink"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {stages.map((stage) => {
              const cards = visible.filter((a) => a.stage === stage.id);
              return (
                <div key={stage.id} className="rounded-2xl bg-surface ring-1 ring-black/5 p-3">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span
                      className={`font-mono text-[11px] uppercase tracking-[0.12em] ${stageAccent[stage.id]}`}
                    >
                      {stage.label}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cards.map((app) => (
                      <Card
                        key={app.id}
                        app={app}
                        selected={app.id === selected.id}
                        onSelect={() => setSelectedId(app.id)}
                      />
                    ))}
                    {cards.length === 0 && (
                      <p className="px-1 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                        Sin fichas
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-4 grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl bg-surface ring-1 ring-black/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                  Detalle de vacante
                </div>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-balance">
                  {selected.role} · {selected.company}
                </h3>
                <div className="mt-1 text-sm text-muted">
                  {selected.location} · {selected.salary}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={labelClass}>Coincidencia</div>
                <div className="text-4xl font-bold tracking-tight text-accent">
                  {selected.match}%
                </div>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-line overflow-hidden">
              <div
                key={selected.id}
                className="h-full rounded-full bg-accent fillbar"
                style={{ "--w": `${selected.match}%` } as React.CSSProperties}
              />
            </div>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-background ring-1 ring-black/5 p-4">
                <div className={labelClass}>Sugerencias de IA para tu CV</div>
                <ul className="mt-2 space-y-2 text-sm">
                  {selected.suggestions.map((s, i) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-accent font-mono">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-pretty">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-background ring-1 ring-black/5 p-4">
                <div className={labelClass}>Tu CV</div>
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={cvPreview}
                    alt="Vista previa del CV"
                    loading="lazy"
                    width={816}
                    height={816}
                    className="size-14 rounded-lg object-cover outline-1 -outline-offset-1 outline-black/5 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">lucia_ferrer_cv.pdf</div>
                    <div className="font-mono text-[10px] text-muted">v4 · actualizado hoy</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <label className="cursor-pointer rounded-lg bg-accent text-accent-foreground text-sm font-medium px-3 py-2 transition-colors hover:bg-ink">
                    Subir nuevo
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" />
                  </label>
                  <button className="rounded-lg bg-surface ring-1 ring-black/10 text-sm font-medium px-3 py-2">
                    Editar
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-ink text-ink-foreground p-5 flex flex-col">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-foreground/50">
              Acción rápida
            </div>
            <div className="mt-2 text-lg font-semibold tracking-tight">
              Mover a la siguiente etapa
            </div>
            <p className="mt-1 text-sm text-ink-foreground/60 text-pretty">
              Avanza esta ficha con un clic firme. Se actualizará el tablero y tus métricas al
              instante.
            </p>
            <button
              onClick={advance}
              disabled={!advanceTo}
              className="mt-6 lg:mt-auto rounded-xl bg-accent text-accent-foreground text-sm font-semibold px-4 py-3 transition-colors hover:bg-surface hover:text-ink disabled:opacity-40 disabled:hover:bg-accent disabled:hover:text-accent-foreground"
            >
              {advanceTo
                ? `Avanzar a ${stages.find((s) => s.id === advanceTo)!.label} →`
                : "Sin siguiente etapa"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  hintClass,
  delay,
}: {
  label: string;
  value: string;
  hint: string;
  hintClass: string;
  delay?: string;
}) {
  return (
    <div
      className="rounded-2xl bg-surface ring-1 ring-black/5 p-4 rise"
      style={delay ? { animationDelay: delay } : undefined}
    >
      <div className={labelClass}>{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-4xl font-bold tracking-tight">{value}</span>
        <span className={`mb-1 font-mono text-[11px] ${hintClass}`}>{hint}</span>
      </div>
    </div>
  );
}

function Card({
  app,
  selected,
  onSelect,
}: {
  app: Application;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone: Record<StageId, string> = {
    guardada: "bg-background ring-black/5",
    postulada: "bg-background ring-black/5",
    entrevista: "bg-accent-soft ring-accent/30",
    oferta: "bg-surface ring-good/40",
    rechazo: "bg-background ring-black/5 opacity-70",
  };
  const bar: Record<StageId, string> = {
    guardada: "bg-accent",
    postulada: "bg-accent",
    entrevista: "bg-accent",
    oferta: "bg-good",
    rechazo: "bg-bad",
  };

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-3 ring-1 transition-shadow ${tone[app.stage]} ${
        selected ? "ring-2 ring-accent" : "hover:ring-ink/20"
      }`}
    >
      <div className="text-sm font-semibold leading-tight">{app.company}</div>
      <div className="text-[13px] text-muted mt-0.5">{app.role}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-line overflow-hidden">
          <div
            className={`h-full rounded-full fillbar ${bar[app.stage]}`}
            style={{ "--w": `${app.match}%` } as React.CSSProperties}
          />
        </div>
        <span className="font-mono text-[11px] text-muted">{app.match}%</span>
      </div>
      {app.note && (
        <div
          className={`mt-2 font-mono text-[10px] ${
            app.stage === "oferta" ? "text-good" : "text-accent"
          }`}
        >
          {app.note}
        </div>
      )}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  width = "w-56",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  width?: string;
}) {
  return (
    <label className={`${width} block`}>
      <span className={labelClass}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg bg-background ring-1 ring-black/10 px-3 py-2 text-sm outline-none focus:ring-accent"
      />
    </label>
  );
}
