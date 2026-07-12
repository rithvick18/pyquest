import { AIRequestContext, AIResponse, AIMiddleware } from '../types';
import loggingMiddleware from './logging';
import authMiddleware from './auth';
import cachingMiddleware from './caching';
import retryMiddleware from './retry';
import metricsMiddleware from './metrics';

const pipeline: AIMiddleware[] = [
  loggingMiddleware,
  metricsMiddleware, // Metrics estimation
  cachingMiddleware, // Cache check
  retryMiddleware,   // Retry & Failover
  authMiddleware,    // Authentication key presence check
];

export async function runMiddlewarePipeline(
  context: AIRequestContext,
  executeProvider: (context: AIRequestContext) => Promise<AIResponse>
): Promise<AIResponse> {
  let index = 0;

  const run = async (ctx: AIRequestContext): Promise<AIResponse> => {
    if (index < pipeline.length) {
      const middleware = pipeline[index++];
      // Pass the updated context and the next function in the chain
      return middleware(ctx, run);
    }
    // All middleware executed, call bottom handler (provider invocation)
    return executeProvider(ctx);
  };

  return run(context);
}
