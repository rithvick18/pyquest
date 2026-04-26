
import React, { useMemo, useEffect, useRef } from 'react';
import { CURRICULUM } from '../constants';
import { Lesson, Progress, Module } from '../types';

interface RoadmapProps {
  progress: Progress;
  onSelectLesson: (lesson: Lesson) => void;
}

const Roadmap: React.FC<RoadmapProps> = ({ progress, onSelectLesson }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Flatten curriculum for the map path
  const flattenedData = useMemo(() => {
    const flat: Array<{ type: 'module' | 'lesson'; data: any; index: number }> = [];
    let lessonGlobalIndex = 0;

    CURRICULUM.forEach((mod) => {
      // Add Module Marker
      flat.push({ type: 'module', data: mod, index: -1 });
      
      // Add Lessons
      mod.lessons.forEach(lesson => {
        flat.push({ type: 'lesson', data: lesson, index: lessonGlobalIndex });
        lessonGlobalIndex++;
      });
    });
    return flat;
  }, []);

  const allLessons = useMemo(() => CURRICULUM.flatMap(m => m.lessons), []);

  // Map Configuration
  const NODE_SPACING = 160; 
  const AMP_WIDTH = 120;
  const START_Y = 100;
  const CONTAINER_WIDTH = 600;
  const CENTER_X = CONTAINER_WIDTH / 2;

  // Auto-scroll to current lesson
  useEffect(() => {
    const lastCompleted = progress.completedLessonIds[progress.completedLessonIds.length - 1];
    const targetId = lastCompleted 
      ? allLessons.find((l, i) => allLessons[i-1]?.id === lastCompleted)?.id || lastCompleted
      : allLessons[0].id;

    const node = document.getElementById(`map-node-${targetId}`);
    if (node && scrollContainerRef.current) {
        setTimeout(() => {
             node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
  }, [progress.completedLessonIds, allLessons]);

  const getCoordinates = (index: number) => {
    const x = CENTER_X + Math.sin(index * 0.5) * AMP_WIDTH;
    const y = START_Y + (index * NODE_SPACING);
    return { x, y };
  };

  const generatePath = () => {
    let d = '';
    let lastX = CENTER_X;
    let lastY = START_Y;
    
    const lessonNodes = flattenedData.filter(item => item.type === 'lesson');

    lessonNodes.forEach((item, i) => {
      const { x, y } = getCoordinates(i);
      if (i === 0) {
        d += `M ${x} ${y}`;
      } else {
        const cp1x = lastX;
        const cp1y = lastY + (NODE_SPACING / 2);
        const cp2x = x;
        const cp2y = y - (NODE_SPACING / 2);
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }
      lastX = x;
      lastY = y;
    });

    return d;
  };

  const totalHeight = flattenedData.filter(i => i.type === 'lesson').length * NODE_SPACING + 300;

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto custom-scrollbar relative bg-[var(--bg-primary)] w-full roadmap-container"
    >
      <div className="max-w-[600px] mx-auto relative" style={{ height: `${totalHeight}px` }}>
        
        {/* Animated SVG Path Layer */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {/* Base path */}
          <path 
            d={generatePath()} 
            fill="none" 
            stroke="var(--bg-tertiary)" 
            strokeWidth="12" 
            strokeLinecap="round"
          />
          {/* Animated Flowing Line */}
          <path 
            d={generatePath()} 
            fill="none" 
            stroke="var(--accent-primary)" 
            strokeWidth="4" 
            strokeOpacity="0.4"
            strokeLinecap="round"
            strokeDasharray="10 10"
            className="animate-dash-flow"
          />
        </svg>

        <style>{`
          @keyframes dashFlow {
            from { stroke-dashoffset: 200; }
            to { stroke-dashoffset: 0; }
          }
          .animate-dash-flow {
            animation: dashFlow 3s linear infinite;
          }
        `}</style>

        {/* Nodes */}
        {(() => {
          let lessonCounter = 0;
          return flattenedData.map((item) => {
            if (item.type === 'module') {
              const mod = item.data as Module;
              const nextLessonY = START_Y + (lessonCounter * NODE_SPACING);
              const moduleY = lessonCounter === 0 ? 30 : nextLessonY - (NODE_SPACING * 0.6);
              
              return (
                <div 
                  key={`mod-${mod.id}`}
                  className="absolute left-0 w-full flex justify-center items-center px-4"
                  style={{ top: `${moduleY}px` }}
                >
                  <div className="bg-[var(--bg-secondary)]/90 backdrop-blur-md border border-[var(--border-color)] px-6 py-2 rounded-xl shadow-xl z-10 flex flex-col items-center gap-1 transform transition-transform hover:scale-105">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                       {mod.path}
                     </span>
                     <span className="text-sm font-black text-[var(--text-primary)]">
                       {mod.title}
                     </span>
                  </div>
                </div>
              );
            }

            const lesson = item.data as Lesson;
            const { x, y } = getCoordinates(lessonCounter);
            const isCompleted = progress.completedLessonIds.includes(lesson.id);
            
            // Logic for visual states
            const index = allLessons.findIndex(l => l.id === lesson.id);
            const prevLessonCompleted = index === 0 || progress.completedLessonIds.includes(allLessons[index - 1].id);
            const isUnlocked = prevLessonCompleted;
            const isNext = isUnlocked && !isCompleted;

            const isLeft = x < CENTER_X;
            
            const node = (
              <div 
                key={lesson.id}
                id={`map-node-${lesson.id}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${x}px`, top: `${y}px`, zIndex: 10 }}
              >
                <button
                  onClick={() => isUnlocked ? onSelectLesson(lesson) : null}
                  disabled={!isUnlocked}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                    isCompleted 
                      ? 'bg-[var(--accent-primary)] text-white scale-100 hover:scale-110 shadow-[0_0_20px_var(--accent-primary)]' 
                      : isNext
                        ? 'bg-[var(--bg-secondary)] border-4 border-[var(--accent-primary)] text-[var(--accent-primary)] scale-110 shadow-[0_0_15px_var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] text-[var(--text-secondary)] opacity-80 cursor-not-allowed grayscale'
                  }`}
                >
                  {isNext && (
                    <span className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)] animate-ping opacity-30"></span>
                  )}

                  {isCompleted ? (
                    <i className="fa-solid fa-check text-3xl"></i>
                  ) : !isUnlocked ? (
                    <i className="fa-solid fa-lock text-2xl"></i>
                  ) : (
                    <i className="fa-solid fa-play text-2xl ml-1"></i>
                  )}
                  
                  {/* Stars / Difficulty */}
                  {isUnlocked && (
                    <div className="absolute -bottom-6 flex gap-1 bg-[var(--bg-primary)]/80 px-2 py-0.5 rounded-full border border-[var(--border-color)]">
                        {[...Array(lesson.difficulty === 'Beginner' ? 1 : lesson.difficulty === 'Intermediate' ? 2 : 3)].map((_, i) => (
                            <i key={i} className={`fa-solid fa-star text-[8px] ${isCompleted || isNext ? 'text-yellow-400' : 'text-[var(--text-secondary)]'}`}></i>
                        ))}
                    </div>
                  )}
                </button>

                {/* Floating Label */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 w-48 transition-all duration-300 ${
                    isLeft 
                      ? 'right-full mr-6 text-right' 
                      : 'left-full ml-6 text-left'
                  }`}
                >
                  <div className={`text-sm font-bold leading-tight mb-1 transition-colors ${
                    isNext ? 'text-[var(--text-primary)] scale-105 origin-center' : 
                    isCompleted ? 'text-[var(--text-primary)]' : 
                    !isUnlocked ? 'text-[var(--text-secondary)] opacity-50' : 'text-[var(--text-primary)]'
                  }`}>
                    {lesson.title}
                  </div>
                  {isUnlocked && (
                    <div className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-color)] shadow-lg absolute w-full z-20">
                        {lesson.description}
                    </div>
                  )}
                </div>
              </div>
            );
            
            lessonCounter++;
            return node;
          });
        })()}

        {/* Start/End Markers */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-12 flex flex-col items-center animate-bounce">
            <i className="fa-solid fa-flag text-[var(--accent-primary)] text-2xl mb-2 drop-shadow-[0_0_10px_var(--accent-primary)]"></i>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Start</span>
        </div>

      </div>
    </div>
  );
};

export default Roadmap;
