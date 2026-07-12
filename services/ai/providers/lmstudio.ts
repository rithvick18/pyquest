import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';

export class LMStudioProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    capabilities: {
      vision: false,
      json: true,
      streaming: true,
      tools: false,
    },
    isLocal: true,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || undefined; // Local endpoint doesn't need an API key
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.lmstudio.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.lmstudio.defaultModel;
  }
}

// Self-register
LLMRegistry.register(new LMStudioProvider());
