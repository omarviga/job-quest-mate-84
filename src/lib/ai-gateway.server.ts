import { createOpenAI } from "@ai-sdk/openai";

const RUN_ID = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId = runId || res.headers.get(RUN_ID) || undefined;
      return res;
    },
    getRunId: () => runId,
  };
}

export function createResponsesProvider(key: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch();
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch as typeof fetch,
  });
}

export const lovableReasoningOptions = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

export function getAiModel() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (lovableKey) {
    return {
      model: createResponsesProvider(lovableKey).responses("openai/gpt-6-astra"),
      reasoningOptions: lovableReasoningOptions,
    };
  }
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
