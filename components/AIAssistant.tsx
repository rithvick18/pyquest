
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getChatResponse } from '../services/geminiService';
import { ChatMessage, Theme } from '../types';

interface AIAssistantProps {
  currentContext: {
    lessonTitle: string;
    lessonSummary: string;
  };
  currentTheme: Theme;
}

const SUGGESTED_PROMPTS = [
  "Explain this concept simply",
  "Show me an example",
  "What are common mistakes?",
  "How do I debug this?"
];

const AIAssistant: React.FC<AIAssistantProps> = ({ currentContext, currentTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Global keyboard shortcut (Ctrl+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Trap focus when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getChatResponse(textToSend, messages, currentContext);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an error connecting to my neurons." }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, currentContext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" role="region" aria-label="AI Assistant">
      {/* Chat Window */}
      {isOpen && (
        <div
          ref={panelRef}
          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-[350px] md:w-[400px] h-[550px] mb-4 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-assistant-title"
        >
          <div className="bg-[var(--bg-tertiary)] p-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-white text-xs shadow-md" aria-hidden="true">
                <i className="fa-solid fa-robot"></i>
              </div>
              <div>
                <h3 id="ai-assistant-title" className="text-sm font-bold text-[var(--text-primary)]">PyBot</h3>
                <p className="text-[10px] text-[var(--accent-primary)] font-medium">Context: {currentContext.lessonTitle || 'Exploring'}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
              aria-label="Close AI Assistant"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--bg-primary)]"
            role="log"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <div className="text-center mt-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[var(--text-primary)] text-sm font-medium">Hi! I'm your Python tutor.</p>
                  <p className="text-[var(--text-secondary)] text-xs">Ask me anything about {currentContext.lessonTitle || 'Python'}!</p>
                </div>

                {/* Suggested prompts */}
                <div className="mt-4">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(prompt)}
                        className="px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)] rounded-full transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                role="article"
                aria-label={msg.role === 'user' ? 'Your message' : 'Assistant response'}
              >
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user'
                    ? 'bg-[var(--accent-primary)] text-white rounded-tr-none'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-tl-none'
                  }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start" role="status" aria-label="Loading response">
                <div className="bg-[var(--bg-secondary)] p-3 rounded-2xl rounded-tl-none border border-[var(--border-color)]">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              aria-label="Chat message input"
              className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] transition-all placeholder:text-[var(--text-secondary)]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close AI Assistant' : 'Open AI Assistant (Ctrl+/)'}
        aria-expanded={isOpen}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 group border-2 ${isOpen
            ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] rotate-90'
            : 'bg-[var(--accent-primary)] text-white border-transparent'
          }`}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-robot'} text-xl group-hover:animate-pulse`} aria-hidden="true"></i>
      </button>

      {/* Keyboard shortcut hint */}
      {!isOpen && (
        <div className="absolute -top-8 right-0 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-secondary)]/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Ctrl+/
        </div>
      )}
    </div>
  );
};

export default AIAssistant;

