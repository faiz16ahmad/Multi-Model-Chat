'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import ResponseColumn from './ResponseColumn';
import EvaluatorColumn from './EvaluatorColumn';
import { openRouterModels, modelsStateAtom, EVALUATOR_AGENT_ID, getModelState } from '../lib/atoms';

interface MultiResponseDisplayProps {
  selectedModels: string[];
  currentPrompt?: string;
  onFocusModel?: (modelId: string) => void;
}

export default function MultiResponseDisplay({ selectedModels, currentPrompt, onFocusModel }: MultiResponseDisplayProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [modelsState] = useAtom(modelsStateAtom);
  
  // Check if evaluator has results to display
  const evaluatorState = getModelState(EVALUATOR_AGENT_ID, modelsState);
  const hasEvaluatorData = evaluatorState.isLoading || evaluatorState.error || 
    (evaluatorState.history.length > 0 && evaluatorState.history.some(msg => msg.role === 'assistant'));
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    
    // Use passive listeners for better performance on mobile
    window.addEventListener('resize', checkMobile, { passive: true });
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset active tab when models change to prevent out-of-bounds access
  useEffect(() => {
    if (activeTab >= selectedModels.length) {
      setActiveTab(0);
    }
  }, [selectedModels.length, activeTab]);
  
  // If no models are selected, show welcome message
  if (selectedModels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <svg className="w-20 h-20 mx-auto text-slate-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h2 className="text-3xl font-bold text-slate-200 mb-4">
              Welcome to Multi-Model AI Chat
            </h2>
            <p className="text-slate-400 leading-relaxed text-lg">
              Select one or more AI models from the sidebar to start comparing their responses in real-time.
            </p>
          </div>
          
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-300 mb-4">Available Models:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-400">
              {openRouterModels.map((model) => (
                <div key={model.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors">
                  <div className={`w-3 h-3 rounded-full ${
                    model.status === 'available' ? 'bg-green-400' :
                    model.status === 'rate-limited' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-300">{model.name}</div>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        model.pricing === 'free' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'
                      }`}>
                        {model.pricing}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{model.provider} • {model.fullName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile view with tabs
  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10" role="tablist" aria-label="AI Model Responses">
          <div className="flex overflow-x-auto scrollbar-hide">
            {selectedModels.map((modelId, index) => {
              const model = openRouterModels.find(m => m.id === modelId);
              return (
                <button
                  key={modelId}
                  onClick={() => setActiveTab(index)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 touch-manipulation ${
                    activeTab === index
                      ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-700/70'
                      : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 active:bg-slate-600'
                  }`}
                  style={{ minWidth: '120px' }}
                  role="tab"
                  aria-selected={activeTab === index}
                  aria-controls={`tabpanel-${modelId}`}
                  id={`tab-${modelId}`}
                  tabIndex={activeTab === index ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft' && index > 0) {
                      setActiveTab(index - 1);
                    } else if (e.key === 'ArrowRight' && index < selectedModels.length - 1) {
                      setActiveTab(index + 1);
                    } else if (e.key === 'Home') {
                      setActiveTab(0);
                    } else if (e.key === 'End') {
                      setActiveTab(selectedModels.length - 1);
                    }
                  }}
                >
                  <div className="truncate">
                    {model?.name || modelId}
                  </div>
                </button>
              );
            })}
            
            {/* Add Analysis tab if evaluator has data */}
            {hasEvaluatorData && (
              <button
                onClick={() => setActiveTab(selectedModels.length)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 touch-manipulation ${
                  activeTab === selectedModels.length
                    ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-700/70'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 active:bg-slate-600'
                }`}
                style={{ minWidth: '120px' }}
                role="tab"
                aria-selected={activeTab === selectedModels.length}
                aria-controls="tabpanel-evaluator"
                id="tab-evaluator"
                tabIndex={activeTab === selectedModels.length ? 0 : -1}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  AI Analysis
                </div>
              </button>
            )}
          </div>
          
          {/* Tab indicator dots for better mobile UX */}
          {(selectedModels.length > 1 || hasEvaluatorData) && (
            <div className="flex justify-center py-2 gap-1" role="tablist" aria-label="Model navigation dots">
              {selectedModels.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    activeTab === index ? 'bg-indigo-400' : 'bg-slate-600'
                  }`}
                  aria-label={`Switch to model ${index + 1}`}
                  aria-pressed={activeTab === index}
                />
              ))}
              {hasEvaluatorData && (
                <button
                  onClick={() => setActiveTab(selectedModels.length)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    activeTab === selectedModels.length ? 'bg-purple-400' : 'bg-slate-600'
                  }`}
                  aria-label="Switch to AI Analysis"
                  aria-pressed={activeTab === selectedModels.length}
                />
              )}
            </div>
          )}
        </div>

        {/* Active Tab Content */}
        <div 
          className="p-4 flex-1 min-h-0"
          role="tabpanel"
          id={activeTab === selectedModels.length ? 'tabpanel-evaluator' : `tabpanel-${selectedModels[activeTab]}`}
          aria-labelledby={activeTab === selectedModels.length ? 'tab-evaluator' : `tab-${selectedModels[activeTab]}`}
        >
          {activeTab === selectedModels.length ? (
            <EvaluatorColumn />
          ) : selectedModels[activeTab] && (
            <ResponseColumn
              modelId={selectedModels[activeTab] as any}
              currentPrompt={currentPrompt}
              totalModels={selectedModels.length}
              onFocusModel={onFocusModel}
            />
          )}
        </div>
      </div>
    );
  }

  // Desktop view with grid - Dynamic layout including evaluator
  return (
    <div className="p-3 h-full overflow-hidden" role="region" aria-label="AI Model Responses Grid">
      <div 
        className={`grid gap-3 h-full ${
          !hasEvaluatorData ? (
            // Standard grid without evaluator
            selectedModels.length === 1 ? 'grid-cols-1 grid-rows-1 max-w-4xl mx-auto' :
            selectedModels.length === 2 ? 'grid-cols-2 grid-rows-1' :
            selectedModels.length === 3 ? 'grid-cols-3 grid-rows-1' :
            'grid-cols-2 grid-rows-2'
          ) : (
            // Dynamic grid with evaluator column
            selectedModels.length === 1 ? 'grid-cols-2 grid-rows-1' : // 1 model + evaluator = 2 columns
            selectedModels.length === 2 ? 'grid-cols-3 grid-rows-1' : // 2 models + evaluator = 3 columns  
            selectedModels.length === 3 ? 'grid-cols-2 grid-rows-2' : // 3 models + evaluator = 2x2 grid
            'grid-cols-3 grid-rows-2' // 4 models + evaluator = 3x2 grid
          )
        }`}
        role="grid"
        aria-label={`${selectedModels.length} AI model response${selectedModels.length !== 1 ? 's' : ''}${hasEvaluatorData ? ' with AI analysis' : ''}`}
      >
        {/* Model response columns */}
        {selectedModels.map((modelId, index) => (
          <div key={modelId} role="gridcell" aria-label={`Response from model ${index + 1}`} className="min-h-0">
            <ResponseColumn
              modelId={modelId as any}
              currentPrompt={currentPrompt}
              totalModels={selectedModels.length}
              onFocusModel={onFocusModel}
            />
          </div>
        ))}
        
        {/* Evaluator column */}
        {hasEvaluatorData && (
          <div role="gridcell" aria-label="AI Analysis" className="min-h-0">
            <EvaluatorColumn />
          </div>
        )}
      </div>
    </div>
  );
}
