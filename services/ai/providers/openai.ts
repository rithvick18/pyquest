import { OpenAICompatibleProvider } from './openaiCompatible';
import { ProviderMetadata } from '../types';
import { ConfigService } from '../config';

export class OpenAIProvider extends OpenAICompatibleProvider {
  public metadata: ProviderMetadata = {
    id: 'openai',
    name: 'OpenAI',
    capabilities: {
      vision: true,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  protected getApiKey(config?: any): string | undefined {
    return config?.apiKey || ConfigService.get().providers.openai.apiKey;
  }

  protected getBaseUrl(config?: any): string {
    return config?.baseUrl || ConfigService.get().providers.openai.baseUrl;
  }

  protected getDefaultModel(config?: any): string {
    return config?.model || ConfigService.get().providers.openai.defaultModel;
  }
}
