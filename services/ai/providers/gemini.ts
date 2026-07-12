import { GoogleGenAI } from '@google/genai';
import { BaseProvider } from './base';
import { AIRequestContext, AIResponse, ProviderMetadata, ProviderStatus } from '../types';
import { ConfigService } from '../config';
import { LLMRegistry } from '../registry';
import { AuthenticationError, RateLimitError, TimeoutError, ProviderError } from '../types/errors';

export class GeminiProvider extends BaseProvider {
  public metadata: ProviderMetadata = {
    id: 'gemini',
    name: 'Google Gemini',
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
    const apiKey = providerConfig?.apiKey || config.providers.gemini.apiKey;

    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new AuthenticationError(
        'Google Gemini API key is missing. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY.',
        'gemini'
      );
    }

    const modelName = context.options.model || providerConfig?.model || config.providers.gemini.defaultModel;

    try {
      const ai = new GoogleGenAI({ apiKey });

      const contents = context.contents;
      let geminiContents: any;

      if (typeof contents === 'string') {
        geminiContents = contents;
      } else {
        // Map roles: user/system -> user (system instructions passed in config), assistant -> model
        // Filter system messages out as they are passed to systemInstruction in config
        const nonSystemMessages = contents.filter(m => m.role !== 'system');
        geminiContents = nonSystemMessages.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));
      }

      const geminiConfig: any = {
        temperature: context.options.temperature ?? providerConfig?.temperature ?? config.temperature,
        maxOutputTokens: context.options.maxTokens ?? providerConfig?.maxTokens ?? config.maxTokens,
      };

      // Extract system instructions from options or contents
      let systemInstruction = context.options.systemInstruction;
      if (!systemInstruction && Array.isArray(contents)) {
        const sysMsg = contents.find(m => m.role === 'system');
        if (sysMsg) {
          systemInstruction = sysMsg.content;
        }
      }

      if (systemInstruction) {
        geminiConfig.systemInstruction = systemInstruction;
      }

      if (context.options.responseMimeType) {
        geminiConfig.responseMimeType = context.options.responseMimeType;
      }

      if (context.options.responseSchema) {
        geminiConfig.responseSchema = context.options.responseSchema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: geminiContents,
        config: geminiConfig,
      });

      const text = response.text || '';
      const usageMetadata = response.usageMetadata;

      return {
        text,
        usage: {
          promptTokens: usageMetadata?.promptTokenCount || 0,
          completionTokens: usageMetadata?.candidatesTokenCount || 0,
          totalTokens: usageMetadata?.totalTokenCount || 0,
        },
        provider: 'gemini',
        model: modelName,
        requestId: context.requestId,
      };
    } catch (error: any) {
      throw this.wrapError(error);
    }
  }

  public async getStatus(config?: { apiKey?: string }): Promise<ProviderStatus> {
    const apiKey = config?.apiKey || ConfigService.get().providers.gemini.apiKey;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return 'DISABLED';
    }
    return 'ACTIVE';
  }

  private wrapError(error: any): Error {
    const msg = error.message || '';
    if (
      msg.includes('API_KEY') ||
      msg.includes('API key') ||
      msg.includes('401') ||
      msg.includes('authentication') ||
      msg.includes('key is invalid')
    ) {
      return new AuthenticationError(msg, 'gemini', error.status || 401);
    }
    if (msg.includes('rate') || msg.includes('quota') || msg.includes('429')) {
      return new RateLimitError(msg, 'gemini', error.status || 429);
    }
    if (msg.includes('timeout') || msg.includes('deadline')) {
      return new TimeoutError(msg, 'gemini', error.status || 408);
    }
    return new ProviderError(msg, 'gemini', error.status || 500, error);
  }
}

// Self-register with registry
LLMRegistry.register(new GeminiProvider());
