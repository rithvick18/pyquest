import { BaseProvider } from './base';
import { AIRequestContext, AIResponse, ProviderMetadata, ProviderStatus } from '../types';
import { AuthenticationError, RateLimitError, TimeoutError, ProviderError } from '../types/errors';

export abstract class OpenAICompatibleProvider extends BaseProvider {
  public abstract metadata: ProviderMetadata;

  protected abstract getApiKey(config?: any): string | undefined;
  protected abstract getBaseUrl(config?: any): string;
  protected abstract getDefaultModel(config?: any): string;

  public async generateContent(context: AIRequestContext): Promise<AIResponse> {
    const providerConfig = context.providerConfig;
    const apiKey = this.getApiKey(providerConfig);
    const baseUrl = providerConfig?.baseUrl || this.getBaseUrl(providerConfig);
    const modelName = context.options.model || providerConfig?.model || this.getDefaultModel(providerConfig);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey && apiKey !== 'your_api_key_here') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Format messages
    const messages: any[] = [];
    
    let systemInstruction = context.options.systemInstruction;
    const contents = context.contents;

    if (typeof contents === 'string') {
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      messages.push({ role: 'user', content: contents });
    } else {
      if (!systemInstruction) {
        const sysMsg = contents.find((m) => m.role === 'system');
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }
      
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
      }
      
      contents.forEach((msg) => {
        if (msg.role !== 'system') {
          messages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    const requestBody: any = {
      model: modelName,
      messages,
      temperature: context.options.temperature ?? providerConfig?.temperature ?? 0.7,
      max_tokens: context.options.maxTokens ?? providerConfig?.maxTokens ?? 2048,
    };

    if (context.options.responseMimeType === 'application/json') {
      requestBody.response_format = { type: 'json_object' };
    }

    const timeout = context.options.timeout ?? providerConfig?.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP Error ${response.status}: ${errText}`);
      }

      const responseData = await response.json();
      const text = responseData.choices?.[0]?.message?.content || '';
      const usage = responseData.usage;

      return {
        text,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens || 0,
              completionTokens: usage.completion_tokens || 0,
              totalTokens: usage.total_tokens || 0,
            }
          : undefined,
        provider: this.metadata.id,
        model: modelName,
        requestId: context.requestId,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw this.wrapError(error);
    }
  }

  public async getStatus(config?: { apiKey?: string; baseUrl?: string }): Promise<ProviderStatus> {
    if (this.metadata.isLocal) {
      return 'LOCAL_ONLY';
    }
    const key = config?.apiKey || this.getApiKey();
    if (!key || key === 'your_api_key_here') {
      return 'DISABLED';
    }
    return 'ACTIVE';
  }

  protected wrapError(error: any): Error {
    const msg = error.message || '';
    if (error.name === 'AbortError') {
      return new TimeoutError(`Request timed out for provider "${this.metadata.id}"`, this.metadata.id);
    }
    if (
      msg.includes('401') ||
      msg.includes('unauthorized') ||
      msg.includes('auth') ||
      msg.includes('key')
    ) {
      return new AuthenticationError(msg, this.metadata.id, 401);
    }
    if (msg.includes('429') || msg.includes('rate') || msg.includes('quota')) {
      return new RateLimitError(msg, this.metadata.id, 429);
    }
    return new ProviderError(msg, this.metadata.id, 500, error);
  }
}
export default OpenAICompatibleProvider;
