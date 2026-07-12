import { ModelMetadata } from '../types';

export class ModelRegistry {
  private static models: Record<string, ModelMetadata> = {
    // Gemini Models
    'gemini-2.5-flash': {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      providerId: 'gemini',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 1048576,
      costPerMillionInput: 0.075,
      costPerMillionOutput: 0.30,
    },
    'gemini-2.5-pro': {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      providerId: 'gemini',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 2097152,
      costPerMillionInput: 1.25,
      costPerMillionOutput: 5.00,
    },

    // OpenAI Models
    'gpt-4o-mini': {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      providerId: 'openai',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 128000,
      costPerMillionInput: 0.150,
      costPerMillionOutput: 0.600,
    },
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o',
      providerId: 'openai',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 128000,
      costPerMillionInput: 2.50,
      costPerMillionOutput: 10.00,
    },

    // Anthropic Models
    'claude-3-5-sonnet-20241022': {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      providerId: 'anthropic',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 200000,
      costPerMillionInput: 3.00,
      costPerMillionOutput: 15.00,
    },
    'claude-3-5-haiku-20241022': {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      providerId: 'anthropic',
      capabilities: { vision: false, json: true, streaming: true, tools: true },
      maxContextTokens: 200000,
      costPerMillionInput: 0.80,
      costPerMillionOutput: 4.00,
    },

    // Groq Models
    'llama-3.3-70b-versatile': {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B (Groq)',
      providerId: 'groq',
      capabilities: { vision: false, json: true, streaming: true, tools: true },
      maxContextTokens: 128000,
      costPerMillionInput: 0.59,
      costPerMillionOutput: 0.79,
    },
    'mixtral-8x7b-32768': {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B (Groq)',
      providerId: 'groq',
      capabilities: { vision: false, json: true, streaming: true, tools: true },
      maxContextTokens: 32768,
      costPerMillionInput: 0.24,
      costPerMillionOutput: 0.24,
    },

    // Together AI Models
    'meta-llama/Llama-3-70b-chat-hf': {
      id: 'meta-llama/Llama-3-70b-chat-hf',
      name: 'Llama 3 70B Chat (Together)',
      providerId: 'together',
      capabilities: { vision: false, json: true, streaming: true, tools: true },
      maxContextTokens: 8192,
      costPerMillionInput: 0.90,
      costPerMillionOutput: 0.90,
    },

    // OpenRouter Models
    'google/gemini-2.5-flash': {
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash (OpenRouter)',
      providerId: 'openrouter',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 1048576,
      costPerMillionInput: 0.075,
      costPerMillionOutput: 0.30,
    },
    'openai/gpt-4o-mini': {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini (OpenRouter)',
      providerId: 'openrouter',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 128000,
      costPerMillionInput: 0.150,
      costPerMillionOutput: 0.600,
    },

    // Mistral Models
    'mistral-tiny': {
      id: 'mistral-tiny',
      name: 'Mistral Tiny',
      providerId: 'mistral',
      capabilities: { vision: false, json: false, streaming: true, tools: false },
      maxContextTokens: 8192,
      costPerMillionInput: 0.25,
      costPerMillionOutput: 0.25,
    },

    // Ollama (Local)
    'llama3': {
      id: 'llama3',
      name: 'Llama 3 (Local)',
      providerId: 'ollama',
      capabilities: { vision: false, json: true, streaming: true, tools: false },
      maxContextTokens: 8192,
      costPerMillionInput: 0.0,
      costPerMillionOutput: 0.0,
    },

    // LM Studio (Local)
    'meta-llama-3-8b-instruct': {
      id: 'meta-llama-3-8b-instruct',
      name: 'Llama 3 8B (LM Studio)',
      providerId: 'lmstudio',
      capabilities: { vision: false, json: true, streaming: true, tools: false },
      maxContextTokens: 8192,
      costPerMillionInput: 0.0,
      costPerMillionOutput: 0.0,
    },

    // AWS Bedrock Models
    'anthropic.claude-3-5-sonnet-20241022-v2:0': {
      id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      name: 'Claude 3.5 Sonnet (Bedrock)',
      providerId: 'bedrock',
      capabilities: { vision: true, json: true, streaming: true, tools: true },
      maxContextTokens: 200000,
      costPerMillionInput: 3.00,
      costPerMillionOutput: 15.00,
    },
  };

  public static getModel(id: string): ModelMetadata | null {
    return this.models[id] || null;
  }

  public static getModelsForProvider(providerId: string): ModelMetadata[] {
    return Object.values(this.models).filter(m => m.providerId === providerId);
  }

  public static listAllModels(): ModelMetadata[] {
    return Object.values(this.models);
  }
}
