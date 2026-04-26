
import React, { useMemo } from 'react';
import { CURRICULUM } from '../constants';
import { Progress, Theme, UserStats, calculateLevel } from '../types';

interface SidebarProps {
  progress: Progress;
  currentTheme: Theme;
  stats?: UserStats;
  onOpenStats?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ progress, currentTheme, stats, onOpenStats }) => {
  // Group curriculum by Path
  const paths = Array.from(new Set(CURRICULUM.map(m => m.path)));

  const totalLessons = CURRICULUM.flatMap(m => m.lessons).length;
  const completedCount = progress.completedLessonIds.length;
  const progressPercentage = Math.round((completedCount / totalLessons) * 100);

  // Calculate level from stats or fallback
  const levelInfo = useMemo(() => {
    const xp = stats?.totalXP ?? completedCount * 100;
    return calculateLevel(xp);
  }, [stats?.totalXP, completedCount]);

  const currentStreak = stats?.currentStreak ?? 0;

  return (
    <aside className="w-72 h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col shadow-2xl z-20 hidden md:flex">

      {/* Brand */}
      <div className="p-6 border-b border-[var(--border-color)]">
        <h1 className="text-2xl font-black flex items-center gap-2 text-[var(--accent-primary)] tracking-tight">
          <i className="fa-brands fa-python"></i>
          <span>PyQuest</span>
        </h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Immersive Python Learning</p>
      </div>

      {/* User Stats Card - Enhanced */}
      <div className="p-4">
        <button
          onClick={onOpenStats}
          className="w-full bg-[var(--bg-tertiary)]/50 rounded-xl p-4 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/50 transition-all group text-left"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--accent-primary)] to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
              {levelInfo.level}
            </div>
            <div className="flex-1">
              <div className="text-xs text-[var(--text-secondary)] uppercase font-bold">Level {levelInfo.level}</div>
              <div className="text-sm font-bold text-[var(--text-primary)]">{levelInfo.title}</div>
            </div>
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-400">
                <i className="fa-solid fa-fire"></i>
                <span className="text-sm font-bold">{currentStreak}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-[var(--text-secondary)]">
              <span>XP Progress</span>
              <span>{stats?.totalXP ?? completedCount * 100} XP</span>
            </div>
            <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-purple-500 transition-all duration-500"
                style={{ width: `${levelInfo.progress}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] text-center group-hover:text-[var(--accent-primary)] transition-colors">
              Click to view stats & achievements
            </div>
          </div>
        </button>
      </div>

      {/* Curriculum Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 space-y-6">
        {paths.map((pathName, idx) => {
          const pathModules = CURRICULUM.filter(m => m.path === pathName);

          return (
            <div key={idx}>
              <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3 pl-2 border-l-2 border-[var(--accent-primary)]">
                {pathName}
              </h3>
              <div className="space-y-2">
                {pathModules.map(mod => {
                  const modLessons = mod.lessons;
                  const modCompleted = modLessons.filter(l => progress.completedLessonIds.includes(l.id)).length;
                  const isDone = modCompleted === modLessons.length;
                  const moduleProgress = modLessons.length > 0 ? (modCompleted / modLessons.length) * 100 : 0;

                  return (
                    <div key={mod.id} className="group cursor-default">
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                        <div className="flex-1">
                          <span className={`text-sm font-medium ${isDone ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                            {mod.title}
                          </span>
                          {/* Module progress bar */}
                          <div className="h-1 bg-[var(--bg-primary)] rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-primary)] transition-all"
                              style={{ width: `${moduleProgress}%` }}
                            />
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-secondary)]">{modCompleted}/{modLessons.length}</span>
                          {isDone && <i className="fa-solid fa-check text-emerald-500 text-xs"></i>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-[var(--border-color)] text-center">
        <p className="text-[10px] text-[var(--text-secondary)]">
          Powered by Gemini 2.5 Flash
        </p>
      </div>

    </aside>
  );
};

export default Sidebar;

