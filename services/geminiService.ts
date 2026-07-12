
import { GoogleGenAI, Type } from "@google/genai";
import { Lesson, LessonContent, Source } from "../types";

// Lazy initialization of GoogleGenAI client
let ai: any = null;

function getAIClient() {
  if (ai === null) {
    // Try to get API key from process.env (Vite will replace this at build time)
    const apiKey = process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("Google Gemini AI client not initialized: API key is missing");
      return null;
    }
    try {
      ai = new GoogleGenAI({ apiKey });
      console.log("Google Gemini AI client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Google Gemini AI client:", error);
      return null;
    }
  }
  return ai;
}

// Cache for lesson content to avoid redundant API calls
const CACHE_PREFIX = 'pyquest-lesson-cache-';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLesson {
  content: LessonContent;
  timestamp: number;
}

function getCachedLesson(lessonId: string): LessonContent | null {
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + lessonId);
    if (cached) {
      const parsed: CachedLesson = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        return parsed.content;
      }
      sessionStorage.removeItem(CACHE_PREFIX + lessonId);
    }
  } catch (e) {
    console.warn('Cache read failed:', e);
  }
  return null;
}

function setCachedLesson(lessonId: string, content: LessonContent): void {
  try {
    const cacheEntry: CachedLesson = {
      content,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CACHE_PREFIX + lessonId, JSON.stringify(cacheEntry));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

// Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors
      if (error.message?.includes('API_KEY') || error.message?.includes('invalid')) {
        throw error;
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

// User-friendly error messages
function getErrorMessage(error: any): string {
  const message = error.message || '';

  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (message.includes('API_KEY') || message.includes('authentication')) {
    return 'Configuration error. Please check the API key settings.';
  }
  if (message.includes('rate') || message.includes('quota')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }

  return 'Failed to load content. Please try again.';
}

export const fetchLessonContent = async (lesson: Lesson): Promise<LessonContent> => {
  // Check cache first
  const cached = getCachedLesson(lesson.id);
  if (cached) {
    console.log('Serving lesson from cache:', lesson.id);
    return cached;
  }

  const prompt = `
    Act as an expert Python tutor creating a Duolingo-style interactive lesson for: "${lesson.title}".
    Module: "${lesson.module}", Difficulty: "${lesson.difficulty}".
    
    Create a strictly structured lesson with 5 to 7 interactive steps.
    The steps should flow logically:
    1. Theory (Short, bite-sized explanation based on search results)
    2. Quiz (Multiple choice to check understanding)
    3. Theory or Code Example
    4. Code Challenge (User must run code to proceed)
    
    GUIDELINES:
    - Keep theory concise (max 3 sentences per card).
    - Quizzes must have 3-4 options, one correct.
    - Code Challenges must have 'initialCode' (runnable but maybe incomplete or needing modification) and 'expectedOutput' (what the output contains if correct).
    - The final step should be a summary or a harder challenge.
    
    Return JSON format matching the schema exactly.
  `;

  try {
    const aiClient = getAIClient();
    if (!aiClient) {
      throw new Error("AI service is not available. Please configure the API key.");
    }

    const content = await withRetry(async () => {
      const response = await aiClient.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["theory", "quiz", "code"] },
                    title: { type: Type.STRING },
                    content: { type: Type.STRING, description: "Markdown content for theory or the question for quiz/code" },
                    options: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          text: { type: Type.STRING },
                          isCorrect: { type: Type.BOOLEAN },
                          explanation: { type: Type.STRING }
                        },
                        required: ["id", "text", "isCorrect"]
                      }
                    },
                    code: {
                      type: Type.OBJECT,
                      properties: {
                        initialCode: { type: Type.STRING },
                        expectedOutput: { type: Type.STRING },
                        hint: { type: Type.STRING },
                        solution: { type: Type.STRING }
                      },
                      required: ["initialCode", "expectedOutput", "hint", "solution"]
                    }
                  },
                  required: ["id", "type", "title", "content"]
                }
              }
            },
            required: ["title", "summary", "steps"]
          }
        }
      });

      const parsedContent = JSON.parse(response.text?.trim() || "{}");
      return {
        ...parsedContent,
        sources: []
      } as LessonContent;
    });

    // Cache successful response
    setCachedLesson(lesson.id, content);
    return content;

  } catch (error: any) {
    console.error('Failed to fetch lesson content:', error);
    throw new Error(getErrorMessage(error));
  }
};

export const getChatResponse = async (
  message: string,
  history: { role: 'user' | 'assistant', content: string }[],
  currentContext: { lessonTitle: string, lessonSummary: string }
): Promise<string> => {
  const systemInstruction = `
    You are 'PyQuest Bot', a friendly and helpful AI Python tutor.
    The user is currently learning about: ${currentContext.lessonTitle}.
    
    Help the user understand Python concepts, debug code, or give examples. 
    Keep answers concise, educational, and encouraging. 
    If they ask about something unrelated to Python, politely steer them back to coding.
    Use markdown for code snippets.
  `;

  try {
    const aiClient = getAIClient();
    if (!aiClient) {
      return "AI service is not available. Please configure the API key to use this feature.";
    }

    return await withRetry(async () => {
      const chat = aiClient.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction,
        }
      });

      const response = await chat.sendMessage({ message });
      return response.text || "I'm sorry, I couldn't process that.";
    }, 2); // Fewer retries for chat
  } catch (error: any) {
    console.error('Chat response failed:', error);
    return `Sorry, I ran into an issue: ${getErrorMessage(error)}`;
  }
};
