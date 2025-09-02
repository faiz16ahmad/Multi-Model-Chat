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
    <div className="border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm p-3 md:p-4 z-50 flex-shrink-0" role="region" aria-label="Message input">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative bg-slate-800 rounded-xl border border-slate-700 shadow-lg focus-within:border-indigo-500 transition-colors">
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
              className="w-full bg-transparent text-slate-200 placeholder-slate-500 resize-none outline-none p-3 md:p-4 pr-12 md:pr-16 min-h-[52px] md:min-h-[56px] max-h-[160px] md:max-h-[200px] text-sm md:text-base"
              style={{ color: 'rgb(226 232 240)' }}
              rows={1}
              disabled={isSubmitting || disabled}
              aria-describedby="prompt-help"
            />
            
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`absolute right-2 md:right-3 bottom-2 md:bottom-3 p-2 rounded-lg transition-all duration-200 touch-manipulation ${
                isSubmitDisabled
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 hover:shadow-lg transform hover:scale-105 active:scale-95'
              }`}
              title={isSubmitting ? "Sending message..." : "Send message"}
              aria-label={isSubmitting ? "Sending message to AI models" : "Send message to AI models"}
              aria-describedby="send-button-help"
            >
              {isSubmitting ? (
                <svg className="w-4 h-4 md:w-5 md:h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          <div id="prompt-help" className="mt-2 text-xs text-slate-500 text-center">
            <span className="hidden md:inline">Press Enter to send, Shift+Enter for new line</span>
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
