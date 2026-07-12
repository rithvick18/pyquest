import { AIMiddleware, AIResponse, AIRequestContext } from '../types';
import { LLMRegistry } from '../registry';

export const retryMiddleware: AIMiddleware = async (context, next) => {
  const maxRetries = context.options.retries ?? context.providerConfig?.retries ?? 3;
  const baseDelayMs = 1000;

  const executeWithRetry = async (ctx: AIRequestContext): Promise<AIResponse> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await next(ctx);
      } catch (error: any) {
        lastError = error;

        // Immediately throw Authentication Errors since retrying won't fix keys
        if (error.name === 'AuthenticationError') {
          throw error;
        }

        console.warn(
          `[AI Retry] [${ctx.requestId}] Attempt ${attempt + 1}/${maxRetries} failed: "${
            error.message || error
          }"`
        );

        if (attempt < maxRetries - 1) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`All ${maxRetries} retry attempts failed.`);
  };

  try {
    return await executeWithRetry(context);
  } catch (error: any) {
    const failoverProviders =
      context.options.failoverProviders ?? context.providerConfig?.failoverProviders ?? [];

    if (failoverProviders.length > 0) {
      console.warn(
        `[AI Failover] [${context.requestId}] Primary provider "${context.providerId}" failed. Trying fallback list: [${failoverProviders.join(
          ', '
        )}]`
      );

      for (const fallbackId of failoverProviders) {
        if (LLMRegistry.hasProvider(fallbackId)) {
          try {
            console.log(`[AI Failover] [${context.requestId}] Attempting fallback: "${fallbackId}"`);

            const fallbackContext: AIRequestContext = {
              ...context,
              providerId: fallbackId,
              options: {
                ...context.options,
                model: undefined, // Clear model so fallback provider uses its default
              },
            };

            // Call next in middleware chain with the fallback context
            return await next(fallbackContext);
          } catch (fallbackError: any) {
            console.error(
              `[AI Failover] [${context.requestId}] Fallback provider "${fallbackId}" failed: "${
                fallbackError.message || fallbackError
              }"`
            );
          }
        }
      }
    }

    throw error;
  }
};
export default retryMiddleware;
