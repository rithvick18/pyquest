import { AIRequestContext, AIResponse, ProviderMetadata, ProviderStatus } from '../types';

export interface LLMProvider {
  metadata: ProviderMetadata;
  generateContent(context: AIRequestContext): Promise<AIResponse>;
  getStatus(config?: { apiKey?: string; baseUrl?: string }): Promise<ProviderStatus>;
  testConnection(config?: { apiKey?: string; baseUrl?: string }): Promise<boolean>;
}

export abstract class BaseProvider implements LLMProvider {
  public abstract metadata: ProviderMetadata;

  public abstract generateContent(context: AIRequestContext): Promise<AIResponse>;

  public abstract getStatus(config?: { apiKey?: string; baseUrl?: string }): Promise<ProviderStatus>;

  public async testConnection(config?: { apiKey?: string; baseUrl?: string }): Promise<boolean> {
    try {
      const status = await this.getStatus(config);
      return status === 'ACTIVE' || status === 'LOCAL_ONLY';
    } catch {
      return false;
    }
  }

  // Normalizes messages into unified string structure for providers that don't support chat objects
  protected formatMessagesToSinglePrompt(contents: string | any[]): string {
    if (typeof contents === 'string') {
      return contents;
    }
    return contents
      .map((msg) => {
        const role = msg.role === 'system' ? 'System' : msg.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n') + '\n\nAssistant:';
  }
}
