import { AIMiddleware } from '../types';

export const loggingMiddleware: AIMiddleware = async (context, next) => {
  const startTime = Date.now();
  console.log(`[AI Request Logger] [${context.requestId}] Task: "${context.task}" | Provider: "${context.providerId}" | Model: "${context.options.model || 'default'}" - Initiated`);

  try {
    const response = await next(context);
    const duration = Date.now() - startTime;
    console.log(`[AI Request Logger] [${context.requestId}] Success | Latency: ${duration}ms | Model used: "${response.model}"`);
    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[AI Request Logger] [${context.requestId}] Failure | Latency: ${duration}ms | Error: "${error.message || error}"`);
    throw error;
  }
};
export default loggingMiddleware;
