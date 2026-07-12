export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ProviderCapabilities {
  vision: boolean;
  json: boolean;
  streaming: boolean;
  tools: boolean;
}

export interface ModelMetadata {
  id: string;
  name: string;
  providerId: string;
  capabilities: ProviderCapabilities;
  maxContextTokens: number;
  costPerMillionInput: number;
  costPerMillionOutput: number;
}

export type ProviderStatus = 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'LOCAL_ONLY' | 'DISABLED';

export interface ProviderMetadata {
  id: string;
  name: string;
  capabilities: ProviderCapabilities;
  isLocal: boolean;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
  failoverProviders?: string[];
}

export interface AIRequestContext {
  requestId: string;
  task: 'lesson' | 'chat' | 'test';
  providerId: string;
  contents: string | ChatMessage[];
  options: LLMRequestOptions;
  providerConfig?: ProviderConfig;
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseMimeType?: string;
  responseSchema?: any;
  systemInstruction?: string;
  timeout?: number;
  retries?: number;
  failoverProviders?: string[];
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
  provider: string;
  model: string;
  requestId: string;
  stream?: AsyncIterable<string>;
}

export type AIMiddleware = (
  context: AIRequestContext,
  next: (context: AIRequestContext) => Promise<AIResponse>
) => Promise<AIResponse>;
