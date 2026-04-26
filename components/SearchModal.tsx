import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CURRICULUM } from '../constants';
import { Lesson } from '../types';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectLesson: (lesson: Lesson) => void;
    completedLessonIds: string[];
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelectLesson, completedLessonIds }) => {
    const [query, setQuery] = useState('');
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const allLessons = useMemo(() => CURRICULUM.flatMap(m => m.lessons), []);

    const filteredLessons = useMemo(() => {
        let results = allLessons;

        // Text search
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(lesson =>
                lesson.title.toLowerCase().includes(lowerQuery) ||
                lesson.description.toLowerCase().includes(lowerQuery) ||
                lesson.subtopics.some(s => s.toLowerCase().includes(lowerQuery)) ||
                lesson.module.toLowerCase().includes(lowerQuery)
            );
        }

        // Difficulty filter
        if (difficultyFilter) {
            results = results.filter(lesson => lesson.difficulty === difficultyFilter);
        }

        return results;
    }, [query, difficultyFilter, allLessons]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredLessons]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setDifficultyFilter(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredLessons.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredLessons[selectedIndex]) {
                        handleSelect(filteredLessons[selectedIndex]);
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedIndex, filteredLessons, onClose]);

    const handleSelect = (lesson: Lesson) => {
        onSelectLesson(lesson);
        onClose();
    };

    if (!isOpen) return null;

    const difficulties = ['Beginner', 'Intermediate', 'Advanced'];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden">

                    {/* Search Header */}
                    <div className="p-4 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-3">
                            <i className="fa-solid fa-magnifying-glass text-[var(--text-secondary)]"></i>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search lessons, topics, or keywords..."
                                className="flex-1 bg-transparent text-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none"
                            />
                            <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] rounded text-xs text-[var(--text-secondary)]">ESC</kbd>
                        </div>

                        {/* Difficulty Filter Chips */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setDifficultyFilter(null)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${difficultyFilter === null
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                All
                            </button>
                            {difficulties.map(diff => (
                                <button
                                    key={diff}
                                    onClick={() => setDifficultyFilter(difficultyFilter === diff ? null : diff)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${difficultyFilter === diff
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {filteredLessons.length === 0 ? (
                            <div className="p-8 text-center">
                                <i className="fa-solid fa-search text-4xl text-[var(--text-secondary)] mb-3"></i>
                                <p className="text-[var(--text-secondary)]">No lessons found matching your search.</p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {filteredLessons.map((lesson, idx) => {
                                    const isCompleted = completedLessonIds.includes(lesson.id);
                                    const isSelected = idx === selectedIndex;

                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => handleSelect(lesson)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`w-full text-left p-4 rounded-xl transition-colors flex items-center gap-4 ${isSelected
                                                    ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30'
                                                    : 'border border-transparent hover:bg-[var(--bg-tertiary)]'
                                                }`}
                                        >
                                            {/* Status Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted
                                                    ? 'bg-emerald-500/20 text-emerald-500'
                                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                                }`}>
                                                {isCompleted
                                                    ? <i className="fa-solid fa-check"></i>
                                                    : <i className="fa-solid fa-play"></i>
                                                }
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-[var(--text-primary)] truncate">{lesson.title}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lesson.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-500' :
                                                            lesson.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-500' :
                                                                'bg-red-500/20 text-red-500'
                                                        }`}>
                                                        {lesson.difficulty}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                                                    {lesson.module} • {lesson.description}
                                                </div>
                                                <div className="flex gap-1 mt-1">
                                                    {lesson.subtopics.slice(0, 3).map((topic, i) => (
                                                        <span key={i} className="text-[10px] px-2 py-0.5 bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)]">
                                                            {topic}
                                                        </span>
                                                    ))}
                                                    {lesson.subtopics.length > 3 && (
                                                        <span className="text-[10px] text-[var(--text-secondary)]">+{lesson.subtopics.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Arrow */}
                                            {isSelected && (
                                                <i className="fa-solid fa-arrow-right text-[var(--accent-primary)]"></i>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                        <div className="flex gap-4">
                            <span><kbd className="px-1 bg-[var(--bg-primary)] rounded">↑↓</kbd> Navigate</span>
                            <span><kbd className="px-1 bg-[var(--bg-primary)] rounded">↵</kbd> Select</span>
                        </div>
                        <span>{filteredLessons.length} results</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SearchModal;
