import { AIMiddleware } from '../types';
import { ModelRegistry } from '../models';

export const metricsMiddleware: AIMiddleware = async (context, next) => {
  const response = await next(context);

  if (response.usage) {
    const modelMeta = ModelRegistry.getModel(response.model);
    if (modelMeta) {
      const inputCost = (response.usage.promptTokens / 1_000_000) * modelMeta.costPerMillionInput;
      const outputCost = (response.usage.completionTokens / 1_000_000) * modelMeta.costPerMillionOutput;
      const totalCost = inputCost + outputCost;
      
      response.cost = parseFloat(totalCost.toFixed(6));
      console.log(
        `[AI Metrics] [${context.requestId}] Model: "${response.model}" | ` +
        `Tokens: ${response.usage.promptTokens} in / ${response.usage.completionTokens} out | ` +
        `Est. Cost: $${response.cost.toFixed(6)}`
      );
    }
  }

  return response;
};
export default metricsMiddleware;
