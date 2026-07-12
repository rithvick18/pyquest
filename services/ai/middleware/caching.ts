import { AIMiddleware } from '../types';
import { MemoryCache } from '../cache/memory';

export const cachingMiddleware: AIMiddleware = async (context, next) => {
  // Only cache lesson tasks since lesson content is static/idempotent
  if (context.task !== 'lesson') {
    return next(context);
  }

  // Create cache key based on provider, model, and prompt content
  const cacheKey = JSON.stringify({
    provider: context.providerId,
    model: context.options.model,
    contents: context.contents,
  });

  const cachedResponse = MemoryCache.get(cacheKey);
  if (cachedResponse) {
    console.log(`[AI Cache] [${context.requestId}] Cache Hit! Serving cached response.`);
    // Return response with the current request ID
    return {
      ...cachedResponse,
      requestId: context.requestId,
    };
  }

  const response = await next(context);

  // Cache successful response for 10 minutes
  MemoryCache.set(cacheKey, response, 10 * 60 * 1000);
  console.log(`[AI Cache] [${context.requestId}] Cache Miss. Cached response in memory.`);

  return response;
};
export default cachingMiddleware;
