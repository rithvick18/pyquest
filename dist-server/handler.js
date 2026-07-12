import { GoogleGenAI } from "@google/genai";
class BaseProvider {
  async testConnection(config) {
    try {
      const status = await this.getStatus(config);
      return status === "ACTIVE" || status === "LOCAL_ONLY";
    } catch {
      return false;
    }
  }
  // Normalizes messages into unified string structure for providers that don't support chat objects
  formatMessagesToSinglePrompt(contents) {
    if (typeof contents === "string") {
      return contents;
    }
    return contents.map((msg) => {
      const role = msg.role === "system" ? "System" : msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    }).join("\n\n") + "\n\nAssistant:";
  }
}
const _ConfigService = class _ConfigService {
  static get() {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }
  static loadConfig() {
    const env = process.env || {};
    return {
      defaultProvider: env.AI_PROVIDER || "gemini",
      temperature: parseFloat(env.AI_TEMPERATURE || "0.7"),
      maxTokens: parseInt(env.AI_MAX_TOKENS || "2048", 10),
      timeout: parseInt(env.AI_TIMEOUT || "30000", 10),
      // 30 seconds default
      retries: parseInt(env.AI_RETRIES || "3", 10),
      providers: {
        gemini: {
          apiKey: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY,
          defaultModel: env.GEMINI_MODEL || "gemini-2.5-flash"
        },
        openai: {
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
          defaultModel: env.OPENAI_MODEL || "gpt-4o-mini"
        },
        anthropic: {
          apiKey: env.ANTHROPIC_API_KEY,
          baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1",
          defaultModel: env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
        },
        groq: {
          apiKey: env.GROQ_API_KEY,
          baseUrl: env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
          defaultModel: env.GROQ_MODEL || "llama-3.3-70b-versatile"
        },
        together: {
          apiKey: env.TOGETHER_API_KEY,
          baseUrl: env.TOGETHER_BASE_URL || "https://api.together.xyz/v1",
          defaultModel: env.TOGETHER_MODEL || "meta-llama/Llama-3-70b-chat-hf"
        },
        openrouter: {
          apiKey: env.OPENROUTER_API_KEY,
          baseUrl: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
          defaultModel: env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
        },
        mistral: {
          apiKey: env.MISTRAL_API_KEY,
          baseUrl: env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
          defaultModel: env.MISTRAL_MODEL || "mistral-tiny"
        },
        ollama: {
          baseUrl: env.OLLAMA_BASE_URL || "http://localhost:11434",
          defaultModel: env.OLLAMA_MODEL || "llama3"
        },
        lmstudio: {
          baseUrl: env.LMSTUDIO_BASE_URL || "http://localhost:1234",
          defaultModel: env.LMSTUDIO_MODEL || "meta-llama-3-8b-instruct"
        },
        bedrock: {
          region: env.AWS_REGION || "us-east-1",
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          defaultModel: env.BEDROCK_MODEL || "anthropic.claude-3-5-sonnet-20241022-v2:0"
        }
      }
    };
  }
};
_ConfigService.config = null;
let ConfigService = _ConfigService;
class AIError extends Error {
  constructor(message, providerId, status, details) {
    super(message);
    this.name = "AIError";
    this.providerId = providerId;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
class AuthenticationError extends AIError {
  constructor(message, providerId, status, details) {
    super(message, providerId, status, details);
    this.name = "AuthenticationError";
  }
}
class RateLimitError extends AIError {
  constructor(message, providerId, status, details) {
    super(message, providerId, status, details);
    this.name = "RateLimitError";
  }
}
class TimeoutError extends AIError {
  constructor(message, providerId, status, details) {
    super(message, providerId, status, details);
    this.name = "TimeoutError";
  }
}
class ProviderError extends AIError {
  constructor(message, providerId, status, details) {
    super(message, providerId, status, details);
    this.name = "ProviderError";
  }
}
class GeminiProvider extends BaseProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "gemini",
      name: "Google Gemini",
      capabilities: {
        vision: true,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  async generateContent(context) {
    const config = ConfigService.get();
    const providerConfig = context.providerConfig;
    const apiKey = (providerConfig == null ? void 0 : providerConfig.apiKey) || config.providers.gemini.apiKey;
    if (!apiKey || apiKey === "your_api_key_here") {
      throw new AuthenticationError(
        "Google Gemini API key is missing. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY.",
        "gemini"
      );
    }
    const modelName = context.options.model || (providerConfig == null ? void 0 : providerConfig.model) || config.providers.gemini.defaultModel;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const contents = context.contents;
      let geminiContents;
      if (typeof contents === "string") {
        geminiContents = contents;
      } else {
        const nonSystemMessages = contents.filter((m) => m.role !== "system");
        geminiContents = nonSystemMessages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));
      }
      const geminiConfig = {
        temperature: context.options.temperature ?? (providerConfig == null ? void 0 : providerConfig.temperature) ?? config.temperature,
        maxOutputTokens: context.options.maxTokens ?? (providerConfig == null ? void 0 : providerConfig.maxTokens) ?? config.maxTokens
      };
      let systemInstruction = context.options.systemInstruction;
      if (!systemInstruction && Array.isArray(contents)) {
        const sysMsg = contents.find((m) => m.role === "system");
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }
      if (systemInstruction) {
        geminiConfig.systemInstruction = systemInstruction;
      }
      if (context.options.responseMimeType) {
        geminiConfig.responseMimeType = context.options.responseMimeType;
      }
      if (context.options.responseSchema) {
        geminiConfig.responseSchema = context.options.responseSchema;
      }
      const response = await ai.models.generateContent({
        model: modelName,
        contents: geminiContents,
        config: geminiConfig
      });
      const text = response.text || "";
      const usageMetadata = response.usageMetadata;
      return {
        text,
        usage: {
          promptTokens: (usageMetadata == null ? void 0 : usageMetadata.promptTokenCount) || 0,
          completionTokens: (usageMetadata == null ? void 0 : usageMetadata.candidatesTokenCount) || 0,
          totalTokens: (usageMetadata == null ? void 0 : usageMetadata.totalTokenCount) || 0
        },
        provider: "gemini",
        model: modelName,
        requestId: context.requestId
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }
  async getStatus(config) {
    const apiKey = (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.gemini.apiKey;
    if (!apiKey || apiKey === "your_api_key_here") {
      return "DISABLED";
    }
    return "ACTIVE";
  }
  wrapError(error) {
    const msg = error.message || "";
    if (msg.includes("API_KEY") || msg.includes("API key") || msg.includes("401") || msg.includes("authentication") || msg.includes("key is invalid")) {
      return new AuthenticationError(msg, "gemini", error.status || 401);
    }
    if (msg.includes("rate") || msg.includes("quota") || msg.includes("429")) {
      return new RateLimitError(msg, "gemini", error.status || 429);
    }
    if (msg.includes("timeout") || msg.includes("deadline")) {
      return new TimeoutError(msg, "gemini", error.status || 408);
    }
    return new ProviderError(msg, "gemini", error.status || 500, error);
  }
}
class OpenAICompatibleProvider extends BaseProvider {
  async generateContent(context) {
    var _a, _b, _c;
    const providerConfig = context.providerConfig;
    const apiKey = this.getApiKey(providerConfig);
    const baseUrl = (providerConfig == null ? void 0 : providerConfig.baseUrl) || this.getBaseUrl(providerConfig);
    const modelName = context.options.model || (providerConfig == null ? void 0 : providerConfig.model) || this.getDefaultModel(providerConfig);
    const headers = {
      "Content-Type": "application/json"
    };
    if (apiKey && apiKey !== "your_api_key_here") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const messages = [];
    let systemInstruction = context.options.systemInstruction;
    const contents = context.contents;
    if (typeof contents === "string") {
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: contents });
    } else {
      if (!systemInstruction) {
        const sysMsg = contents.find((m) => m.role === "system");
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      contents.forEach((msg) => {
        if (msg.role !== "system") {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    const requestBody = {
      model: modelName,
      messages,
      temperature: context.options.temperature ?? (providerConfig == null ? void 0 : providerConfig.temperature) ?? 0.7,
      max_tokens: context.options.maxTokens ?? (providerConfig == null ? void 0 : providerConfig.maxTokens) ?? 2048
    };
    if (context.options.responseMimeType === "application/json") {
      requestBody.response_format = { type: "json_object" };
    }
    const timeout = context.options.timeout ?? (providerConfig == null ? void 0 : providerConfig.timeout) ?? 3e4;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errText}`);
      }
      const responseData = await response.json();
      const text = ((_c = (_b = (_a = responseData.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "";
      const usage = responseData.usage;
      return {
        text,
        usage: usage ? {
          promptTokens: usage.prompt_tokens || 0,
          completionTokens: usage.completion_tokens || 0,
          totalTokens: usage.total_tokens || 0
        } : void 0,
        provider: this.metadata.id,
        model: modelName,
        requestId: context.requestId
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.wrapError(error);
    }
  }
  async getStatus(config) {
    if (this.metadata.isLocal) {
      return "LOCAL_ONLY";
    }
    const key = (config == null ? void 0 : config.apiKey) || this.getApiKey();
    if (!key || key === "your_api_key_here") {
      return "DISABLED";
    }
    return "ACTIVE";
  }
  wrapError(error) {
    const msg = error.message || "";
    if (error.name === "AbortError") {
      return new TimeoutError(`Request timed out for provider "${this.metadata.id}"`, this.metadata.id);
    }
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("auth") || msg.includes("key")) {
      return new AuthenticationError(msg, this.metadata.id, 401);
    }
    if (msg.includes("429") || msg.includes("rate") || msg.includes("quota")) {
      return new RateLimitError(msg, this.metadata.id, 429);
    }
    return new ProviderError(msg, this.metadata.id, 500, error);
  }
}
class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "openai",
      name: "OpenAI",
      capabilities: {
        vision: true,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.openai.apiKey;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.openai.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.openai.defaultModel;
  }
}
class GroqProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "groq",
      name: "Groq",
      capabilities: {
        vision: false,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.groq.apiKey;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.groq.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.groq.defaultModel;
  }
}
class TogetherProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "together",
      name: "Together AI",
      capabilities: {
        vision: false,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.together.apiKey;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.together.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.together.defaultModel;
  }
}
class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "openrouter",
      name: "OpenRouter",
      capabilities: {
        vision: true,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.openrouter.apiKey;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.openrouter.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.openrouter.defaultModel;
  }
}
class LMStudioProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "lmstudio",
      name: "LM Studio (Local)",
      capabilities: {
        vision: false,
        json: true,
        streaming: true,
        tools: false
      },
      isLocal: true
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || void 0;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.lmstudio.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.lmstudio.defaultModel;
  }
}
class OllamaProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "ollama",
      name: "Ollama (Local)",
      capabilities: {
        vision: false,
        json: true,
        streaming: true,
        tools: false
      },
      isLocal: true
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || void 0;
  }
  getBaseUrl(config) {
    const rawUrl = (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.ollama.baseUrl;
    if (rawUrl.endsWith("/v1")) return rawUrl;
    if (rawUrl.endsWith("/")) return `${rawUrl}v1`;
    return `${rawUrl}/v1`;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.ollama.defaultModel;
  }
}
class MistralProvider extends OpenAICompatibleProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "mistral",
      name: "Mistral",
      capabilities: {
        vision: false,
        json: false,
        streaming: true,
        tools: false
      },
      isLocal: false
    };
  }
  getApiKey(config) {
    return (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.mistral.apiKey;
  }
  getBaseUrl(config) {
    return (config == null ? void 0 : config.baseUrl) || ConfigService.get().providers.mistral.baseUrl;
  }
  getDefaultModel(config) {
    return (config == null ? void 0 : config.model) || ConfigService.get().providers.mistral.defaultModel;
  }
}
class AnthropicProvider extends BaseProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "anthropic",
      name: "Anthropic Claude",
      capabilities: {
        vision: true,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  async generateContent(context) {
    var _a, _b;
    const config = ConfigService.get();
    const providerConfig = context.providerConfig;
    const apiKey = (providerConfig == null ? void 0 : providerConfig.apiKey) || config.providers.anthropic.apiKey;
    const baseUrl = (providerConfig == null ? void 0 : providerConfig.baseUrl) || config.providers.anthropic.baseUrl;
    const modelName = context.options.model || (providerConfig == null ? void 0 : providerConfig.model) || config.providers.anthropic.defaultModel;
    if (!apiKey || apiKey === "your_api_key_here") {
      throw new AuthenticationError(
        "Anthropic API key is missing. Set ANTHROPIC_API_KEY.",
        "anthropic"
      );
    }
    const anthropicMessages = [];
    let systemInstruction = context.options.systemInstruction;
    const contents = context.contents;
    if (typeof contents === "string") {
      anthropicMessages.push({ role: "user", content: contents });
    } else {
      if (!systemInstruction) {
        const sysMsg = contents.find((m) => m.role === "system");
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }
      contents.forEach((msg) => {
        if (msg.role !== "system") {
          anthropicMessages.push({ role: msg.role, content: msg.content });
        }
      });
    }
    const requestBody = {
      model: modelName,
      messages: anthropicMessages,
      max_tokens: context.options.maxTokens ?? (providerConfig == null ? void 0 : providerConfig.maxTokens) ?? 2048,
      temperature: context.options.temperature ?? (providerConfig == null ? void 0 : providerConfig.temperature) ?? 0.7
    };
    if (systemInstruction) {
      requestBody.system = systemInstruction;
    }
    const headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerously-allow-host": "true"
    };
    const timeout = context.options.timeout ?? (providerConfig == null ? void 0 : providerConfig.timeout) ?? 3e4;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errText}`);
      }
      const responseData = await response.json();
      const text = ((_b = (_a = responseData.content) == null ? void 0 : _a[0]) == null ? void 0 : _b.text) || "";
      const usage = responseData.usage;
      return {
        text,
        usage: usage ? {
          promptTokens: usage.input_tokens || 0,
          completionTokens: usage.output_tokens || 0,
          totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
        } : void 0,
        provider: "anthropic",
        model: modelName,
        requestId: context.requestId
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.wrapError(error);
    }
  }
  async getStatus(config) {
    const apiKey = (config == null ? void 0 : config.apiKey) || ConfigService.get().providers.anthropic.apiKey;
    if (!apiKey || apiKey === "your_api_key_here") {
      return "DISABLED";
    }
    return "ACTIVE";
  }
  wrapError(error) {
    const msg = error.message || "";
    if (error.name === "AbortError") {
      return new TimeoutError("Request timed out for Anthropic", "anthropic");
    }
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("auth") || msg.includes("api_key")) {
      return new AuthenticationError(msg, "anthropic", 401);
    }
    if (msg.includes("429") || msg.includes("rate") || msg.includes("quota")) {
      return new RateLimitError(msg, "anthropic", 429);
    }
    return new ProviderError(msg, "anthropic", 500, error);
  }
}
class AWSBedrockProvider extends BaseProvider {
  constructor() {
    super(...arguments);
    this.metadata = {
      id: "bedrock",
      name: "AWS Bedrock",
      capabilities: {
        vision: true,
        json: true,
        streaming: true,
        tools: true
      },
      isLocal: false
    };
  }
  async generateContent(context) {
    const config = ConfigService.get();
    const accessKeyId = config.providers.bedrock.accessKeyId;
    const secretAccessKey = config.providers.bedrock.secretAccessKey;
    if (!accessKeyId || !secretAccessKey) {
      throw new AuthenticationError(
        "AWS credentials (AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY) are missing for AWS Bedrock.",
        "bedrock"
      );
    }
    throw new ProviderError(
      "AWS Bedrock invocation requires AWS Signature V4 signing, which is not fully supported in this lightweight REST client. Please use standard AWS SDK or an alternative provider.",
      "bedrock"
    );
  }
  async getStatus(config) {
    const configData = ConfigService.get();
    const accessKeyId = configData.providers.bedrock.accessKeyId;
    if (!accessKeyId) {
      return "DISABLED";
    }
    return "ACTIVE";
  }
}
const _LLMRegistry = class _LLMRegistry {
  static initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new GroqProvider());
    this.register(new TogetherProvider());
    this.register(new OpenRouterProvider());
    this.register(new LMStudioProvider());
    this.register(new OllamaProvider());
    this.register(new MistralProvider());
    this.register(new AnthropicProvider());
    this.register(new AWSBedrockProvider());
    console.log("[AI Registry] Initialized all providers.");
  }
  static register(provider) {
    this.providers.set(provider.metadata.id, provider);
  }
  static getProvider(id) {
    this.initialize();
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`AI Provider "${id}" not found in registry.`);
    }
    return provider;
  }
  static hasProvider(id) {
    this.initialize();
    return this.providers.has(id);
  }
  static listProviders() {
    this.initialize();
    return Array.from(this.providers.values());
  }
};
_LLMRegistry.providers = /* @__PURE__ */ new Map();
_LLMRegistry.isInitialized = false;
let LLMRegistry = _LLMRegistry;
const loggingMiddleware = async (context, next) => {
  const startTime = Date.now();
  console.log(`[AI Request Logger] [${context.requestId}] Task: "${context.task}" | Provider: "${context.providerId}" | Model: "${context.options.model || "default"}" - Initiated`);
  try {
    const response = await next(context);
    const duration = Date.now() - startTime;
    console.log(`[AI Request Logger] [${context.requestId}] Success | Latency: ${duration}ms | Model used: "${response.model}"`);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AI Request Logger] [${context.requestId}] Failure | Latency: ${duration}ms | Error: "${error.message || error}"`);
    throw error;
  }
};
const authMiddleware = async (context, next) => {
  const provider = LLMRegistry.getProvider(context.providerId);
  if (!provider.metadata.isLocal) {
    const status = await provider.getStatus(context.providerConfig);
    if (status === "DISABLED") {
      throw new AuthenticationError(
        `API key for cloud provider "${provider.metadata.name}" is not configured. Please supply an API key or configure it on the server.`,
        context.providerId
      );
    }
  }
  return next(context);
};
const _MemoryCache = class _MemoryCache {
  static get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }
  static set(key, value, ttlMs = 5 * 60 * 1e3) {
    this.cache.set(key, {
      response: value,
      expiry: Date.now() + ttlMs
    });
  }
  static delete(key) {
    this.cache.delete(key);
  }
  static clear() {
    this.cache.clear();
  }
};
_MemoryCache.cache = /* @__PURE__ */ new Map();
let MemoryCache = _MemoryCache;
const cachingMiddleware = async (context, next) => {
  if (context.task !== "lesson") {
    return next(context);
  }
  const cacheKey = JSON.stringify({
    provider: context.providerId,
    model: context.options.model,
    contents: context.contents
  });
  const cachedResponse = MemoryCache.get(cacheKey);
  if (cachedResponse) {
    console.log(`[AI Cache] [${context.requestId}] Cache Hit! Serving cached response.`);
    return {
      ...cachedResponse,
      requestId: context.requestId
    };
  }
  const response = await next(context);
  MemoryCache.set(cacheKey, response, 10 * 60 * 1e3);
  console.log(`[AI Cache] [${context.requestId}] Cache Miss. Cached response in memory.`);
  return response;
};
const retryMiddleware = async (context, next) => {
  var _a, _b;
  const maxRetries = context.options.retries ?? ((_a = context.providerConfig) == null ? void 0 : _a.retries) ?? 3;
  const baseDelayMs = 1e3;
  const executeWithRetry = async (ctx) => {
    let lastError = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await next(ctx);
      } catch (error) {
        lastError = error;
        if (error.name === "AuthenticationError") {
          throw error;
        }
        console.warn(
          `[AI Retry] [${ctx.requestId}] Attempt ${attempt + 1}/${maxRetries} failed: "${error.message || error}"`
        );
        if (attempt < maxRetries - 1) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError || new Error(`All ${maxRetries} retry attempts failed.`);
  };
  try {
    return await executeWithRetry(context);
  } catch (error) {
    const failoverProviders = context.options.failoverProviders ?? ((_b = context.providerConfig) == null ? void 0 : _b.failoverProviders) ?? [];
    if (failoverProviders.length > 0) {
      console.warn(
        `[AI Failover] [${context.requestId}] Primary provider "${context.providerId}" failed. Trying fallback list: [${failoverProviders.join(
          ", "
        )}]`
      );
      for (const fallbackId of failoverProviders) {
        if (LLMRegistry.hasProvider(fallbackId)) {
          try {
            console.log(`[AI Failover] [${context.requestId}] Attempting fallback: "${fallbackId}"`);
            const fallbackContext = {
              ...context,
              providerId: fallbackId,
              options: {
                ...context.options,
                model: void 0
                // Clear model so fallback provider uses its default
              }
            };
            return await next(fallbackContext);
          } catch (fallbackError) {
            console.error(
              `[AI Failover] [${context.requestId}] Fallback provider "${fallbackId}" failed: "${fallbackError.message || fallbackError}"`
            );
          }
        }
      }
    }
    throw error;
  }
};
const _ModelRegistry = class _ModelRegistry {
  static getModel(id) {
    return this.models[id] || null;
  }
  static getModelsForProvider(providerId) {
    return Object.values(this.models).filter((m) => m.providerId === providerId);
  }
  static listAllModels() {
    return Object.values(this.models);
  }
};
_ModelRegistry.models = {
  // Gemini Models
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    providerId: "gemini",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 1048576,
    costPerMillionInput: 0.075,
    costPerMillionOutput: 0.3
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providerId: "gemini",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 2097152,
    costPerMillionInput: 1.25,
    costPerMillionOutput: 5
  },
  // OpenAI Models
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providerId: "openai",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 128e3,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6
  },
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    providerId: "openai",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 128e3,
    costPerMillionInput: 2.5,
    costPerMillionOutput: 10
  },
  // Anthropic Models
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    providerId: "anthropic",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 2e5,
    costPerMillionInput: 3,
    costPerMillionOutput: 15
  },
  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    providerId: "anthropic",
    capabilities: { vision: false, json: true, streaming: true, tools: true },
    maxContextTokens: 2e5,
    costPerMillionInput: 0.8,
    costPerMillionOutput: 4
  },
  // Groq Models
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B (Groq)",
    providerId: "groq",
    capabilities: { vision: false, json: true, streaming: true, tools: true },
    maxContextTokens: 128e3,
    costPerMillionInput: 0.59,
    costPerMillionOutput: 0.79
  },
  "mixtral-8x7b-32768": {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B (Groq)",
    providerId: "groq",
    capabilities: { vision: false, json: true, streaming: true, tools: true },
    maxContextTokens: 32768,
    costPerMillionInput: 0.24,
    costPerMillionOutput: 0.24
  },
  // Together AI Models
  "meta-llama/Llama-3-70b-chat-hf": {
    id: "meta-llama/Llama-3-70b-chat-hf",
    name: "Llama 3 70B Chat (Together)",
    providerId: "together",
    capabilities: { vision: false, json: true, streaming: true, tools: true },
    maxContextTokens: 8192,
    costPerMillionInput: 0.9,
    costPerMillionOutput: 0.9
  },
  // OpenRouter Models
  "google/gemini-2.5-flash": {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash (OpenRouter)",
    providerId: "openrouter",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 1048576,
    costPerMillionInput: 0.075,
    costPerMillionOutput: 0.3
  },
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini (OpenRouter)",
    providerId: "openrouter",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 128e3,
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6
  },
  // Mistral Models
  "mistral-tiny": {
    id: "mistral-tiny",
    name: "Mistral Tiny",
    providerId: "mistral",
    capabilities: { vision: false, json: false, streaming: true, tools: false },
    maxContextTokens: 8192,
    costPerMillionInput: 0.25,
    costPerMillionOutput: 0.25
  },
  // Ollama (Local)
  "llama3": {
    id: "llama3",
    name: "Llama 3 (Local)",
    providerId: "ollama",
    capabilities: { vision: false, json: true, streaming: true, tools: false },
    maxContextTokens: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0
  },
  // LM Studio (Local)
  "meta-llama-3-8b-instruct": {
    id: "meta-llama-3-8b-instruct",
    name: "Llama 3 8B (LM Studio)",
    providerId: "lmstudio",
    capabilities: { vision: false, json: true, streaming: true, tools: false },
    maxContextTokens: 8192,
    costPerMillionInput: 0,
    costPerMillionOutput: 0
  },
  // AWS Bedrock Models
  "anthropic.claude-3-5-sonnet-20241022-v2:0": {
    id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
    name: "Claude 3.5 Sonnet (Bedrock)",
    providerId: "bedrock",
    capabilities: { vision: true, json: true, streaming: true, tools: true },
    maxContextTokens: 2e5,
    costPerMillionInput: 3,
    costPerMillionOutput: 15
  }
};
let ModelRegistry = _ModelRegistry;
const metricsMiddleware = async (context, next) => {
  const response = await next(context);
  if (response.usage) {
    const modelMeta = ModelRegistry.getModel(response.model);
    if (modelMeta) {
      const inputCost = response.usage.promptTokens / 1e6 * modelMeta.costPerMillionInput;
      const outputCost = response.usage.completionTokens / 1e6 * modelMeta.costPerMillionOutput;
      const totalCost = inputCost + outputCost;
      response.cost = parseFloat(totalCost.toFixed(6));
      console.log(
        `[AI Metrics] [${context.requestId}] Model: "${response.model}" | Tokens: ${response.usage.promptTokens} in / ${response.usage.completionTokens} out | Est. Cost: $${response.cost.toFixed(6)}`
      );
    }
  }
  return response;
};
const pipeline = [
  loggingMiddleware,
  metricsMiddleware,
  // Metrics estimation
  cachingMiddleware,
  // Cache check
  retryMiddleware,
  // Retry & Failover
  authMiddleware
  // Authentication key presence check
];
async function runMiddlewarePipeline(context, executeProvider) {
  let index = 0;
  const run = async (ctx) => {
    if (index < pipeline.length) {
      const middleware = pipeline[index++];
      return middleware(ctx, run);
    }
    return executeProvider(ctx);
  };
  return run(context);
}
class AIService {
  static generateRequestId() {
    return `req_${Math.random().toString(36).substring(2, 11)}`;
  }
  static async execute(task, payload, providerConfig) {
    const config = ConfigService.get();
    const requestId = this.generateRequestId();
    const providerId = (providerConfig == null ? void 0 : providerConfig.provider) || config.defaultProvider || "gemini";
    const requestContext = {
      requestId,
      task,
      providerId,
      contents: payload.contents,
      options: payload.options,
      providerConfig
    };
    try {
      const response = await runMiddlewarePipeline(requestContext, async (ctx) => {
        const provider = LLMRegistry.getProvider(ctx.providerId);
        return provider.generateContent(ctx);
      });
      return response;
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      throw new ProviderError(
        error.message || "An unexpected error occurred during AI execution",
        providerId,
        500,
        error
      );
    }
  }
}
const LESSON_SCHEMA_V1 = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["theory", "quiz", "code"] },
          title: { type: "string" },
          content: { type: "string", description: "Markdown content for theory or the question for quiz/code" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                isCorrect: { type: "boolean" },
                explanation: { type: "string" }
              },
              required: ["id", "text", "isCorrect"]
            }
          },
          code: {
            type: "object",
            properties: {
              initialCode: { type: "string" },
              expectedOutput: { type: "string" },
              hint: { type: "string" },
              solution: { type: "string" }
            },
            required: ["initialCode", "expectedOutput", "hint", "solution"]
          }
        },
        required: ["id", "type", "title", "content"]
      }
    }
  },
  required: ["title", "summary", "steps"]
};
function getLessonPromptV1(lesson) {
  return `
    Act as an expert Python tutor creating a Duolingo-style interactive lesson for: "${lesson.title}".
    Module: "${lesson.module}", Difficulty: "${lesson.difficulty}".
    
    Create a strictly structured lesson with 5 to 7 interactive steps.
    The steps should flow logically:
    1. Theory (Short, bite-sized explanation based on search results)
    2. Quiz (Multiple choice to check understanding)
    3. Theory or Code Example
    4. Code Challenge (User must run code to proceed)
    
    GUIDELINES:
    - Keep theory concise (max 3 sentences per card).
    - Quizzes must have 3-4 options, one correct.
    - Code Challenges must have 'initialCode' (runnable but incomplete or needing modification) and 'expectedOutput' (what the output contains if correct).
    - The final step should be a summary or a harder challenge.
    
    Return JSON format matching the schema exactly.
  `;
}
function getChatSystemInstructionV1(context) {
  return `
    You are 'PyQuest Bot', a friendly and helpful AI Python tutor.
    The user is currently learning about: ${context.lessonTitle}.
    
    Help the user understand Python concepts, debug code, or give examples. 
    Keep answers concise, educational, and encouraging. 
    If they ask about something unrelated to Python, politely steer them back to coding.
    Use markdown for code snippets.
  `;
}
async function handleAiRequest(req, res) {
  const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (path === "/api/ai/providers" && req.method === "GET") {
    try {
      const providers = LLMRegistry.listProviders();
      const list = await Promise.all(
        providers.map(async (p) => {
          const status = await p.getStatus();
          const models = ModelRegistry.getModelsForProvider(p.metadata.id);
          return {
            id: p.metadata.id,
            name: p.metadata.name,
            capabilities: p.metadata.capabilities,
            isLocal: p.metadata.isLocal,
            status,
            models: models.map((m) => ({ id: m.id, name: m.name, capabilities: m.capabilities }))
          };
        })
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ providers: list }));
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Failed to list providers", message: error.message }));
    }
    return;
  }
  if (path === "/api/ai/execute" && req.method === "POST") {
    try {
      const body = await getRequestBody(req);
      const parsedBody = JSON.parse(body || "{}");
      const { task, payload, providerConfig } = parsedBody;
      if (!task) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing task parameter" }));
        return;
      }
      let contents = payload == null ? void 0 : payload.contents;
      let options = (payload == null ? void 0 : payload.options) || {};
      if (task === "lesson") {
        const { lesson } = payload;
        contents = getLessonPromptV1(lesson);
        options = {
          ...options,
          responseMimeType: "application/json",
          responseSchema: LESSON_SCHEMA_V1
        };
      } else if (task === "chat") {
        const { message, history, currentContext } = payload;
        options.systemInstruction = getChatSystemInstructionV1({
          lessonTitle: (currentContext == null ? void 0 : currentContext.lessonTitle) || "Python"
        });
        contents = [
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: "user", content: message }
        ];
      } else if (task === "test") {
        const providerId = (providerConfig == null ? void 0 : providerConfig.provider) || "gemini";
        const provider = LLMRegistry.getProvider(providerId);
        const success = await provider.testConnection(providerConfig);
        res.statusCode = 200;
        res.end(JSON.stringify({ success }));
        return;
      }
      const result = await AIService.execute(task, { contents, options }, providerConfig);
      let data = result.text;
      if (task === "lesson") {
        try {
          data = JSON.parse(result.text.trim());
        } catch (e) {
          data = extractAndParseJson(result.text);
        }
      }
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          data,
          usage: result.usage,
          cost: result.cost,
          provider: result.provider,
          model: result.model,
          requestId: result.requestId
        })
      );
    } catch (error) {
      console.error("[AI Execute Route Error]:", error);
      res.statusCode = error.status || 500;
      res.end(
        JSON.stringify({
          error: error.name || "AIError",
          message: error.message || "Failed to execute task",
          provider: error.providerId
        })
      );
    }
    return;
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Endpoint not found" }));
}
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
  });
}
function extractAndParseJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  const rawJson = match ? match[1] : text;
  return JSON.parse(rawJson.trim());
}
export {
  handleAiRequest
};
