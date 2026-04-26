import React, { useState, useMemo } from 'react';
import { UserStats, Achievement, calculateLevel, DEFAULT_ACHIEVEMENTS } from '../types';

interface StatsPanelProps {
    stats: UserStats;
    achievements: Achievement[];
    isOpen: boolean;
    onClose: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, achievements, isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'achievements'>('overview');

    const levelInfo = useMemo(() => calculateLevel(stats.totalXP), [stats.totalXP]);

    const mergedAchievements = useMemo(() => {
        return DEFAULT_ACHIEVEMENTS.map(defaultAch => {
            const userAch = achievements.find(a => a.id === defaultAch.id);
            return userAch || defaultAch;
        });
    }, [achievements]);

    const unlockedCount = achievements.filter(a => a.unlockedAt).length;

    if (!isOpen) return null;

    // Format time
    const formatTime = (ms: number): string => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-color)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Progress</h2>
                        <p className="text-sm text-[var(--text-secondary)]">Level {levelInfo.level} • {levelInfo.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"
                    >
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Level Progress Card */}
                <div className="p-6">
                    <div className="bg-gradient-to-r from-[var(--accent-primary)]/20 to-purple-500/20 rounded-2xl p-6 border border-[var(--accent-primary)]/30">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[var(--accent-primary)] to-purple-500 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                {levelInfo.level}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-[var(--text-secondary)] mb-1">
                                    {stats.totalXP.toLocaleString()} XP Total
                                </div>
                                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-purple-500 transition-all duration-500"
                                        style={{ width: `${levelInfo.progress}%` }}
                                    />
                                </div>
                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                    {Math.round(500 - (levelInfo.progress * 5))} XP to next level
                                </div>
                            </div>
                        </div>

                        {/* Streak */}
                        <div className="flex items-center gap-2 text-orange-400">
                            <i className="fa-solid fa-fire text-xl"></i>
                            <span className="font-bold">{stats.currentStreak} day streak</span>
                            {stats.currentStreak >= 3 && <span className="text-xs">🔥</span>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'overview'
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('achievements')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'achievements'
                                ? 'bg-[var(--accent-primary)] text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        Achievements ({unlockedCount}/{mergedAchievements.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-4">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-[var(--text-primary)]">
                                        {stats.totalLessonsCompleted}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                                        Lessons Completed
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-[var(--text-primary)]">
                                        {formatTime(stats.totalTimeSpentMs)}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                                        Time Learning
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-emerald-500">
                                        {Math.round(stats.quizAccuracy)}%
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                                        Quiz Accuracy
                                    </div>
                                </div>
                                <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 text-center">
                                    <div className="text-2xl font-black text-blue-500">
                                        {Math.round(stats.codeSuccessRate)}%
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                                        Code Success
                                    </div>
                                </div>
                            </div>

                            {/* Best Streak */}
                            <div className="bg-[var(--bg-tertiary)] rounded-xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                    <i className="fa-solid fa-fire text-orange-500"></i>
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--text-secondary)]">Best Streak</div>
                                    <div className="text-lg font-bold text-[var(--text-primary)]">
                                        {stats.longestStreak} days
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'achievements' && (
                        <div className="space-y-3">
                            {mergedAchievements.map(ach => (
                                <div
                                    key={ach.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${ach.unlockedAt
                                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                                            : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] opacity-60 grayscale'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${ach.unlockedAt
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                                        }`}>
                                        <i className={`fa-solid ${ach.icon}`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-[var(--text-primary)]">{ach.title}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">{ach.description}</div>
                                        {ach.unlockedAt && (
                                            <div className="text-[10px] text-[var(--accent-primary)] mt-1">
                                                Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                                            </div>
                                        )}
                                    </div>
                                    {ach.unlockedAt && (
                                        <i className="fa-solid fa-check text-[var(--accent-primary)]"></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default StatsPanel;
