import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';

export class GroqProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'groq',
    name: 'Groq',
    capabilities: {
      vision: false,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || ConfigService.get().providers.groq.apiKey;
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.groq.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.groq.defaultModel;
  }
}

// Self-register
LLMRegistry.register(new GroqProvider());
