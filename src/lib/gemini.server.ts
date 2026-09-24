import fs from "node:fs";
import path from "node:path";
import {
  GoogleGenAI,
  Type,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from "@google/genai";

let cachedKey: string | null = null;
let geminiClient: GoogleGenAI | null = null;

export function resolveGeminiApiKey(): string | null {
  let key = process.env.GEMINI_API_KEY?.trim();

  // If missing or dummy placeholder injected by supervisor
  if (!key || key === "MY_GEMINI_API_KEY" || key === "your-gemini-api-key") {
    // Attempt to read from .env.local or .env
    const envFiles = [".env.local", ".env"];
    for (const file of envFiles) {
      try {
        const filePath = path.resolve(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
          if (match && match[1]) {
            const parsed = match[1].trim().replace(/^["']|["']$/g, "");
            if (parsed && parsed !== "MY_GEMINI_API_KEY" && parsed !== "your-gemini-api-key") {
              key = parsed;
              process.env.GEMINI_API_KEY = parsed;
              break;
            }
          }
        }
      } catch {
        // Silently continue
      }
    }
  }

  if (key && key !== "MY_GEMINI_API_KEY" && key !== "your-gemini-api-key") {
    return key;
  }
  return null;
}

export function getGemini(): GoogleGenAI | null {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  if (!geminiClient || cachedKey !== apiKey) {
    cachedKey = apiKey;
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  return geminiClient;
}

/**
 * Executes a Gemini generateContent request with automatic resilience:
 * If the primary model (e.g. gemini-3.8-flash) encounters temporary high demand (HTTP 503/429),
 * it seamlessly retries with fallback models (gemini-3.5-flash, gemini-3.1-flash-lite).
 */
export async function generateGeminiContent(
  params: GenerateContentParameters,
): Promise<GenerateContentResponse> {
  const ai = getGemini();
  if (!ai) {
    throw new Error(
      "La API de Gemini no está configurada o la clave actual no es válida. Por favor verifica GEMINI_API_KEY en la configuración.",
    );
  }

  const requestedModel = params.model || "gemini-3.8-flash";
  const fallbackModels = [requestedModel, "gemini-3.5-flash", "gemini-3.1-flash-lite"].filter(
    (m, i, arr) => arr.indexOf(m) === i,
  );

  let lastError: unknown = null;

  for (const model of fallbackModels) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);

      // If error indicates API key invalid, throw clear actionable message
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        throw new Error(
          "La clave de API de Gemini (GEMINI_API_KEY) no es válida. Por favor configúrala en el panel de Secretos o Variables de Entorno.",
        );
      }

      // If high demand (503 / 429) or transient server issue, try next model in fallback list
      const isTransient =
        errMsg.includes("503") ||
        errMsg.includes("UNAVAILABLE") ||
        errMsg.includes("high demand") ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED");

      if (isTransient && model !== fallbackModels[fallbackModels.length - 1]) {
        console.warn(`[Gemini] ${model} unavailable (${errMsg}). Trying fallback model...`);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

export { Type };
