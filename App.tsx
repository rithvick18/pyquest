
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Roadmap from './components/Roadmap';
import LessonContent from './components/LessonContent';
import AIAssistant from './components/AIAssistant';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer, useToast } from './components/Toast';
import StatsPanel from './components/StatsPanel';
import SearchModal from './components/SearchModal';
import { Lesson, LessonContent as LessonContentType, Progress, Theme, UserStats, Achievement, DEFAULT_ACHIEVEMENTS } from './types';
import { fetchLessonContent } from './services/geminiService';
import { CURRICULUM, THEMES } from './constants';
import AISettingsModal from './components/AISettingsModal';

// Default stats for new users
const DEFAULT_STATS: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  totalXP: 0,
  totalLessonsCompleted: 0,
  totalTimeSpentMs: 0,
  quizAccuracy: 0,
  codeSuccessRate: 0
};

const App: React.FC = () => {
  const [progress, setProgress] = useState<Progress>(() => {
    const saved = localStorage.getItem('pyquest-progress-v2');
    return saved ? JSON.parse(saved) : {
      completedLessonIds: [],
      currentLessonId: ''
    };
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('pyquest-stats');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Update streak if needed
      const today = new Date().toISOString().split('T')[0];
      const lastActive = parsed.lastActiveDate;
      const daysDiff = Math.floor((new Date(today).getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        // Streak broken
        return { ...parsed, currentStreak: 0, lastActiveDate: today };
      } else if (daysDiff === 1) {
        // Continue streak
        return {
          ...parsed,
          currentStreak: parsed.currentStreak + 1,
          longestStreak: Math.max(parsed.longestStreak, parsed.currentStreak + 1),
          lastActiveDate: today
        };
      }
      return parsed;
    }
    return DEFAULT_STATS;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('pyquest-achievements');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pyquest-theme-id');
    return THEMES.find(t => t.id === saved) || THEMES[0];
  });

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [currentContent, setCurrentContent] = useState<LessonContentType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { toasts, dismissToast, success, error } = useToast();

  // Persist data
  useEffect(() => {
    localStorage.setItem('pyquest-progress-v2', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('pyquest-stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('pyquest-achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('pyquest-theme-id', currentTheme.id);
  }, [currentTheme]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K for search
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // CSS Variable Injection for Theming
  const themeStyles = {
    '--bg-primary': currentTheme.colors.bgPrimary,
    '--bg-secondary': currentTheme.colors.bgSecondary,
    '--bg-tertiary': currentTheme.colors.bgTertiary,
    '--text-primary': currentTheme.colors.textPrimary,
    '--text-secondary': currentTheme.colors.textSecondary,
    '--accent-primary': currentTheme.colors.accentPrimary,
    '--accent-hover': currentTheme.colors.accentHover,
    '--border-color': currentTheme.colors.border,
    '--code-bg': currentTheme.colors.codeBg,
    '--font-body': currentTheme.fontFamily,
  } as React.CSSProperties;

  const totalLessons = useMemo(() => CURRICULUM.flatMap(m => m.lessons), []);
  const progressPercentage = useMemo(() => {
    if (totalLessons.length === 0) return 0;
    return Math.round((progress.completedLessonIds.length / totalLessons.length) * 100);
  }, [progress.completedLessonIds, totalLessons]);

  const handleSelectLesson = useCallback(async (lesson: Lesson) => {
    setActiveLesson(lesson);
    setLoading(true);
    setLoadError(null);

    try {
      const content = await fetchLessonContent(lesson);
      setCurrentContent(content);
    } catch (err: any) {
      console.error("Failed to load lesson:", err);
      setLoadError(err.message || 'Failed to load lesson');
      error('Failed to load lesson', err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const handleBackToMap = () => {
    setActiveLesson(null);
    setCurrentContent(null);
    setLoadError(null);
  };

  const unlockAchievement = useCallback((achievementId: string) => {
    setAchievements(prev => {
      const existing = prev.find(a => a.id === achievementId);
      if (existing?.unlockedAt) return prev;

      const defaultAch = DEFAULT_ACHIEVEMENTS.find(a => a.id === achievementId);
      if (!defaultAch) return prev;

      success(`Achievement Unlocked: ${defaultAch.title}`, defaultAch.description);

      return [...prev.filter(a => a.id !== achievementId), {
        ...defaultAch,
        unlockedAt: new Date().toISOString()
      }];
    });
  }, [success]);

  const handleComplete = useCallback(() => {
    if (!activeLesson) return;

    const isFirstCompletion = !progress.completedLessonIds.includes(activeLesson.id);

    setProgress(prev => {
      if (prev.completedLessonIds.includes(activeLesson.id)) return prev;
      return {
        ...prev,
        completedLessonIds: [...prev.completedLessonIds, activeLesson.id]
      };
    });

    if (isFirstCompletion) {
      // Award XP
      const xpEarned = activeLesson.difficulty === 'Beginner' ? 50 :
        activeLesson.difficulty === 'Intermediate' ? 100 : 150;

      setStats(prev => ({
        ...prev,
        totalXP: prev.totalXP + xpEarned,
        totalLessonsCompleted: prev.totalLessonsCompleted + 1,
        lastActiveDate: new Date().toISOString().split('T')[0]
      }));

      success(`+${xpEarned} XP`, `Completed: ${activeLesson.title}`);

      // Check achievements
      const newCompletedCount = progress.completedLessonIds.length + 1;

      if (newCompletedCount === 1) {
        unlockAchievement('first-lesson');
      }
      if (newCompletedCount === 10) {
        unlockAchievement('ten-lessons');
      }
      if (stats.currentStreak >= 3) {
        unlockAchievement('streak-3');
      }
      if (stats.currentStreak >= 7) {
        unlockAchievement('streak-7');
      }
    }

    handleBackToMap();
  }, [activeLesson, progress.completedLessonIds, stats.currentStreak, success, unlockAchievement]);

  return (
    <ErrorBoundary>
      <div
        className="flex h-screen w-full transition-colors duration-300"
        style={{
          ...themeStyles,
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-body)'
        }}
      >
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Stats Panel */}
        <StatsPanel
          stats={stats}
          achievements={achievements}
          isOpen={showStatsPanel}
          onClose={() => setShowStatsPanel(false)}
        />

        {/* Search Modal */}
        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelectLesson={handleSelectLesson}
          completedLessonIds={progress.completedLessonIds}
        />

        {/* AI Settings Modal */}
        <AISettingsModal
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          currentTheme={currentTheme}
        />

        {/* Sidebar Navigation */}
        <Sidebar
          progress={progress}
          currentTheme={currentTheme}
          stats={stats}
          onOpenStats={() => setShowStatsPanel(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--bg-primary)]">
          {/* Modern Top Header */}
          <header className="h-16 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl flex items-center justify-between px-8 z-20 transition-colors duration-300 shrink-0">
            <div className="flex items-center gap-4">
              {activeLesson ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToMap}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                  </button>
                  <div className="h-6 w-px bg-[var(--border-color)]"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] leading-none">{activeLesson.module}</span>
                    <span className="text-sm font-bold text-[var(--text-primary)] leading-none mt-1">{activeLesson.title}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Search button */}
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-colors"
                  >
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <span className="hidden md:inline">Search lessons...</span>
                    <kbd className="hidden md:inline ml-2 px-1.5 py-0.5 bg-[var(--bg-primary)] rounded text-[10px]">Ctrl+K</kbd>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">

              {/* AI Architecture Settings */}
              <button
                onClick={() => setShowAISettings(true)}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                title="Configure AI Providers & Models"
              >
                <i className="fa-solid fa-sliders"></i>
                <span className="hidden md:inline">AI Settings</span>
              </button>

              {/* Theme Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  <i className="fa-solid fa-palette"></i>
                  <span className="hidden md:inline">{currentTheme.name}</span>
                  <i className="fa-solid fa-chevron-down text-[10px]"></i>
                </button>

                {showThemeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowThemeMenu(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="p-2 space-y-1">
                        {THEMES.map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setCurrentTheme(theme);
                              setShowThemeMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${currentTheme.id === theme.id
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                              }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ background: theme.colors.bgPrimary }}
                            ></span>
                            {theme.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Progress</span>
                <div className="flex items-center gap-3">
                  <div className="w-24 md:w-32 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-primary)] shadow-[0_0_10px_rgba(var(--accent-primary),0.5)] transition-all duration-1000"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content Switcher */}
          {loadError ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                  <i className="fa-solid fa-triangle-exclamation text-2xl text-red-500"></i>
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to Load Lesson</h3>
                <p className="text-[var(--text-secondary)] mb-4">{loadError}</p>
                <button
                  onClick={() => activeLesson && handleSelectLesson(activeLesson)}
                  className="px-6 py-2 bg-[var(--accent-primary)] text-white rounded-lg font-bold hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : activeLesson ? (
            <LessonContent
              content={currentContent}
              loading={loading}
              onComplete={handleComplete}
              isCompleted={progress.completedLessonIds.includes(activeLesson.id)}
              currentTheme={currentTheme}
            />
          ) : (
            <Roadmap
              progress={progress}
              onSelectLesson={handleSelectLesson}
            />
          )}
        </main>

        {/* Context-Aware AI Chatbot */}
        <AIAssistant
          currentContext={{
            lessonTitle: currentContent?.title || activeLesson?.title || 'Home',
            lessonSummary: currentContent?.summary || 'User is navigating the curriculum map.'
          }}
          currentTheme={currentTheme}
        />
      </div>
    </ErrorBoundary>
  );
};

export default App;

