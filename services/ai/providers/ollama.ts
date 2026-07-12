import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';

export class OllamaProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'ollama',
    name: 'Ollama (Local)',
    capabilities: {
      vision: false,
      json: true,
      streaming: true,
      tools: false,
    },
    isLocal: true,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || undefined; // Local Ollama doesn't need an API key
  }

  protected getBaseUrl(config?: any): string {
    const rawUrl = config?.baseUrl || ConfigService.get().providers.ollama.baseUrl;
    // Ollama supports OpenAI API at /v1
    if (rawUrl.endsWith('/v1')) return rawUrl;
    if (rawUrl.endsWith('/')) return `${rawUrl}v1`;
    return `${rawUrl}/v1`;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.ollama.defaultModel;
  }
}

// Self-register
LLMRegistry.register(new OllamaProvider());
