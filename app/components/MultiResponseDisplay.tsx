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
    const checkMobile = () => setIsMobile(window.innerWidth < 900);
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
  
  // If no models are selected, show professional welcome screen
  if (selectedModels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 pro-surface">
        <div className="max-w-6xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold pro-text-primary mb-4">
              Fiesta AI Pro Platform
            </h1>
            <p className="text-xl pro-text-muted max-w-2xl mx-auto leading-relaxed">
              Compare responses from multiple AI models simultaneously. Make informed decisions with side-by-side analysis and AI-powered evaluation.
            </p>
          </div>

          {/* Feature Cards - Three Column Layout */}
          <div className="flex justify-between items-start mb-12" style={{ gap: '60px', marginLeft: '50px', marginRight: '50px' }}>
            <div className="pro-card p-8 py-12 text-center hover:shadow-lg transition-all duration-300 group flex flex-col justify-between flex-1" style={{ minHeight: '200px', height: '200px' }}>
              <div className="flex flex-col items-center flex-1 justify-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold pro-text-primary mb-3">Multi-Model Comparison</h3>
                <p className="pro-text-muted text-sm leading-relaxed">
                  Compare up to 4 AI models simultaneously to find the best response for your needs.
                </p>
              </div>
            </div>

            <div className="pro-card p-8 py-12 text-center hover:shadow-lg transition-all duration-300 group flex flex-col justify-between flex-1" style={{ minHeight: '200px', height: '200px' }}>
              <div className="flex flex-col items-center flex-1 justify-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold pro-text-primary mb-3">AI-Powered Analysis</h3>
                <p className="pro-text-muted text-sm leading-relaxed">
                  Get intelligent evaluation and scoring of model responses with detailed analytics.
                </p>
              </div>
            </div>

            <div className="pro-card p-8 py-12 text-center hover:shadow-lg transition-all duration-300 group flex flex-col justify-between flex-1" style={{ minHeight: '200px', height: '200px' }}>
              <div className="flex flex-col items-center flex-1 justify-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold pro-text-primary mb-3">Performance Insights</h3>
                <p className="pro-text-muted text-sm leading-relaxed">
                  Track response speed, quality scores, and model performance metrics in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Select AI Models to Get Started
            </div>
            <p className="pro-text-muted text-sm mt-3">
              Choose from our collection of leading AI models in the sidebar
            </p>
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
              modelId={selectedModels[activeTab] as string}
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
              modelId={modelId as string}
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
