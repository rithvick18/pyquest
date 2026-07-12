import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';

export class OpenRouterProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'openrouter',
    name: 'OpenRouter',
    capabilities: {
      vision: true,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || ConfigService.get().providers.openrouter.apiKey;
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.openrouter.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.openrouter.defaultModel;
  }
}
