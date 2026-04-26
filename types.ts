
export interface Lesson {
  id: string;
  title: string;
  module: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  subtopics: string[];
}

export interface Module {
  id: string;
  title: string;
  path: string;
  lessons: Lesson[];
}

export type StepType = 'theory' | 'quiz' | 'code';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface CodeChallenge {
  initialCode: string;
  expectedOutput: string; // Substring to match in stdout
  hint: string;
  solution: string;
}

export interface LessonStep {
  id: string;
  type: StepType;
  title: string;
  content: string; // Markdown for theory or question text
  options?: QuizOption[]; // For quiz
  code?: CodeChallenge; // For code steps
}

export interface Source {
  title: string;
  uri: string;
}

export interface LessonContent {
  title: string;
  steps: LessonStep[];
  summary: string;
  sources: Source[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Progress {
  completedLessonIds: string[];
  currentLessonId: string;
}

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentHover: string;
  border: string;
  codeBg: string;
}

export interface Theme {
  id: string;
  name: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
  fontFamily: string;
}

// Enhanced Progress Types
export interface StepAttempt {
  stepId: string;
  attempts: number;
  completed: boolean;
  usedHint: boolean;
  usedSolution: boolean;
  timeSpentMs: number;
}

export interface LessonRecord {
  lessonId: string;
  completedAt: string; // ISO date string
  attempts: StepAttempt[];
  totalTimeMs: number;
  xpEarned: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string; // ISO date string, undefined if locked
}

export interface UserStats {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // ISO date string
  totalXP: number;
  totalLessonsCompleted: number;
  totalTimeSpentMs: number;
  quizAccuracy: number; // 0-100
  codeSuccessRate: number; // 0-100
}

export interface EnhancedProgress {
  completedLessonIds: string[];
  currentLessonId: string;
  lessonRecords: Record<string, LessonRecord>;
  stats: UserStats;
  achievements: Achievement[];
}

// Legacy Progress interface (for backward compatibility)
export interface Progress {
  completedLessonIds: string[];
  currentLessonId: string;
}

// XP and Level Constants
export const XP_PER_LEVEL = 500;
export const LEVEL_TITLES = [
  'Novice',
  'Apprentice',
  'Developer',
  'Architect',
  'Master',
  'Grandmaster'
];

export function calculateLevel(xp: number): { level: number; title: string; progress: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
  const title = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  return { level, title, progress };
}

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-lesson', title: 'First Steps', description: 'Complete your first lesson', icon: 'fa-flag-checkered' },
  { id: 'streak-3', title: 'On Fire', description: 'Maintain a 3-day streak', icon: 'fa-fire' },
  { id: 'streak-7', title: 'Unstoppable', description: 'Maintain a 7-day streak', icon: 'fa-bolt' },
  { id: 'perfect-quiz', title: 'Quiz Master', description: 'Get a quiz right on the first try', icon: 'fa-trophy' },
  { id: 'first-code', title: 'Hello World', description: 'Complete your first code challenge', icon: 'fa-code' },
  { id: 'ten-lessons', title: 'Dedicated Learner', description: 'Complete 10 lessons', icon: 'fa-medal' },
  { id: 'module-complete', title: 'Module Master', description: 'Complete an entire module', icon: 'fa-crown' },
];

