import { AIMiddleware } from '../types';
import { LLMRegistry } from '../registry';
import { AuthenticationError } from '../types/errors';

export const authMiddleware: AIMiddleware = async (context, next) => {
  const provider = LLMRegistry.getProvider(context.providerId);

  // If the provider is a cloud service, check that the status is not DISABLED
  if (!provider.metadata.isLocal) {
    const status = await provider.getStatus(context.providerConfig);
    if (status === 'DISABLED') {
      throw new AuthenticationError(
        `API key for cloud provider "${provider.metadata.name}" is not configured. Please supply an API key or configure it on the server.`,
        context.providerId
      );
    }
  }

  return next(context);
};
export default authMiddleware;
