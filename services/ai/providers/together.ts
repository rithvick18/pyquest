import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';

export class TogetherProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'together',
    name: 'Together AI',
    capabilities: {
      vision: false,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || ConfigService.get().providers.together.apiKey;
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.together.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.together.defaultModel;
  }
}

// Self-register
LLMRegistry.register(new TogetherProvider());
