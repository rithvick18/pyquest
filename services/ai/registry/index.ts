import { LLMProvider } from '../providers/base';
import { GeminiProvider } from '../providers/gemini';
import { OpenAIProvider } from '../providers/openai';
import { GroqProvider } from '../providers/groq';
import { TogetherProvider } from '../providers/together';
import { OpenRouterProvider } from '../providers/openrouter';
import { LMStudioProvider } from '../providers/lmstudio';
import { OllamaProvider } from '../providers/ollama';
import { MistralProvider } from '../providers/mistral';
import { AnthropicProvider } from '../providers/anthropic';
import { AWSBedrockProvider } from '../providers/bedrock';

export class LLMRegistry {
  private static providers = new Map<string, LLMProvider>();
  private static isInitialized = false;

  private static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Instantiate and register all providers
    this.register(new GeminiProvider());
    this.register(new OpenAIProvider());
    this.register(new GroqProvider());
    this.register(new TogetherProvider());
    this.register(new OpenRouterProvider());
    this.register(new LMStudioProvider());
    this.register(new OllamaProvider());
    this.register(new MistralProvider());
    this.register(new AnthropicProvider());
    this.register(new AWSBedrockProvider());

    console.log('[AI Registry] Initialized all providers.');
  }

  public static register(provider: LLMProvider): void {
    this.providers.set(provider.metadata.id, provider);
  }

  public static getProvider(id: string): LLMProvider {
    this.initialize();
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`AI Provider "${id}" not found in registry.`);
    }
    return provider;
  }

  public static hasProvider(id: string): boolean {
    this.initialize();
    return this.providers.has(id);
  }

  public static listProviders(): LLMProvider[] {
    this.initialize();
    return Array.from(this.providers.values());
  }
}
export default LLMRegistry;
