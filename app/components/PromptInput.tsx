'use client';

import { useState, useRef, useEffect } from 'react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export default function PromptInput({ onSubmit, isSubmitting, disabled = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isSubmitting && !disabled) {
      onSubmit(prompt.trim());
      setPrompt('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isSubmitDisabled = !prompt.trim() || isSubmitting || disabled;

  return (
    <div className="border-t pro-border bg-white/80 backdrop-blur-lg p-4 md:p-6 z-50 flex-shrink-0" role="region" aria-label="Message input">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative pro-card hover:shadow-lg transition-all duration-300 focus-within:shadow-lg focus-within:border-blue-300">
            <label htmlFor="prompt-input" className="sr-only">
              Enter your message to send to AI models
            </label>
            <textarea
              id="prompt-input"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything to multiple AI models..."
              className="w-full bg-transparent pro-text-primary placeholder:pro-text-muted resize-none outline-none p-4 md:p-5 pr-14 md:pr-16 min-h-[60px] md:min-h-[64px] max-h-[160px] md:max-h-[200px] text-sm md:text-base leading-relaxed"
              rows={1}
              disabled={isSubmitting || disabled}
              aria-describedby="prompt-help"
            />
            
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`absolute right-3 md:right-4 bottom-3 md:bottom-4 p-2.5 md:p-3 rounded-xl transition-all duration-300 touch-manipulation shadow-sm ${
                isSubmitDisabled
                  ? 'pro-text-muted cursor-not-allowed opacity-50'
                  : 'text-white pro-bg-accent hover:shadow-lg transform hover:scale-105 active:scale-95 hover:-translate-y-0.5'
              }`}
              title={isSubmitting ? "Sending message..." : "Send message"}
              aria-label={isSubmitting ? "Sending message to AI models" : "Send message to AI models"}
              aria-describedby="send-button-help"
            >
              {isSubmitting ? (
                <svg className="w-5 h-5 md:w-6 md:h-6 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          <div id="prompt-help" className="mt-3 text-xs pro-text-muted text-center flex items-center justify-center gap-4">
            <span className="hidden md:inline flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs pro-surface border pro-border rounded font-mono">Enter</kbd>
              to send
            </span>
            <span className="hidden md:inline flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-xs pro-surface border pro-border rounded font-mono">Shift+Enter</kbd>
              for new line
            </span>
            <span className="md:hidden">Tap send button or press Enter</span>
          </div>
          <div id="send-button-help" className="sr-only">
            {isSubmitDisabled 
              ? "Send button is disabled. Enter a message to enable sending."
              : "Click to send your message to the selected AI models"
            }
          </div>
        </form>
      </div>
    </div>
  );
}
