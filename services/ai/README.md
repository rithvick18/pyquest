# PyQuest Unified AI Architecture

A production-grade, modular, and extensible AI execution layer supporting multiple LLM providers (Google Gemini, OpenAI, Anthropic, Mistral, AWS Bedrock, and local models like Ollama / LM Studio) through a unified API. 

To ensure secrets remain secure, all model interactions are moved to a server-side proxy endpoint `/api/ai/execute`, meaning API keys are never bundled or exposed to the client.

---

## 1. High-Level Architecture

The workflow of an AI request in the new layer:

```
                  ┌───────────────────────┐
                  │   Frontend React UI   │
                  └───────────┬───────────┘
                              │
                    (POST /api/ai/execute)
                              │
                  ┌───────────▼───────────┐
                  │   Vite / Node Proxy   │
                  └───────────┬───────────┘
                              │
                  ┌───────────▼───────────┐
                  │       AIService       │
                  └───────────┬───────────┘
                              │
                              ▼
                   [Middleware Pipeline]
                   (Logging ➔ Metrics ➔ Cache ➔ Retry ➔ Auth)
                              │
                              ▼
                     [Provider Registry]
                    (Resolves Provider ID)
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
             ┌───────────────┐ ┌───────────────┐
             │GeminiProvider │ │OpenAIProvider │ ...
             └───────────────┘ └───────────────┘
```

---

## 2. Directory Layout & Core Components

```
services/
  ai/
    types/
      index.ts          # Core type definitions (Request, Response, Middleware)
      errors.ts         # Unified AIError exception hierarchy
    config/
      index.ts          # ConfigService parses server environment variables
    models/
      index.ts          # ModelRegistry maps model properties, capabilities, costs
    cache/
      memory.ts         # Fast-path server-side memory caching
    middleware/
      index.ts          # Middleware chain composer
      logging.ts        # Console logger tracking Request IDs and latencies
      metrics.ts        # Dynamic token usage and cost estimator
      caching.ts        # Idempotent prompt caching interceptor
      retry.ts          # Exponential backoff retry handler & failovers
      auth.ts           # Verification of API key presence
    providers/
      base.ts           # BaseProvider abstract class and single-prompt formatter
      openaiCompatible.ts # Base class executing REST requests to OpenAI-style endpoints
      gemini.ts         # Google Gemini Adapter using @google/genai SDK
      openai.ts         # OpenAI Adapter using standard REST completions
      groq.ts           # Groq Adapter (inherits from OpenAICompatibleProvider)
      together.ts       # Together AI Adapter (inherits from OpenAICompatibleProvider)
      openrouter.ts     # OpenRouter Adapter (inherits from OpenAICompatibleProvider)
      lmstudio.ts       # LM Studio Adapter (inherits from OpenAICompatibleProvider)
      ollama.ts         # Ollama Adapter (inherits from OpenAICompatibleProvider)
      anthropic.ts      # Anthropic Claude REST messages Adapter
      bedrock.ts        # AWS Bedrock REST completions Adapter
    registry/
      index.ts          # Self-registering Provider Registry
    prompts/
      lesson/v1.ts      # Lesson prompt and output JSON Schema
      chat/v1.ts        # Chat Bot system instructions
    service.ts          # AIService (core orchestrator orchestrating requests)
```

---

## 3. Provider Abstraction Design

Every provider inherits from `BaseProvider` and implements the `LLMProvider` interface:

```typescript
export interface LLMProvider {
  metadata: ProviderMetadata;
  generateContent(context: AIRequestContext): Promise<AIResponse>;
  getStatus(config?: { apiKey?: string; baseUrl?: string }): Promise<ProviderStatus>;
  testConnection(config?: { apiKey?: string; baseUrl?: string }): Promise<boolean>;
}
```

### Provider Metadata & Status
- **isLocal**: Identifies if a provider runs on the user's localhost machine (e.g. Ollama, LM Studio), in which case the UI allows the user to configure custom base URLs and keys.
- **capabilities**: Derives feature-support like `json`, `vision`, `streaming`, `tools`.
- **status**: Status states (`ACTIVE`, `DEGRADED`, `OFFLINE`, `LOCAL_ONLY`, `DISABLED`).

---

## 4. Configuration Examples

Configure server-side keys inside your `.env` (or `.env.local` during local development):

```env
# Selected Default Provider (defaults to 'gemini')
AI_PROVIDER=gemini

# Default Hyperparameters
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=2048
AI_TIMEOUT=30000
AI_RETRIES=3

# Google Gemini Configuration
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Groq Configuration
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# Together AI Configuration
TOGETHER_API_KEY=...
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf

# OpenRouter Configuration
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-2.5-flash

# Ollama & LM Studio (Server-side defaults - can be overridden in UI)
OLLAMA_BASE_URL=http://localhost:11434
LMSTUDIO_BASE_URL=http://localhost:1234
```

---

## 5. How to Add a New Provider

Adding a new provider is simple and requires zero modification to other core files:

1. **Create Adapter File**:
   Create a new file in `services/ai/providers/my-provider.ts`. Implement the `LLMProvider` interface or inherit from `OpenAICompatibleProvider`/`BaseProvider`.
   
   ```typescript
   import { OpenAICompatibleProvider } from './openaiCompatible';
   import { ProviderMetadata } from '../types';
   import { LLMRegistry } from '../registry';

   export class MyProvider extends OpenAICompatibleProvider {
     public metadata: ProviderMetadata = {
       id: 'my-provider',
       name: 'My Provider Name',
       capabilities: { vision: false, json: true, streaming: true, tools: false },
       isLocal: false
     };
     
     // implement getApiKey(), getBaseUrl(), and getDefaultModel()...
   }
   
   // Self-register
   LLMRegistry.register(new MyProvider());
   ```

2. **Add Models in Registry**:
   Open `services/ai/models/index.ts` and add metadata rules for your provider's models (ID, display name, pricing per million tokens, capabilities).

3. **Import to Registry**:
   Open `services/ai/registry/index.ts` and add an import statement for your adapter file so it gets registered on startup:
   
   ```typescript
   import '../providers/my-provider';
   ```

---

## 6. Provider Differences & Limitations

1. **Structured Outputs (JSON)**:
   - Providers like Gemini and OpenAI natively support structured outputs (passing schemas or setting `response_format`).
   - For other endpoints, standard system prompts instruct models to reply with JSON. The API handler parses the returned text block and automatically extracts JSON code blocks (e.g. `` ```json ... ``` ``) in case formatting contains markdown decorators.
2. **AWS Bedrock Requests**:
   - The AWS Bedrock adapter is configured but requires AWS Signature V4 request signing if invoked via raw REST. It checks credentials status and throws a clear instructions error if credentials are not configured.
