import type { ModelProviderConfig } from "../config/config.js";

export const MINIMAX_PROVIDER_CONFIG: ModelProviderConfig = {
  baseUrl: "https://api.minimax.io/anthropic",
  apiKey: "env:MINIMAX_API_KEY",
  api: "anthropic-messages",
  authHeader: true,
  models: [
    {
      id: "MiniMax-M2.1",
      name: "MiniMax M2.1",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.15, // Approx pricing per 1M tokens, adjust as needed
        output: 0.6,
        cacheRead: 0.075,
        cacheWrite: 0.15,
      },
      contextWindow: 128000, // Adjust based on specific model limits
      maxTokens: 8192,
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
        maxTokensField: "max_tokens",
      },
    },
    {
      id: "MiniMax-M2.1-lightning",
      name: "MiniMax M2.1 Lightning",
      reasoning: false,
      input: ["text"],
      cost: {
        input: 0.1,
        output: 0.4,
        cacheRead: 0.05,
        cacheWrite: 0.1,
      },
      contextWindow: 128000,
      maxTokens: 8192,
      compat: {
        supportsStore: false,
        supportsDeveloperRole: false,
        supportsReasoningEffort: false,
        maxTokensField: "max_tokens",
      },
    },
  ],
};
