import { AIRequestContext, AIResponse, ProviderConfig, ChatMessage, LLMRequestOptions } from './types';
import { LLMRegistry } from './registry';
import { ConfigService } from './config';
import { runMiddlewarePipeline } from './middleware';
import { AIError, ProviderError } from './types/errors';

export class AIService {
  private static generateRequestId(): string {
    return `req_${Math.random().toString(36).substring(2, 11)}`;
  }

  public static async execute(
    task: 'lesson' | 'chat' | 'test',
    payload: { contents: string | ChatMessage[]; options: LLMRequestOptions },
    providerConfig?: ProviderConfig
  ): Promise<AIResponse> {
    const config = ConfigService.get();
    const requestId = this.generateRequestId();

    // Select provider dynamically based on priority:
    // 1. Runtime providerConfig.provider parameter
    // 2. Env variable (AI_PROVIDER)
    // 3. Fallback default ('gemini')
    const providerId = (providerConfig as any)?.provider || config.defaultProvider || 'gemini';

    const requestContext: AIRequestContext = {
      requestId,
      task,
      providerId,
      contents: payload.contents,
      options: payload.options,
      providerConfig,
    };

    try {
      const response = await runMiddlewarePipeline(requestContext, async (ctx) => {
        const provider = LLMRegistry.getProvider(ctx.providerId);
        return provider.generateContent(ctx);
      });

      return response;
    } catch (error: any) {
      if (error instanceof AIError) {
        throw error;
      }
      throw new ProviderError(
        error.message || 'An unexpected error occurred during AI execution',
        providerId,
        500,
        error
      );
    }
  }
}
export default AIService;
