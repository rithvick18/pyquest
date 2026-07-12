import { IncomingMessage, ServerResponse } from 'http';
import { AIService } from '../service';
import { LLMRegistry } from '../registry';
import { ModelRegistry } from '../models';
import { getLessonPromptV1, LESSON_SCHEMA_V1 } from '../prompts/lesson/v1';
import { getChatSystemInstructionV1 } from '../prompts/chat/v1';

export async function handleAiRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  res.setHeader('Content-Type', 'application/json');

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // GET /api/ai/providers
  if (path === '/api/ai/providers' && req.method === 'GET') {
    try {
      const providers = LLMRegistry.listProviders();
      const list = await Promise.all(
        providers.map(async (p) => {
          const status = await p.getStatus();
          const models = ModelRegistry.getModelsForProvider(p.metadata.id);
          return {
            id: p.metadata.id,
            name: p.metadata.name,
            capabilities: p.metadata.capabilities,
            isLocal: p.metadata.isLocal,
            status,
            models: models.map((m) => ({ id: m.id, name: m.name, capabilities: m.capabilities })),
          };
        })
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ providers: list }));
    } catch (error: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to list providers', message: error.message }));
    }
    return;
  }

  // POST /api/ai/execute
  if (path === '/api/ai/execute' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const parsedBody = JSON.parse(body || '{}');
      const { task, payload, providerConfig } = parsedBody;

      if (!task) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing task parameter' }));
        return;
      }

      let contents = payload?.contents;
      let options = payload?.options || {};

      if (task === 'lesson') {
        const { lesson } = payload;
        contents = getLessonPromptV1(lesson);
        options = {
          ...options,
          responseMimeType: 'application/json',
          responseSchema: LESSON_SCHEMA_V1,
        };
      } else if (task === 'chat') {
        const { message, history, currentContext } = payload;
        
        options.systemInstruction = getChatSystemInstructionV1({
          lessonTitle: currentContext?.lessonTitle || 'Python',
        });
        
        contents = [
          ...history.map((h: any) => ({ role: h.role, content: h.content })),
          { role: 'user', content: message },
        ];
      } else if (task === 'test') {
        const providerId = providerConfig?.provider || 'gemini';
        const provider = LLMRegistry.getProvider(providerId);
        const success = await provider.testConnection(providerConfig);
        res.statusCode = 200;
        res.end(JSON.stringify({ success }));
        return;
      }

      // Execute request in AIService
      const result = await AIService.execute(task, { contents, options }, providerConfig);

      let data: any = result.text;
      if (task === 'lesson') {
        try {
          data = JSON.parse(result.text.trim());
        } catch (e) {
          data = extractAndParseJson(result.text);
        }
      }

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          data,
          usage: result.usage,
          cost: result.cost,
          provider: result.provider,
          model: result.model,
          requestId: result.requestId,
        })
      );
    } catch (error: any) {
      console.error('[AI Execute Route Error]:', error);
      res.statusCode = error.status || 500;
      res.end(
        JSON.stringify({
          error: error.name || 'AIError',
          message: error.message || 'Failed to execute task',
          provider: error.providerId,
        })
      );
    }
    return;
  }

  // Not Found
  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

function getRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

function extractAndParseJson(text: string): any {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  const rawJson = match ? match[1] : text;
  return JSON.parse(rawJson.trim());
}
