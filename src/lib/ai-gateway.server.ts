import { createOpenAI } from "@ai-sdk/openai";

export function getAiModel() {
  const userKey = process.env["OPENAI_API_KEY"];
  if (userKey) {
    const isGroq = userKey.startsWith("gsk_");
    const defaultBase = isGroq ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1";
    const defaultModel = isGroq ? "llama-3.3-70b-versatile" : "gpt-4.1-mini";
    const provider = createOpenAI({
      baseURL: (process.env["OPENAI_BASE_URL"] || defaultBase).replace(/\/$/, ""),
      apiKey: userKey,
    });
    return {
      model: provider.chat(process.env["OPENAI_MODEL"] || defaultModel),
      reasoningOptions: undefined,
    };
  }
  return null;
}
