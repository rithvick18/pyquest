
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import Editor, { OnMount } from '@monaco-editor/react';
import { LessonContent as LessonContentType, Theme, LessonStep, QuizOption } from '../types';

interface LessonContentProps {
  content: LessonContentType | null;
  loading: boolean;
  onComplete: () => void;
  isCompleted: boolean;
  currentTheme: Theme;
  onStepComplete?: (stepId: string, attempts: number, usedHint: boolean, usedSolution: boolean) => void;
}

type StepStatus = 'idle' | 'correct' | 'incorrect';

const LessonContent: React.FC<LessonContentProps> = ({
  content,
  loading,
  onComplete,
  isCompleted,
  currentTheme,
  onStepComplete
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState<StepStatus>('idle');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Code execution state
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const pyodideRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Enhanced state for robustness
  const [feedback, setFeedback] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(true);
  const [pyodideProgress, setPyodideProgress] = useState(0);
  const stepStartTime = useRef<number>(Date.now());

  const step = content?.steps[currentStepIndex];
  const progressPercent = content ? ((currentStepIndex) / content.steps.length) * 100 : 0;

  // Reset state when step changes
  useEffect(() => {
    setStatus('idle');
    setSelectedOption(null);
    setFeedback('');
    setConsoleOutput([]);
    setAttempts(0);
    setShowHint(false);
    setShowSolution(false);
    stepStartTime.current = Date.now();

    if (step?.type === 'code' && step.code) {
      setCode(step.code.initialCode);
    }
  }, [step, currentStepIndex]);

  // Confetti Effect
  useEffect(() => {
    if (showConfetti && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles: any[] = [];
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

      for (let i = 0; i < 200; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: Math.random() * 8 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 100
        });
      }

      const animate = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let active = false;
        particles.forEach(p => {
          if (p.life > 0) {
            active = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5;
            p.life--;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        if (active) requestAnimationFrame(animate);
        else setShowConfetti(false);
      };
      animate();
    }
  }, [showConfetti]);

  // Initialize Pyodide with progress tracking
  useEffect(() => {
    const initPyodide = async () => {
      if (!pyodideRef.current) {
        try {
          setPyodideLoading(true);
          setPyodideProgress(10);

          const progressInterval = setInterval(() => {
            setPyodideProgress(prev => Math.min(prev + Math.random() * 15, 90));
          }, 500);

          // @ts-ignore
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
          });

          clearInterval(progressInterval);
          setPyodideProgress(100);
          pyodideRef.current = py;
          setPyodideLoading(false);
        } catch (e) {
          console.error("Pyodide load failed", e);
          setPyodideLoading(false);
        }
      }
    };
    initPyodide();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to run code
      if (e.ctrlKey && e.key === 'Enter' && step?.type === 'code' && !isRunning) {
        e.preventDefault();
        handleRunCode();
      }

      // Escape to go back
      if (e.key === 'Escape') {
        e.preventDefault();
        onComplete();
      }

      // Enter to continue on theory or when correct
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
        if (step?.type === 'theory' || status === 'correct') {
          e.preventDefault();
          handleContinue();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, isRunning, status]);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleUndo = () => {
    editorRef.current?.trigger('source', 'undo', null);
    editorRef.current?.focus();
  };

  const handleRedo = () => {
    editorRef.current?.trigger('source', 'redo', null);
    editorRef.current?.focus();
  };

  const handleQuizCheck = useCallback(() => {
    if (!step || step.type !== 'quiz' || !selectedOption) return;

    setAttempts(prev => prev + 1);
    const selected = step.options?.find(o => o.id === selectedOption);

    if (selected?.isCorrect) {
      setStatus('correct');
      setFeedback(selected.explanation || "Correct! Well done.");
      onStepComplete?.(step.id, attempts + 1, showHint, false);
    } else {
      setStatus('incorrect');
      setFeedback(selected?.explanation || "Not quite right. Try again.");
    }
  }, [step, selectedOption, attempts, showHint, onStepComplete]);

  const handleRunCode = useCallback(async () => {
    if (!step || step.type !== 'code' || !pyodideRef.current) return;

    setIsRunning(true);
    setConsoleOutput([]);
    setStatus('idle');
    setAttempts(prev => prev + 1);

    try {
      const py = pyodideRef.current;
      let outputBuffer: string[] = [];

      py.setStdout({ batched: (text: string) => outputBuffer.push(text) });
      py.setStderr({ batched: (text: string) => outputBuffer.push(text) });

      await py.runPythonAsync(code);

      setConsoleOutput(outputBuffer);

      const combinedOutput = outputBuffer.join('\n');
      const expected = step.code?.expectedOutput || '';

      // Improved validation - case insensitive and trimmed
      const normalizedOutput = combinedOutput.toLowerCase().trim();
      const normalizedExpected = expected.toLowerCase().trim();

      if (normalizedOutput.includes(normalizedExpected)) {
        setStatus('correct');
        setFeedback("Great job! Your code works as expected.");
        onStepComplete?.(step.id, attempts + 1, showHint, showSolution);
      } else {
        setStatus('incorrect');
        setFeedback(`Expected output to contain: "${expected}"`);
      }

    } catch (err: any) {
      // Parse Python error for user-friendly message
      let errorMessage = err.message || "Unknown error";
      if (errorMessage.includes("Traceback")) {
        const lines = errorMessage.split("\n");
        errorMessage = lines[lines.length - 1] || lines[lines.length - 2] || errorMessage;
      }

      setConsoleOutput(prev => [...prev, `Error: ${errorMessage}`]);
      setStatus('incorrect');
      setFeedback("There's an error in your code. Check the console for details.");
    } finally {
      setIsRunning(false);
    }
  }, [step, code, attempts, showHint, showSolution, onStepComplete]);

  const handleShowSolution = useCallback(() => {
    if (step?.type === 'code' && step.code?.solution) {
      setShowSolution(true);
      setCode(step.code.solution);
    }
  }, [step]);

  const handleContinue = useCallback(() => {
    if (!content) return;

    if (currentStepIndex < content.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      setShowConfetti(true);
      setTimeout(() => {
        onComplete();
      }, 2500);
    }
  }, [content, currentStepIndex, onComplete]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-6 bg-[var(--bg-primary)]">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-[var(--bg-tertiary)] rounded-full"></div>
          <div className="w-24 h-24 border-8 border-[var(--accent-primary)] rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          <i className="fa-brands fa-python text-4xl text-[var(--text-secondary)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
        </div>
        <div className="text-center space-y-2">
          <p className="text-[var(--text-primary)] font-bold text-xl animate-pulse">Generating Curriculum...</p>
          <div className="flex items-center justify-center gap-2 text-[var(--accent-primary)] text-sm">
            <i className="fa-brands fa-google"></i>
            <span>Researching latest Python docs...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!content || !step) {
    return null;
  }

  const isFinalStep = currentStepIndex === content.steps.length - 1;
  const canShowSolution = step.type === 'code' && attempts >= 3 && !showSolution && step.code?.solution;

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] transition-colors duration-300 relative overflow-hidden">

      {/* Confetti Canvas */}
      {showConfetti && <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50" />}

      {/* Progress Header with Step Indicators */}
      <div className="px-8 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onComplete} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Exit (Esc)">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
          <div className="flex-1 mx-8">
            {/* Step dots */}
            <div className="flex justify-center gap-2 mb-2">
              {content.steps.map((s, idx) => (
                <div
                  key={s.id}
                  className={`w-2 h-2 rounded-full transition-all ${idx < currentStepIndex ? 'bg-[var(--accent-primary)]' :
                    idx === currentStepIndex ? 'bg-[var(--accent-primary)] scale-125 ring-2 ring-[var(--accent-primary)]/30' :
                      'bg-[var(--bg-tertiary)]'
                    }`}
                />
              ))}
            </div>
            <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden relative">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_var(--accent-primary)]"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute top-0 right-0 h-full w-full bg-gradient-to-l from-white/30 to-transparent"></div>
              </div>
            </div>
          </div>
          <div className="text-[var(--accent-primary)] font-black text-sm font-mono">
            {Math.round(progressPercent)}%
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="text-center">
          <span className="text-[10px] text-[var(--text-secondary)]">
            {step.type === 'code' && <><kbd className="px-1 bg-[var(--bg-tertiary)] rounded text-[8px]">Ctrl+Enter</kbd> to run • </>}
            <kbd className="px-1 bg-[var(--bg-tertiary)] rounded text-[8px]">Esc</kbd> to exit
          </span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center p-4 pb-20">
        <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-500">

          <h2 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-8 text-center tracking-tight">
            {step.title}
          </h2>

          {/* THEORY STEP */}
          {step.type === 'theory' && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8 rounded-3xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-primary)]"></div>
              <div className="prose prose-lg max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--accent-primary)] prose-code:bg-[var(--bg-tertiary)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono">
                <ReactMarkdown>{step.content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* QUIZ STEP */}
          {step.type === 'quiz' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-xl text-[var(--text-primary)] font-medium text-center mb-8 leading-relaxed">
                <ReactMarkdown>{step.content}</ReactMarkdown>
              </div>

              <div className="grid gap-4">
                {step.options?.map((option, idx) => (
                  <button
                    key={option.id}
                    onClick={() => status !== 'correct' && setSelectedOption(option.id)}
                    disabled={status === 'correct'}
                    className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center gap-4 group relative overflow-hidden ${selectedOption === option.id
                      ? status === 'correct' && option.isCorrect
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : status === 'incorrect'
                          ? 'bg-red-500/10 border-red-500 text-red-500'
                          : 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] hover:-translate-y-1 hover:shadow-lg'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border ${selectedOption === option.id ? 'border-current' : 'border-[var(--border-color)] bg-[var(--bg-tertiary)]'
                      }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-semibold text-lg flex-1">{option.text}</span>

                    {selectedOption === option.id && (
                      <span className="text-xl">
                        {status === 'correct' && option.isCorrect && <i className="fa-solid fa-circle-check"></i>}
                        {status === 'incorrect' && <i className="fa-solid fa-circle-xmark"></i>}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Attempts counter */}
              {attempts > 0 && status === 'incorrect' && (
                <div className="text-center mt-4 text-sm text-[var(--text-secondary)]">
                  Attempts: {attempts}
                </div>
              )}
            </div>
          )}

          {/* CODE CHALLENGE STEP */}
          {step.type === 'code' && (
            <div className="flex flex-col h-[600px] border border-[var(--border-color)] rounded-2xl overflow-hidden bg-[var(--code-bg)] shadow-2xl">
              {/* VS Code-like Header */}
              <div className="h-10 bg-[var(--bg-tertiary)] border-b border-[var(--border-color)] flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="ml-4 px-4 py-1 bg-[var(--bg-primary)] rounded-t-lg text-xs font-mono text-[var(--text-primary)] border-t border-l border-r border-[var(--border-color)] translate-y-1">
                    main.py
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleUndo} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors" title="Undo">
                    <i className="fa-solid fa-rotate-left"></i>
                  </button>
                  <button onClick={handleRedo} className="w-8 h-8 flex items-center justify-center rounded hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors" title="Redo">
                    <i className="fa-solid fa-rotate-right"></i>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--accent-primary)] font-bold">Goal:</span> <span className="text-[var(--text-primary)]"><ReactMarkdown>{step.content}</ReactMarkdown></span>
              </div>

              <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* Editor */}
                <div className="flex-1 relative border-r border-[var(--border-color)]">
                  {pyodideLoading && (
                    <div className="absolute inset-0 bg-[var(--bg-primary)]/90 flex flex-col items-center justify-center z-10">
                      <i className="fa-brands fa-python text-4xl text-[var(--accent-primary)] mb-3"></i>
                      <p className="text-sm text-[var(--text-secondary)] mb-2">Loading Python environment...</p>
                      <div className="w-48 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                          style={{ width: `${pyodideProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{Math.round(pyodideProgress)}%</p>
                    </div>
                  )}
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme={currentTheme.type === 'light' ? 'light' : 'vs-dark'}
                    value={code}
                    onMount={handleEditorDidMount}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 15,
                      fontFamily: "'Fira Code', monospace",
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16 },
                      renderLineHighlight: 'all',
                    }}
                  />
                </div>

                {/* Output/Console */}
                <div className="h-40 md:h-auto md:w-1/3 bg-[#0f111a] flex flex-col text-slate-300">
                  <div className="px-3 py-2 border-b border-slate-700 bg-slate-900 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Terminal</span>
                    <button
                      onClick={() => setConsoleOutput([])}
                      className="text-[10px] hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex-1 p-4 font-mono text-sm overflow-y-auto space-y-1">
                    {consoleOutput.length === 0 && (
                      <div className="text-slate-600 italic">Ready to execute...</div>
                    )}
                    {consoleOutput.map((line, i) => (
                      <div key={i} className={`break-all ${line.startsWith('Error') ? 'text-red-400' : ''}`}>{line}</div>
                    ))}
                  </div>

                  {/* Hint section */}
                  {step.code?.hint && (status === 'incorrect' || showHint) && (
                    <div className="p-3 bg-yellow-900/30 border-t border-yellow-700/50 text-yellow-500 text-xs">
                      <i className="fa-regular fa-lightbulb mr-2"></i>
                      {showHint ? step.code.hint : (
                        <button
                          onClick={() => setShowHint(true)}
                          className="underline hover:no-underline"
                        >
                          Show hint
                        </button>
                      )}
                    </div>
                  )}

                  {/* Show solution button after 3 attempts */}
                  {canShowSolution && (
                    <div className="p-3 bg-blue-900/30 border-t border-blue-700/50 text-blue-400 text-xs">
                      <button
                        onClick={handleShowSolution}
                        className="hover:text-blue-300 transition-colors"
                      >
                        <i className="fa-solid fa-eye mr-2"></i>
                        Show solution (reduces XP earned)
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Attempts counter for code */}
              {attempts > 0 && (
                <div className="px-4 py-2 bg-[var(--bg-tertiary)] border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Attempts: {attempts}</span>
                  {showSolution && <span className="text-yellow-500"><i className="fa-solid fa-eye mr-1"></i> Using solution</span>}
                </div>
              )}
            </div>
          )}

          {/* Grounding Sources */}
          {content.sources && content.sources.length > 0 && (
            <div className="mt-8 border-t border-[var(--border-color)] pt-4">
              <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                <i className="fa-solid fa-book-open"></i> Sources
              </h4>
              <div className="flex flex-wrap gap-2">
                {content.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)] px-3 py-1.5 rounded-full transition-colors truncate max-w-[200px]"
                  >
                    {src.title}
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className={`p-6 md:px-20 md:py-8 border-t transition-all duration-300 backdrop-blur-md absolute bottom-0 w-full z-40 ${status === 'correct'
        ? 'bg-emerald-500/10 border-emerald-500/50'
        : status === 'incorrect'
          ? 'bg-red-500/10 border-red-500/50'
          : 'bg-[var(--bg-secondary)]/90 border-[var(--border-color)]'
        }`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">

          {/* Feedback Text */}
          <div className="flex items-center gap-4">
            {status === 'correct' && (
              <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl animate-bounce shadow-lg shadow-emerald-500/30">
                <i className="fa-solid fa-check"></i>
              </div>
            )}
            {status === 'incorrect' && (
              <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center text-xl animate-shake shadow-lg shadow-red-500/30">
                <i className="fa-solid fa-xmark"></i>
              </div>
            )}
            <div className="flex flex-col">
              {status === 'correct' && <span className="text-emerald-500 font-bold text-lg">Excellent!</span>}
              {status === 'incorrect' && <span className="text-red-500 font-bold text-lg">Incorrect</span>}
              {feedback && <span className={`text-sm font-medium ${status === 'correct' ? 'text-emerald-600' : status === 'incorrect' ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>{feedback}</span>}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-4">
            {step.type === 'theory' && (
              <button
                onClick={handleContinue}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all"
              >
                {isFinalStep ? 'Complete' : 'Continue'}
                <span className="ml-2 text-xs opacity-70">Enter ↵</span>
              </button>
            )}

            {step.type === 'quiz' && (
              status === 'correct' ? (
                <button
                  onClick={handleContinue}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all"
                >
                  {isFinalStep ? 'Finish' : 'Continue'}
                </button>
              ) : (
                <button
                  onClick={handleQuizCheck}
                  disabled={!selectedOption}
                  className={`${!selectedOption
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-not-allowed'
                    : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[4px]'
                    } px-8 py-3 rounded-xl font-bold uppercase tracking-wider transition-all`}
                >
                  Check
                </button>
              )
            )}

            {step.type === 'code' && (
              status === 'correct' ? (
                <button
                  onClick={handleContinue}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all"
                >
                  {isFinalStep ? 'Finish' : 'Continue'}
                </button>
              ) : (
                <button
                  onClick={handleRunCode}
                  disabled={isRunning || pyodideLoading}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider shadow-[0_4px_0_rgb(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isRunning && <i className="fa-solid fa-circle-notch animate-spin"></i>}
                  {isRunning ? 'Running' : pyodideLoading ? 'Loading...' : 'Run Code'}
                  {!isRunning && !pyodideLoading && <span className="text-xs opacity-70">Ctrl+↵</span>}
                </button>
              )
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default LessonContent;
