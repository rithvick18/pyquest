import { BaseProvider } from './base';
import { AIRequestContext, AIResponse, ProviderMetadata, ProviderStatus } from '../types';
import { ConfigService } from '../config';
import { AuthenticationError, RateLimitError, TimeoutError, ProviderError } from '../types/errors';

export class AnthropicProvider extends BaseProvider {
  public metadata: ProviderMetadata = {
    id: 'anthropic',
    name: 'Anthropic Claude',
    capabilities: {
      vision: true,
      json: true,
      streaming: true,
      tools: true,
    },
    isLocal: false,
  };

  public async generateContent(context: AIRequestContext): Promise<AIResponse> {
    const config = ConfigService.get();
    const providerConfig = context.providerConfig;
    const apiKey = providerConfig?.apiKey || config.providers.anthropic.apiKey;
    const baseUrl = providerConfig?.baseUrl || config.providers.anthropic.baseUrl;
    const modelName = context.options.model || providerConfig?.model || config.providers.anthropic.defaultModel;

    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new AuthenticationError(
        'Anthropic API key is missing. Set ANTHROPIC_API_KEY.',
        'anthropic'
      );
    }

    // Format messages
    const anthropicMessages: any[] = [];
    let systemInstruction = context.options.systemInstruction;
    const contents = context.contents;

    if (typeof contents === 'string') {
      anthropicMessages.push({ role: 'user', content: contents });
    } else {
      if (!systemInstruction) {
        const sysMsg = contents.find((m) => m.role === 'system');
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }
      
      contents.forEach((msg) => {
        if (msg.role !== 'system') {
          // Anthropic roles are strictly 'user' and 'assistant'
          anthropicMessages.push({ role: msg.role, content: msg.content });
        }
      });
    }

    const requestBody: any = {
      model: modelName,
      messages: anthropicMessages,
      max_tokens: context.options.maxTokens ?? providerConfig?.maxTokens ?? 2048,
      temperature: context.options.temperature ?? providerConfig?.temperature ?? 0.7,
    };

    if (systemInstruction) {
      requestBody.system = systemInstruction;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerously-allow-host': 'true',
    };

    const timeout = context.options.timeout ?? providerConfig?.timeout ?? 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}/messages`, {
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
      const text = responseData.content?.[0]?.text || '';
      const usage = responseData.usage;

      return {
        text,
        usage: usage
          ? {
              promptTokens: usage.input_tokens || 0,
              completionTokens: usage.output_tokens || 0,
              totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
            }
          : undefined,
        provider: 'anthropic',
        model: modelName,
        requestId: context.requestId,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw this.wrapError(error);
    }
  }

  public async getStatus(config?: { apiKey?: string }): Promise<ProviderStatus> {
    const apiKey = config?.apiKey || ConfigService.get().providers.anthropic.apiKey;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return 'DISABLED';
    }
    return 'ACTIVE';
  }

  private wrapError(error: any): Error {
    const msg = error.message || '';
    if (error.name === 'AbortError') {
      return new TimeoutError('Request timed out for Anthropic', 'anthropic');
    }
    if (
      msg.includes('401') ||
      msg.includes('unauthorized') ||
      msg.includes('auth') ||
      msg.includes('api_key')
    ) {
      return new AuthenticationError(msg, 'anthropic', 401);
    }
    if (msg.includes('429') || msg.includes('rate') || msg.includes('quota')) {
      return new RateLimitError(msg, 'anthropic', 429);
    }
    return new ProviderError(msg, 'anthropic', 500, error);
  }
}
