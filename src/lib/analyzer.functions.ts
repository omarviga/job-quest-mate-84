import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateGeminiContent, getGemini, Type } from "./gemini.server";

export interface KeywordSuggestion {
  keyword: string;
  category: string;
  importance: "crítica" | "recomendada";
  action: string;
}

export interface MatchAnalysisResult {
  matchPercentage: number;
  matchVerdict: string;
  matchingStrengths: string[];
  criticalGaps: string[];
  suggestedKeywords: KeywordSuggestion[];
  actionPlan: string[];
}

const AnalyzeInput = z.object({
  jobDescription: z
    .string()
    .min(10, "La descripción del puesto debe tener al menos 10 caracteres.")
    .max(50000),
  cvText: z.string().max(50000).nullable(),
  pdfBase64: z.string().max(14_000_000).nullable(),
});

export const analyzeCvMatch = createServerFn({ method: "POST" })
  .validator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data }): Promise<MatchAnalysisResult> => {
    if (!data.cvText?.trim() && !data.pdfBase64) {
      throw new Error("Por favor añade tu CV (texto o archivo PDF).");
    }
    if (!data.jobDescription.trim()) {
      throw new Error("Por favor ingresa la descripción del puesto.");
    }

    const ai = getGemini();
    if (!ai) {
      throw new Error(
        "La IA de Gemini no está configurada. Por favor verifica que GEMINI_API_KEY esté presente en las variables de entorno.",
      );
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    if (data.cvText?.trim()) {
      parts.push({ text: `=== CURRÍCULUM DEL CANDIDATO ===\n${data.cvText}` });
    }

    if (data.pdfBase64) {
      const cleanBase64 = data.pdfBase64.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: cleanBase64,
        },
      });
    }

    parts.push({
      text: `=== DESCRIPCIÓN DEL PUESTO / VACANTE ===
${data.jobDescription}

=== INSTRUCCIONES DE ANÁLISIS ===
Eres un reclutador técnico senior y experto en sistemas ATS (Applicant Tracking Systems).
Analiza minuciosamente el currículum del candidato contra la descripción del puesto.
Calcula un porcentaje de coincidencia objetivo y riguroso (0 a 100), identifica fortalezas clave y brechas críticas, y extrae palabras clave indispensables que el candidato debe incorporar o enfatizar en su currículum para mejorar su coincidencia.
Responde estrictamente en formato JSON según el esquema especificado.`,
    });

    const response = await generateGeminiContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchPercentage: {
              type: Type.INTEGER,
              description: "Porcentaje de coincidencia entre 0 y 100",
            },
            matchVerdict: {
              type: Type.STRING,
              description: "Veredicto conciso de compatibilidad",
            },
            matchingStrengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Fortalezas demostradas en el CV frente a esta vacante",
            },
            criticalGaps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Brechas o requisitos faltantes de la vacante",
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  keyword: { type: Type.STRING },
                  category: { type: Type.STRING },
                  importance: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ["keyword", "category", "importance", "action"],
              },
              description: "Palabras clave que el CV debería incluir o destacar",
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Acciones recomendadas para optimizar el CV",
            },
          },
          required: [
            "matchPercentage",
            "matchVerdict",
            "matchingStrengths",
            "criticalGaps",
            "suggestedKeywords",
            "actionPlan",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as MatchAnalysisResult;
    return {
      matchPercentage: Math.max(0, Math.min(100, Math.round(parsed.matchPercentage ?? 0))),
      matchVerdict: parsed.matchVerdict || "Análisis completado.",
      matchingStrengths: parsed.matchingStrengths || [],
      criticalGaps: parsed.criticalGaps || [],
      suggestedKeywords: (parsed.suggestedKeywords || []).map((k) => ({
        keyword: k.keyword,
        category: k.category,
        importance: k.importance?.toLowerCase().includes("cr") ? "crítica" : "recomendada",
        action: k.action,
      })),
      actionPlan: parsed.actionPlan || [],
    };
  });
