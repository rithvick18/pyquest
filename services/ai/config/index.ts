export interface EnvironmentConfig {
  defaultProvider: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
  
  providers: {
    gemini: {
      apiKey?: string;
      defaultModel: string;
    };
    openai: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    anthropic: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    groq: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    together: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    openrouter: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    mistral: {
      apiKey?: string;
      baseUrl: string;
      defaultModel: string;
    };
    ollama: {
      baseUrl: string;
      defaultModel: string;
    };
    lmstudio: {
      baseUrl: string;
      defaultModel: string;
    };
    bedrock: {
      region?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      defaultModel: string;
    };
  };
}

export class ConfigService {
  private static config: EnvironmentConfig | null = null;

  public static get(): EnvironmentConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  private static loadConfig(): EnvironmentConfig {
    // Read from process.env (Vite runs in Node during dev server and builds)
    const env = process.env || {};

    return {
      defaultProvider: env.AI_PROVIDER || 'gemini',
      temperature: parseFloat(env.AI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(env.AI_MAX_TOKENS || '2048', 10),
      timeout: parseInt(env.AI_TIMEOUT || '30000', 10), // 30 seconds default
      retries: parseInt(env.AI_RETRIES || '3', 10),

      providers: {
        gemini: {
          apiKey: env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY,
          defaultModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
        },
        openai: {
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          defaultModel: env.OPENAI_MODEL || 'gpt-4o-mini',
        },
        anthropic: {
          apiKey: env.ANTHROPIC_API_KEY,
          baseUrl: env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1',
          defaultModel: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        },
        groq: {
          apiKey: env.GROQ_API_KEY,
          baseUrl: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
          defaultModel: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        },
        together: {
          apiKey: env.TOGETHER_API_KEY,
          baseUrl: env.TOGETHER_BASE_URL || 'https://api.together.xyz/v1',
          defaultModel: env.TOGETHER_MODEL || 'meta-llama/Llama-3-70b-chat-hf',
        },
        openrouter: {
          apiKey: env.OPENROUTER_API_KEY,
          baseUrl: env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
          defaultModel: env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
        },
        mistral: {
          apiKey: env.MISTRAL_API_KEY,
          baseUrl: env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
          defaultModel: env.MISTRAL_MODEL || 'mistral-tiny',
        },
        ollama: {
          baseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
          defaultModel: env.OLLAMA_MODEL || 'llama3',
        },
        lmstudio: {
          baseUrl: env.LMSTUDIO_BASE_URL || 'http://localhost:1234',
          defaultModel: env.LMSTUDIO_MODEL || 'meta-llama-3-8b-instruct',
        },
        bedrock: {
          region: env.AWS_REGION || 'us-east-1',
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          defaultModel: env.BEDROCK_MODEL || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        },
      },
    };
  }
}
