import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADZUNA_COUNTRIES = [
  { code: "us", label: "Estados Unidos" },
  { code: "gb", label: "Reino Unido" },
  { code: "ca", label: "Canadá" },
  { code: "au", label: "Australia" },
  { code: "de", label: "Alemania" },
  { code: "fr", label: "Francia" },
  { code: "in", label: "India" },
  { code: "br", label: "Brasil" },
  { code: "pl", label: "Polonia" },
  { code: "za", label: "Sudáfrica" },
  { code: "nz", label: "Nueva Zelanda" },
  { code: "at", label: "Austria" },
] as const;

export type AdzunaCountry = (typeof ADZUNA_COUNTRIES)[number];
export { ADZUNA_COUNTRIES };

const Input = z.object({
  cvText: z.string().max(40000).nullable(),
  pdfBase64: z.string().max(14_000_000).nullable(),
  location: z.string().max(80).nullable(),
});

export type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  posted: string;
  match: number;
  reason: string;
  text: string;
};

export type JobSearchResult = {
  profile: { title: string; seniority: string; summary: string; keywords: string[] };
  jobs: JobMatch[];
};

type RawJob = Omit<JobMatch, "match" | "reason">;

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function fetchRemotiveSingle(term: string): Promise<RawJob[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(term)}&limit=20`;
    console.log(`[Remotive] buscando: "${term}"`);
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`[Remotive] HTTP ${r.status} para "${term}"`);
      return [];
    }
    const j = (await r.json()) as {
      jobs?: Array<{
        id: string | number;
        title: string;
        company_name: string;
        candidate_required_location?: string;
        url: string;
        publication_date?: string;
        description?: string;
      }>;
    };
    const results = (j.jobs ?? []).map((x) => ({
      id: `rm-${x.id}`,
      title: x.title,
      company: x.company_name,
      location: x.candidate_required_location || "Remoto",
      url: x.url,
      source: "Remotive",
      posted: x.publication_date?.slice(0, 10) ?? "",
      text: strip(x.description ?? "").slice(0, 500),
    }));
    console.log(`[Remotive] ${results.length} resultados para "${term}"`);
    return results;
  } catch (e) {
    console.error(`[Remotive] error para "${term}":`, e);
    return [];
  }
}

async function fetchRemotive(terms: string[]): Promise<RawJob[]> {
  const searches = terms.filter(Boolean).slice(0, 3);
  if (searches.length === 0) return [];
  const lists = await Promise.all(searches.map((t) => fetchRemotiveSingle(t)));
  const seen = new Set<string>();

  // Filter for Mexico / Global remote
  const validLocations = [
    "mexico",
    "méxico",
    "worldwide",
    "anywhere",
    "global",
    "americas",
    "latam",
  ];

  return lists.flat().filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);

    const loc = j.location.toLowerCase();
    return validLocations.some((v) => loc.includes(v));
  });
}

async function fetchJSearch(term: string, where: string | null = "México"): Promise<RawJob[]> {
  const key = process.env["JSEARCH_API_KEY"];
  if (!key) {
    console.warn("[JSearch] sin credenciales (JSEARCH_API_KEY en .env.local)");
    return [];
  }
  try {
    const query = `${term} en ${where || "México"}`;
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&country=mx`;
    console.log(`[JSearch] buscando: "${query}"`);
    const r = await fetch(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });
    if (!r.ok) {
      console.warn(`[JSearch] HTTP ${r.status} para "${query}"`);
      return [];
    }
    const j = (await r.json()) as {
      data?: Array<{
        job_id: string;
        job_title: string;
        employer_name: string;
        job_city?: string;
        job_state?: string;
        job_apply_link?: string;
        job_google_link?: string;
        job_posted_at_datetime_utc?: string;
        job_description?: string;
      }>;
    };
    const results = (j.data ?? []).map((x) => ({
      id: `js-${x.job_id}`,
      title: x.job_title,
      company: x.employer_name,
      location: `${x.job_city || ""}, ${x.job_state || ""}, México`.replace(/^, |, $/g, "").trim(),
      url: x.job_apply_link || x.job_google_link || "",
      source: "JSearch",
      posted: x.job_posted_at_datetime_utc?.slice(0, 10) ?? "",
      text: strip(x.job_description ?? "").slice(0, 500),
    }));
    console.log(`[JSearch] ${results.length} resultados para "${query}"`);
    return results;
  } catch (e) {
    console.error(`[JSearch] error para "${term}":`, e);
    return [];
  }
}

async function fetchAdzuna(term: string, where: string | null, country = "us"): Promise<RawJob[]> {
  const id = process.env["ADZUNA_APP_ID"];
  const key = process.env["ADZUNA_APP_KEY"];
  if (!id || !key) {
    console.warn("[Adzuna] sin credenciales (ADZUNA_APP_ID / ADZUNA_APP_KEY)");
    return [];
  }
  try {
    const q = new URLSearchParams({ app_id: id, app_key: key, what: term, results_per_page: "20" });
    if (where) q.set("where", where);
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${q}`;
    console.log(`[Adzuna/${country}] buscando: "${term}"${where ? ` en "${where}"` : ""}`);
    const r = await fetch(url);
    if (!r.ok) {
      console.warn(`[Adzuna/${country}] HTTP ${r.status} para "${term}"`);
      return [];
    }
    const j = (await r.json()) as {
      results?: Array<{
        id: string | number;
        title?: string;
        company?: { display_name?: string };
        location?: { display_name?: string };
        redirect_url: string;
        created?: string;
        description?: string;
      }>;
    };
    const results = (j.results ?? []).map((x) => ({
      id: `az-${x.id}`,
      title: strip(x.title ?? ""),
      company: x.company?.display_name ?? "Empresa confidencial",
      location: x.location?.display_name ?? country.toUpperCase(),
      url: x.redirect_url,
      source: "Adzuna",
      posted: x.created?.slice(0, 10) ?? "",
      text: strip(x.description ?? "").slice(0, 500),
    }));
    console.log(`[Adzuna/${country}] ${results.length} resultados para "${term}"`);
    return results;
  } catch (e) {
    console.error(`[Adzuna/${country}] error para "${term}":`, e);
    return [];
  }
}

async function fetchArbeitnow(terms: string[]): Promise<RawJob[]> {
  try {
    console.log(`[Arbeitnow] buscando con términos: ${terms.join(", ")}`);
    const r = await fetch("https://www.arbeitnow.com/api/job-board-api");
    if (!r.ok) {
      console.warn(`[Arbeitnow] HTTP ${r.status}`);
      return [];
    }
    const j = (await r.json()) as {
      data?: Array<{
        slug: string;
        title: string;
        company_name: string;
        tags?: string[];
        remote?: boolean;
        location: string;
        url: string;
        created_at?: number;
        description?: string;
      }>;
    };
    const ts = terms.map((t) => t.toLowerCase());
    const results = (j.data ?? [])
      .filter((x) => {
        const hay = `${x.title} ${(x.tags ?? []).join(" ")}`.toLowerCase();
        return ts.some((t) => hay.includes(t));
      })
      .slice(0, 15)
      .map((x) => ({
        id: `an-${x.slug}`,
        title: x.title,
        company: x.company_name,
        location: x.remote ? `Remoto · ${x.location}` : x.location,
        url: x.url,
        source: "Arbeitnow",
        posted: x.created_at ? new Date(x.created_at * 1000).toISOString().slice(0, 10) : "",
        text: strip(x.description ?? "").slice(0, 500),
      }));
    console.log(`[Arbeitnow] ${results.length} resultados`);
    return results;
  } catch (e) {
    console.error("[Arbeitnow] error:", e);
    return [];
  }
}

export const searchJobsForCv = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<JobSearchResult> => {
    if (!data.cvText?.trim() && !data.pdfBase64) throw new Error("Añade tu CV primero.");

    const { getGemini, Type } = await import("./gemini.server");
    const ai = getGemini();

    let profile: { title: string; seniority: string; summary: string; keywords: string[] };

    if (ai) {
      // 1. Perfil a partir del CV con Gemini
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];
      if (data.cvText?.trim()) parts.push({ text: `CV:\n${data.cvText}` });
      if (data.pdfBase64) {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: data.pdfBase64.replace(/^data:[^;]+;base64,/, ""),
          },
        });
      }
      parts.push({
        text: "Analiza este CV. Devuelve el puesto objetivo, seniority, un resumen de 1 frase en español y 3 a 5 términos de búsqueda cortos EN INGLÉS (1-2 palabras cada uno, p.ej. 'react', 'data engineer') ordenados por relevancia.",
      });

      const profileResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              seniority: { type: Type.STRING },
              summary: { type: Type.STRING },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["title", "seniority", "summary", "keywords"],
          },
        },
      });

      profile = JSON.parse(profileResponse.text ?? "{}") as {
        title: string;
        seniority: string;
        summary: string;
        keywords: string[];
      };
    } else {
      const { streamText, Output } = await import("ai");
      const { getAiModel } = await import("./ai-gateway.server");
      const runtime = getAiModel();
      if (!runtime) {
        throw new Error(
          "La IA no está configurada. Por favor añade tu clave de API GEMINI_API_KEY en las variables de entorno.",
        );
      }
      const content: Array<
        | { type: "text"; text: string }
        | { type: "file"; data: string; mediaType: string; filename: string }
      > = [
        {
          type: "text",
          text: "Analiza este CV. Devuelve el puesto objetivo, seniority, un resumen de 1 frase en español y 3 a 5 términos de búsqueda cortos EN INGLÉS (1-2 palabras cada uno, p.ej. 'react', 'data engineer') ordenados por relevancia.",
        },
      ];
      if (data.cvText?.trim()) content.push({ type: "text", text: `CV:\n${data.cvText}` });
      if (data.pdfBase64)
        content.push({
          type: "file",
          data: data.pdfBase64,
          mediaType: "application/pdf",
          filename: "cv.pdf",
        });

      const p = streamText({
        model: runtime.model,
        messages: [{ role: "user", content }],
        output: Output.object({
          schema: z.object({
            title: z.string(),
            seniority: z.string(),
            summary: z.string(),
            keywords: z.array(z.string()),
          }),
        }),
      });
      profile = await p.output;
    }

    const keywords = (profile.keywords ?? []).slice(0, 5);

    // 2. Vacantes reales — consultar todas las fuentes en paralelo con enfoque en México
    console.log(
      `[Search] perfil="${profile.title}", keywords=${keywords.join(",")}, location=${data.location || "México"}`,
    );

    const lists = await Promise.all([
      fetchJSearch(profile.title, data.location),
      keywords[0] ? fetchJSearch(keywords[0], data.location) : Promise.resolve([]),
      fetchRemotive([profile.title, ...keywords.slice(0, 2)]),
      fetchArbeitnow(keywords).then((jobs) =>
        jobs.filter(
          (j) =>
            j.location.toLowerCase().includes("remot") ||
            j.location.toLowerCase().includes("mexico") ||
            j.location.toLowerCase().includes("méxico"),
        ),
      ),
    ]);
    const sourcesByName = new Map<string, number>();
    for (const list of lists) {
      for (const j of list) {
        sourcesByName.set(j.source, (sourcesByName.get(j.source) ?? 0) + 1);
      }
    }
    console.log("[Search] resultados por fuente:", Object.fromEntries(sourcesByName));
    const seen = new Set<string>();
    const raw = lists
      .flat()
      .filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)))
      .slice(0, 40);
    if (raw.length === 0) return { profile: { ...profile, keywords }, jobs: [] };

    // 3. Puntuar contra el CV
    let scores: Array<{ id: string; match: number; reason: string }> = [];

    if (ai) {
      const scorePrompt = `Perfil del candidato: ${profile.title} (${profile.seniority}). ${profile.summary}. Habilidades: ${keywords.join(", ")}.${data.location ? ` Prefiere ubicación: ${data.location}.` : ""}
Puntúa de 0 a 100 qué tan bien encaja cada vacante y da una razón breve (máx 15 palabras, en español).
Vacantes:
${raw.map((j) => `[${j.id}] ${j.title} — ${j.company} (${j.location}): ${j.text}`).join("\n")}`;

      const scoreResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: scorePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    match: { type: Type.INTEGER },
                    reason: { type: Type.STRING },
                  },
                  required: ["id", "match", "reason"],
                },
              },
            },
            required: ["scores"],
          },
        },
      });

      const parsedScores = JSON.parse(scoreResponse.text ?? '{"scores":[]}') as {
        scores: Array<{ id: string; match: number; reason: string }>;
      };
      scores = parsedScores.scores ?? [];
    } else {
      const { streamText, Output } = await import("ai");
      const { getAiModel } = await import("./ai-gateway.server");
      const runtime = getAiModel();
      if (!runtime) {
        throw new Error(
          "La IA no está configurada. Por favor añade tu clave de API GEMINI_API_KEY en las variables de entorno.",
        );
      }
      const s = streamText({
        model: runtime.model,
        prompt: `Perfil del candidato: ${profile.title} (${profile.seniority}). ${profile.summary}. Habilidades: ${keywords.join(", ")}.${data.location ? ` Prefiere ubicación: ${data.location}.` : ""}
Puntúa de 0 a 100 qué tan bien encaja cada vacante y da una razón breve (máx 15 palabras, en español).
Vacantes:
${raw.map((j) => `[${j.id}] ${j.title} — ${j.company} (${j.location}): ${j.text}`).join("\n")}`,
        output: Output.object({
          schema: z.object({
            scores: z.array(z.object({ id: z.string(), match: z.number(), reason: z.string() })),
          }),
        }),
      });
      const outputData = await s.output;
      scores = outputData.scores;
    }

    const byId = new Map(scores.map((x) => [x.id, x]));
    const jobs = raw
      .map((j) => {
        const sc = byId.get(j.id);
        return {
          ...j,
          match: Math.max(0, Math.min(100, Math.round(sc?.match ?? 0))),
          reason: sc?.reason ?? "",
        };
      })
      .sort((a, b) => b.match - a.match);

    return { profile: { ...profile, keywords }, jobs };
  });

const TailorInput = z.object({
  cvText: z.string().max(40000).nullable(),
  pdfBase64: z.string().max(14_000_000).nullable(),
  job: z.object({
    title: z.string(),
    company: z.string(),
    location: z.string(),
    text: z.string().max(4000),
  }),
});

export const tailorCv = createServerFn({ method: "POST" })
  .validator((d: unknown) => TailorInput.parse(d))
  .handler(async ({ data }): Promise<{ cv: string }> => {
    if (!data.cvText?.trim() && !data.pdfBase64) throw new Error("Añade tu CV primero.");

    const { getGemini } = await import("./gemini.server");
    const ai = getGemini();

    if (ai) {
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];
      if (data.cvText?.trim()) parts.push({ text: `CV actual:\n${data.cvText}` });
      if (data.pdfBase64) {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: data.pdfBase64.replace(/^data:[^;]+;base64,/, ""),
          },
        });
      }
      parts.push({
        text: `Reescribe el CV del candidato adaptado a esta vacante. Reglas: NO inventes experiencia, empresas, fechas ni títulos; solo reordena, reformula y destaca lo relevante usando palabras clave de la vacante. Escribe en el idioma de la vacante. Formato Markdown: nombre como # título, datos de contacto, ## Perfil (3 líneas), ## Experiencia (viñetas con logros), ## Habilidades, ## Educación. Máximo una página. Devuelve solo el CV.
Vacante: ${data.job.title} — ${data.job.company} (${data.job.location})
${data.job.text}`,
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: { parts },
      });

      const cv = response.text?.trim();
      if (!cv) throw new Error("La IA no devolvió un CV. Inténtalo de nuevo.");
      return { cv };
    }

    const { streamText } = await import("ai");
    const { getAiModel } = await import("./ai-gateway.server");
    const runtime = getAiModel();
    if (!runtime) {
      throw new Error(
        "La IA no está configurada. Por favor añade tu clave de API GEMINI_API_KEY en las variables de entorno.",
      );
    }
    const content: Array<
      | { type: "text"; text: string }
      | { type: "file"; data: string; mediaType: string; filename: string }
    > = [
      {
        type: "text",
        text: `Reescribe el CV del candidato adaptado a esta vacante. Reglas: NO inventes experiencia, empresas, fechas ni títulos; solo reordena, reformula y destaca lo relevante usando palabras clave de la vacante. Escribe en el idioma de la vacante. Formato Markdown: nombre como # título, datos de contacto, ## Perfil (3 líneas), ## Experiencia (viñetas con logros), ## Habilidades, ## Educación. Máximo una página. Devuelve solo el CV.
Vacante: ${data.job.title} — ${data.job.company} (${data.job.location})
${data.job.text}`,
      },
    ];
    if (data.cvText?.trim()) content.push({ type: "text", text: `CV actual:\n${data.cvText}` });
    if (data.pdfBase64)
      content.push({
        type: "file",
        data: data.pdfBase64,
        mediaType: "application/pdf",
        filename: "cv.pdf",
      });
    const r = streamText({
      model: runtime.model,
      messages: [{ role: "user", content }],
    });
    const cv = (await r.text).trim();
    if (!cv) throw new Error("La IA no devolvió un CV. Inténtalo de nuevo.");
    return { cv };
  });
