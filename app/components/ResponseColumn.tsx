'use client';

import { useState, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { openRouterModels, modelsStateAtom, getModelState, type ModelId, type Message } from '../lib/atoms';
import { useToast } from '../lib/toastContext';
import MarkdownRenderer from './MarkdownRenderer';

interface ResponseColumnProps {
  modelId: ModelId;
  currentPrompt?: string;
  totalModels?: number;
  onFocusModel?: (modelId: ModelId) => void;
}

export default function ResponseColumn({ modelId, currentPrompt, totalModels = 1, onFocusModel }: ResponseColumnProps) {
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [modelsState] = useAtom(modelsStateAtom);
  const model = openRouterModels.find(m => m.id === modelId);
  
  const modelState = getModelState(modelId, modelsState);
  const { history, isLoading: isLoadingState, error: errorMessage, progress, retryable } = modelState;

  const [copyError, setCopyError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showCopyAnimation, setShowCopyAnimation] = useState(false);

  const { showToast } = useToast();

  const handleCopy = async (textToCopy?: string, copyType: 'full' | 'selection' = 'full') => {
    // If no specific text provided, get the full conversation text for this model
    const text = textToCopy || history
      .filter(msg => msg.role === 'assistant' && msg.modelId === modelId)
      .map(msg => msg.content)
      .join('\n\n');
    
    if (!text.trim()) {
      const errorMsg = 'No content to copy';
      setCopyError(errorMsg);
      showToast(errorMsg, 'error', 2000);
      setTimeout(() => setCopyError(null), 2000);
      return;
    }

    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(text);
      
      // Success feedback with animation and toast
      setCopySuccess(true);
      setCopyError(null);
      setShowCopyAnimation(true);
      
      // Show success toast
      const copyMessage = copyType === 'selection' 
        ? `Selected text copied (${text.length} chars)` 
        : `Response copied from ${model?.name || modelId}`;
      showToast(copyMessage, 'success', 2000);
      
      // Analytics/logging for copy action
      console.log(`Copied ${copyType} text:`, { 
        modelId, 
        textLength: text.length, 
        copyType,
        timestamp: new Date().toISOString() 
      });
      
      setTimeout(() => {
        setCopySuccess(false);
        setShowCopyAnimation(false);
      }, 2500);
      
    } catch (err) {
      console.error('Clipboard API failed:', err);
      
      // Enhanced fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        textArea.setAttribute('readonly', '');
        textArea.setAttribute('aria-hidden', 'true');
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopySuccess(true);
          setCopyError(null);
          setShowCopyAnimation(true);
          
          // Show success toast for fallback method
          const copyMessage = copyType === 'selection' 
            ? `Selected text copied (${text.length} chars)` 
            : `Response copied from ${model?.name || modelId}`;
          showToast(copyMessage, 'success', 2000);
          
          setTimeout(() => {
            setCopySuccess(false);
            setShowCopyAnimation(false);
          }, 2500);
        } else {
          throw new Error('Copy command was not successful');
        }
      } catch (fallbackErr) {
        console.error('All copy methods failed:', fallbackErr);
        
        // Provide specific error messages
        let errorMsg = 'Failed to copy to clipboard';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            errorMsg = 'Clipboard access denied. Please allow clipboard permissions.';
          } else if (err.name === 'NotSupportedError') {
            errorMsg = 'Clipboard not supported in this browser.';
          }
        }
        
        setCopyError(errorMsg);
        showToast(errorMsg, 'error', 4000);
        setTimeout(() => setCopyError(null), 4000);
      }
    }
  };

  // Handle text selection for partial copying
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText('');
    }
  };

  // Copy selected text
  const handleCopySelection = () => {
    if (selectedText) {
      handleCopy(selectedText, 'selection');
    }
  };

  // Keyboard shortcut handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !selectedText) {
      e.preventDefault();
      handleCopy();
    }
    // Add keyboard navigation for copy buttons
    if (e.key === 'Tab' && e.shiftKey) {
      // Allow normal tab navigation
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      // Focus on copy button when Enter or Space is pressed on response text
      const copyButton = e.currentTarget.parentElement?.querySelector('[aria-label*="Copy response"]') as HTMLButtonElement;
      if (copyButton) {
        e.preventDefault();
        copyButton.focus();
      }
    }
  };

  // Additional copy actions
  const handleCopyAsMarkdown = () => {
    const conversationText = history
      .filter(msg => msg.role === 'assistant' && msg.modelId === modelId)
      .map(msg => msg.content)
      .join('\n\n');
    const markdownText = `## ${model?.name || modelId}\n\n${conversationText}`;
    handleCopy(markdownText, 'full');
  };

  const handleCopyWithMetadata = () => {
    const conversationText = history
      .filter(msg => msg.role === 'assistant' && msg.modelId === modelId)
      .map(msg => msg.content)
      .join('\n\n');
    const metadata = `Model: ${model?.name || modelId}\nTimestamp: ${new Date().toLocaleString()}\nLength: ${conversationText.length} characters\n\n---\n\n${conversationText}`;
    handleCopy(metadata, 'full');
  };

  const handleRetry = () => {
    const retryFunction = (window as { retryFailedModels?: (models: string[]) => void }).retryFailedModels;
    if (retryFunction) {
      retryFunction([modelId]);
    }
  };

  const getModelIcon = () => {
    // Return different icons based on model provider
    if (modelId.includes('google')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      );
    } else if (modelId.includes('openai')) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142-.0852 4.783-2.7582a.7712.7712 0 0 0 .7806 0l5.8428 3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    }
  };

  return (
    <div 
      className="pro-card hover:shadow-md transition-all duration-300 flex flex-col h-full overflow-hidden"
      role="region"
      aria-label={`Response from ${model?.name || modelId}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {/* Header - Clean and Professional */}
      <header className="p-4 border-b pro-border bg-white/50" style={{ flexShrink: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 px-6">
            <div className="pro-accent flex-shrink-0" aria-hidden="true">
              {getModelIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold pro-text-primary text-sm truncate" title={model?.fullName || model?.name || modelId}>
                  {model?.name || modelId}
                </h3>
                {model && (
                  <div 
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      model.status === 'available' ? 'bg-green-400' :
                      model.status === 'rate-limited' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} 
                    title={`Status: ${model.status}`}
                    aria-label={`Model status: ${model.status}`}
                    role="status"
                  />
                )}
              </div>
              {model && (
                <p className="text-xs pro-text-muted truncate font-medium" title={model.provider}>
                  {model.provider}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {isLoadingState && (
              <div 
                className="flex items-center gap-2 px-3 py-1.5 pro-surface rounded-lg border pro-border"
                role="status"
                aria-live="polite"
                aria-label={`${model?.name || modelId} is ${progress || 'thinking'}`}
              >
                <div className="w-2 h-2 pro-bg-accent rounded-full animate-pulse" aria-hidden="true"></div>
                <span className="text-xs pro-text-muted font-medium">
                  {progress || 'Thinking...'}
                </span>
              </div>
            )}
            
            {errorMessage && retryable && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg transition-all duration-200 font-medium"
                title="Retry this model"
                aria-label={`Retry request for ${model?.name || modelId}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}
            
            {/* Focus Mode Button - only show when more than 1 model */}
            {totalModels > 1 && onFocusModel && (
              <button
                onClick={() => onFocusModel(modelId)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs pro-bg-accent-light hover:pro-bg-accent hover:text-white pro-accent border border-blue-200 rounded-lg transition-all duration-200 font-medium"
                title="Focus on this model only"
                aria-label={`Focus on ${model?.name || modelId} only`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                Focus
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Chat Content Area - Modern and Clean */}
      <div className="flex-1 overflow-y-auto response-scroll-area bg-gradient-to-b from-white/20 to-transparent p-4">
        {/* Conversation History */}
        <div className="space-y-4">
          {history.map((message, index) => (
            <div key={message.id} className="w-full">
              {message.role === 'user' ? (
                /* User Message - Modern right-aligned bubble */
                <div className="flex justify-end mb-4">
                  <div className="max-w-[85%]">
                    <div className="chat-bubble-user">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold opacity-90">You</span>
                      </div>
                      <MarkdownRenderer 
                        content={message.content} 
                        className="text-sm" 
                      />
                    </div>
                  </div>
                </div>
              ) : message.modelId === modelId ? (
                /* AI Response - Modern left-aligned bubble */
                <div 
                  className="relative group"
                  onMouseEnter={() => setShowCopyButton(true)}
                  onMouseLeave={() => setShowCopyButton(false)}
                  onTouchStart={() => setShowCopyButton(true)}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 pro-bg-accent rounded-full flex items-center justify-center text-white shadow-sm">
                        {getModelIcon()}
                      </div>
                    </div>
                    <div className="flex-1 max-w-[85%]">
                      <div className="chat-bubble-assistant">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold pro-accent">
                            {model?.name || modelId}
                          </span>
                          <div 
                            className={`w-2 h-2 rounded-full ${
                              model?.status === 'available' ? 'bg-green-500' :
                              model?.status === 'rate-limited' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          />
                        </div>
                        <div 
                          className="whitespace-pre-wrap pro-text-primary leading-relaxed text-sm break-words select-text relative"
                          onMouseUp={handleTextSelection}
                          onKeyDown={handleKeyDown}
                          tabIndex={0}
                          role="article"
                          aria-label={`Response from ${model?.name || modelId}`}
                          aria-live="polite"
                          aria-atomic="false"
                        >
                          <MarkdownRenderer 
                            content={message.content} 
                            className="text-sm" 
                          />
                          
                          {/* Copy animation overlay */}
                          {showCopyAnimation && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium animate-bounce">
                                Copied!
                              </div>
                            </div>
                          )}
                        </div>
                      
                      {/* Copy controls for individual messages */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-600/30">
                        <div className="flex items-center gap-3">
                          {/* Selection info - only show when text is selected */}
                          {selectedText && (
                            <div className="text-xs text-blue-400 font-medium">
                              Text selected
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Copy error message */}
                          {copyError && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-red-400">{copyError}</span>
                            </div>
                          )}
                          
                          {/* Copy this message button */}
                          <button
                            onClick={() => handleCopy(message.content)}
                            className="px-3 py-1 text-xs bg-slate-600/80 hover:bg-slate-500/90 text-slate-100 rounded transition-all duration-200 font-medium"
                            title="Copy this message"
                            aria-label="Copy this message to clipboard"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  
                  {/* Desktop copy buttons for individual messages */}
                  <div className="hidden md:flex absolute top-3 right-3 gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="px-3 py-1 text-xs bg-slate-600/90 hover:bg-slate-500/90 text-slate-100 rounded-lg transition-all duration-200 font-medium shadow-lg"
                      title="Copy this message"
                      aria-label="Copy this message to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : null /* Don't show messages from other models */}
            </div>
          ))}
          
          {/* Error Display */}
          {errorMessage && (
            <div 
              className="flex items-start gap-3 mb-4"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-red-400 font-medium">
                    Error
                  </div>
                  {retryable && (
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors"
                      title="Retry this request"
                      aria-label={`Retry failed request for ${model?.name || modelId}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                  )}
                </div>
                <p className="text-sm text-red-300 leading-relaxed">{errorMessage}</p>
                {retryable && (
                  <p className="text-xs text-red-400/70 mt-2">
                    This error may be temporary. Try clicking retry.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingState && !errorMessage && (
            <div 
              className="flex items-start gap-3 mb-4"
              role="status"
              aria-live="polite"
              aria-label={`${model?.name || modelId} is generating response`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                  {getModelIcon()}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-2 font-medium">
                  {model?.name || modelId}
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="flex gap-1" aria-hidden="true">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">{progress || 'Thinking...'}</span>
                </div>
                {progress && progress !== 'Thinking...' && (
                  <div className="mt-2" role="progressbar" aria-label="Response generation progress">
                    <div className="w-full bg-slate-700 rounded-full h-1">
                      <div className="bg-indigo-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global Actions for All Responses */}
        {history.some(msg => msg.role === 'assistant' && msg.modelId === modelId) && (
          <div className="mt-6 pt-4 border-t border-slate-600/30">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-400">
                All responses from {model?.name || modelId}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Selection info - only show when text is selected */}
                {selectedText && (
                  <button
                    onClick={handleCopySelection}
                    className="px-3 py-2 text-sm bg-blue-600/80 hover:bg-blue-600/90 text-blue-100 rounded-lg transition-all duration-200 font-medium"
                    title="Copy selected text"
                    aria-label="Copy selected text to clipboard"
                  >
                    Copy Selection
                  </button>
                )}
                

                
                {/* Main copy all button */}
                <button
                  onClick={() => handleCopy()}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium text-sm shadow-lg ${
                    copySuccess 
                      ? 'bg-green-600/90 text-green-100 opacity-100 scale-105' 
                      : copyError
                      ? 'bg-red-600/90 text-red-100 opacity-100'
                      : 'bg-slate-600/90 hover:bg-slate-500/90 text-slate-100 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  title={copySuccess ? "Copied!" : copyError || "Copy all responses"}
                  aria-label={copySuccess ? "All responses copied to clipboard" : "Copy all responses to clipboard"}
                >
                  {copySuccess ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : copyError ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Error
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}