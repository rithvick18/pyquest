import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';

export class MistralProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'mistral',
    name: 'Mistral',
    capabilities: {
      vision: false,
      json: false,
      streaming: true,
      tools: false,
    },
    isLocal: false,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || ConfigService.get().providers.mistral.apiKey;
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.mistral.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.mistral.defaultModel;
  }
}

// Self-register
LLMRegistry.register(new MistralProvider());
