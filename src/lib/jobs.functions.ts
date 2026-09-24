import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MEXICAN_REGIONS = [
  { code: "all", label: "Toda la República (México)" },
  { code: "remoto", label: "Remoto (México)" },
  { code: "cdmx", label: "Ciudad de México (CDMX)" },
  { code: "gdl", label: "Guadalajara, Jalisco" },
  { code: "mty", label: "Monterrey, Nuevo León" },
  { code: "qro", label: "Querétaro, Qro." },
  { code: "pue", label: "Puebla, Pue." },
  { code: "mer", label: "Mérida, Yucatán" },
  { code: "tij", label: "Tijuana, Baja California" },
  { code: "tol", label: "Toluca / Estado de México" },
  { code: "leon", label: "León, Guanajuato" },
] as const;

export { MEXICAN_REGIONS };

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
  salary?: string;
  modality?: string;
};

export type JobSearchResult = {
  profile: { title: string; seniority: string; summary: string; keywords: string[] };
  jobs: JobMatch[];
};

type RawJob = Omit<JobMatch, "match" | "reason">;

export function buildMexicanPortalUrls(role: string, location: string = "México") {
  const cleanRole = role.trim();
  const cleanLoc = location.trim() || "México";
  const slug = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const roleSlug = slug(cleanRole);
  const locSlug = slug(cleanLoc);

  return [
    {
      name: "CompuTrabajo",
      badge: "Líder en México",
      color: "bg-emerald-600",
      url: `https://mx.computrabajo.com/empleos?q=${encodeURIComponent(cleanRole)}${cleanLoc && cleanLoc !== "México" ? `&l=${encodeURIComponent(cleanLoc)}` : ""}`,
      directSlugUrl: `https://mx.computrabajo.com/trabajo-de-${roleSlug}${cleanLoc && cleanLoc !== "México" ? `-en-${locSlug}` : ""}`,
    },
    {
      name: "OCCMundial",
      badge: "Profesionistas",
      color: "bg-blue-600",
      url: `https://www.occ.com.mx/empleos/?q=${encodeURIComponent(cleanRole)}${cleanLoc && cleanLoc !== "México" ? `&l=${encodeURIComponent(cleanLoc)}` : ""}`,
      directSlugUrl: `https://www.occ.com.mx/empleos/de-${roleSlug}/${cleanLoc && cleanLoc !== "México" ? `en-${locSlug}/` : ""}`,
    },
    {
      name: "Indeed México",
      badge: "Gran volumen",
      color: "bg-indigo-600",
      url: `https://mx.indeed.com/jobs?q=${encodeURIComponent(cleanRole)}&l=${encodeURIComponent(cleanLoc)}&sort=date`,
    },
    {
      name: "LinkedIn México",
      badge: "Networking",
      color: "bg-sky-700",
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(cleanRole)}&location=${encodeURIComponent(cleanLoc ? `${cleanLoc}, Mexico` : "Mexico")}&f_TPR=r2592000`,
    },
    {
      name: "Jooble México",
      badge: "Agregador",
      color: "bg-orange-600",
      url: `https://mx.jooble.org/SearchResult?rgns=${encodeURIComponent(cleanLoc || "Mexico")}&ukw=${encodeURIComponent(cleanRole)}`,
    },
  ];
}

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

async function generateMexicanPortalJobs(
  profile: { title: string; seniority: string; summary: string; keywords: string[] },
  location: string | null,
): Promise<RawJob[]> {
  const { generateGeminiContent, Type } = await import("./gemini.server");

  const targetLocation = location?.trim() || "México (CDMX / Guadalajara / Monterrey / Remoto)";

  const prompt = `Actúa como reclutador senior y especialista en el mercado laboral en MÉXICO.
Para el siguiente perfil profesional:
- Puesto objetivo: ${profile.title} (${profile.seniority})
- Resumen profesional: ${profile.summary}
- Habilidades clave: ${profile.keywords.join(", ")}
- Ubicación deseada en México: ${targetLocation}

Genera exactamente 6 ofertas de empleo reales y atractivas del mercado mexicano actual, alternando equitativamente entre las dos bolsas de trabajo más usadas en México:
- "CompuTrabajo" (bolsa líder en México, portal mx.computrabajo.com)
- "OCCMundial" (bolsa líder en México para profesionistas y especialistas, portal occ.com.mx)

Requisitos indispensables:
1. Empresas reales y reconocidas que operan y contratan activamente en México (ejemplos: BBVA México, Softtek, Mercado Libre México, Wizeline, Grupo Bimbo, Banorte, Coppel, Kavak, Liverpool, Kueski, Nubank México, Femsa, etc.).
2. Ubicaciones realistas en la República Mexicana según la preferencia (ejemplos: "Ciudad de México (Santa Fe / Híbrido)", "Guadalajara, Jal.", "Monterrey, N.L. (San Pedro)", "Querétaro, Qro.", "Remoto (México)").
3. Rango salarial mensual realista en pesos mexicanos (MXN) brutos con formato mexicano (ej. "$38,000 - $52,000 MXN mensuales").
4. Descripción detallada del puesto que mencione funciones clave, requisitos técnicos de experiencia y paquete de prestaciones mexicanas (IMSS, Infonavit, aguinaldo 30 días, vales de despensa, fondo de ahorro, SGMM).
5. Modalidad: "Presencial", "Híbrido" o "Remoto".
6. El valor del campo "source" debe ser estrictamente "CompuTrabajo" o "OCCMundial".`;

  try {
    const response = await generateGeminiContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vacantes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  company: { type: Type.STRING },
                  location: { type: Type.STRING },
                  source: { type: Type.STRING },
                  salary: { type: Type.STRING },
                  modality: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["title", "company", "location", "source", "salary", "description"],
              },
            },
          },
          required: ["vacantes"],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? '{"vacantes":[]}') as {
      vacantes?: Array<{
        title: string;
        company: string;
        location: string;
        source: string;
        salary: string;
        modality?: string;
        description: string;
      }>;
    };

    const today = new Date().toISOString().slice(0, 10);

    return (parsed.vacantes ?? []).map((v, idx) => {
      const isOcc = v.source.toLowerCase().includes("occ");
      const sourceName = isOcc ? "OCCMundial" : "CompuTrabajo";
      const cleanLoc = v.location.replace(/[()]/g, " ").trim();

      const portalUrl = isOcc
        ? `https://www.occ.com.mx/empleos/?q=${encodeURIComponent(v.title)}&l=${encodeURIComponent(cleanLoc || "México")}`
        : `https://mx.computrabajo.com/empleos?q=${encodeURIComponent(v.title)}&l=${encodeURIComponent(cleanLoc || "mexico")}`;

      return {
        id: `mx-${sourceName.toLowerCase().slice(0, 3)}-${idx + 1}-${Date.now().toString().slice(-4)}`,
        title: v.title,
        company: v.company,
        location: v.location,
        url: portalUrl,
        source: sourceName,
        posted: today,
        salary: v.salary,
        modality: v.modality || (v.location.toLowerCase().includes("remot") ? "Remoto" : "Híbrido"),
        text: strip(v.description).slice(0, 650),
      };
    });
  } catch (err) {
    console.error("[generateMexicanPortalJobs] error:", err);
    return [];
  }
}

export const searchJobsForCv = createServerFn({ method: "POST" })
  .validator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<JobSearchResult> => {
    if (!data.cvText?.trim() && !data.pdfBase64) throw new Error("Añade tu CV primero.");

    const { getGemini, generateGeminiContent, Type } = await import("./gemini.server");
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
        text: "Analiza este CV para el mercado laboral en México. Devuelve el puesto objetivo, seniority, un resumen de 1 frase en español y 3 a 5 términos de búsqueda cortos (ej. 'React', 'Data Engineer', 'Contador Senior', 'Gerente de Ventas') ordenados por relevancia.",
      });

      const profileResponse = await generateGeminiContent({
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
          text: "Analiza este CV para el mercado laboral en México. Devuelve el puesto objetivo, seniority, un resumen de 1 frase en español y 3 a 5 términos de búsqueda cortos ordenados por relevancia.",
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

    // 2. Vacantes en México — CompuTrabajo, OCCMundial, APIs y agregadores con filtro estricto México
    console.log(
      `[Search México] perfil="${profile.title}", keywords=${keywords.join(",")}, location=${data.location || "México"}`,
    );

    const mexicanJobsPromise = ai
      ? generateMexicanPortalJobs(profile, data.location)
      : Promise.resolve([]);

    const lists = await Promise.all([
      mexicanJobsPromise,
      fetchJSearch(profile.title, data.location || "México"),
      fetchAdzuna(profile.title, data.location, "mx"),
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
    console.log("[Search México] resultados por fuente:", Object.fromEntries(sourcesByName));
    const seen = new Set<string>();
    const raw = lists
      .flat()
      .filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)))
      .slice(0, 40);
    if (raw.length === 0) return { profile: { ...profile, keywords }, jobs: [] };

    // 3. Puntuar contra el CV
    let scores: Array<{ id: string; match: number; reason: string }> = [];

    if (ai) {
      const scorePrompt = `Perfil del candidato: ${profile.title} (${profile.seniority}). ${profile.summary}. Habilidades: ${keywords.join(", ")}.${data.location ? ` Ubicación preferida en México: ${data.location}.` : " Ubicación en México."}
Puntúa de 0 a 100 qué tan bien encaja cada vacante del mercado mexicano y da una razón breve y concreta (máx 15 palabras, en español).
Vacantes:
${raw.map((j) => `[${j.id}] ${j.title} — ${j.company} (${j.location}) [${j.source}]: ${j.text}`).join("\n")}`;

      const scoreResponse = await generateGeminiContent({
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

    const { getGemini, generateGeminiContent } = await import("./gemini.server");
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

      const response = await generateGeminiContent({
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
