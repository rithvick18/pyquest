import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { aiApiPlugin } from './services/ai/server/vitePlugin';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Expose all loaded env variables to process.env for server-side code execution
    for (const key of Object.keys(env)) {
      if (env[key]) {
        process.env[key] = env[key];
      }
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [tailwindcss(), react(), aiApiPlugin()],
      define: {
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
