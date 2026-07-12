import { Plugin } from 'vite';
import { handleAiRequest } from './handler';

export function aiApiPlugin(): Plugin {
  return {
    name: 'ai-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/ai/')) {
          try {
            await handleAiRequest(req, res);
          } catch (error) {
            console.error('[Vite AI Plugin] Error handling API request:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'InternalServerError',
                message: (error as Error).message,
              })
            );
          }
        } else {
          next();
        }
      });
    },
  };
}
export default aiApiPlugin;
