import { Lesson, LessonContent } from "../types";

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

// Retrieves user custom AI preferences from localStorage
function getLocalAISettings() {
  try {
    const saved = localStorage.getItem('pyquest-ai-settings');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.warn('Failed to load local AI settings:', e);
    return {};
  }
}

// User-friendly error messages helper
function getErrorMessage(error: any): string {
  const message = error.message || '';
  const errorType = error.error || '';

  if (errorType === 'AuthenticationError') {
    return 'Authentication failed. Please verify the API key in the AI Settings panel.';
  }
  if (errorType === 'RateLimitError') {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (errorType === 'TimeoutError') {
    return 'Request timed out. Please try again.';
  }
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return message || 'Failed to load content. Please try again.';
}

export const fetchLessonContent = async (lesson: Lesson): Promise<LessonContent> => {
  // Check client-side cache first
  const cached = getCachedLesson(lesson.id);
  if (cached) {
    console.log('Serving lesson from cache:', lesson.id);
    return cached;
  }

  const aiSettings = getLocalAISettings();

  try {
    const response = await fetch('/api/ai/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'lesson',
        payload: {
          lesson: {
            title: lesson.title,
            module: lesson.module,
            difficulty: lesson.difficulty,
          },
          options: {
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            timeout: aiSettings.timeout,
            retries: aiSettings.retries,
            failoverProviders: aiSettings.failoverProviders,
          }
        },
        providerConfig: aiSettings
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to fetch content');
    }

    const content: LessonContent = {
      ...result.data,
      sources: []
    };

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
  const aiSettings = getLocalAISettings();

  try {
    const response = await fetch('/api/ai/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'chat',
        payload: {
          message,
          history,
          currentContext,
          options: {
            temperature: aiSettings.temperature,
            maxTokens: aiSettings.maxTokens,
            timeout: aiSettings.timeout,
            retries: aiSettings.retries,
            failoverProviders: aiSettings.failoverProviders,
          }
        },
        providerConfig: aiSettings
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to execute chat');
    }

    return result.data || "I'm sorry, I couldn't process that.";
  } catch (error: any) {
    console.error('Chat response failed:', error);
    return `Sorry, I ran into an issue: ${getErrorMessage(error)}`;
  }
};
export default { fetchLessonContent, getChatResponse };
