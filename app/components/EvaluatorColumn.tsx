'use client';

import React from 'react';
import { useAtom } from 'jotai';
import { modelsStateAtom, getModelState, EVALUATOR_AGENT_ID } from '@/app/lib/atoms';

interface EvaluationData {
  summary: string;
  verdict: {
    winner: string;
    modelId: string;
  };
  reasoning: string;
  scorecard: Array<{
    modelId: string;
    modelName: string;
    relevance: number;
    clarity: number;
    depth: number;
    speed: number;
    overall: number;
  }>;
  speedAnalysis: {
    fastest: {
      modelName: string;
      modelId: string;
      timeToFirstToken: number;
      totalResponseTime: number;
    };
    slowest: {
      modelName: string;
      modelId: string;
      timeToFirstToken: number;
      totalResponseTime: number;
    };
    averageFirstTokenTime: number;
    averageTotalTime: number;
  };
  timestamp: number;
}

export default function EvaluatorColumn() {
  const [modelsState] = useAtom(modelsStateAtom);
  const evaluatorState = getModelState(EVALUATOR_AGENT_ID, modelsState);

  // Parse evaluation data from the latest assistant message
  const getEvaluationData = (): EvaluationData | null => {
    const lastMessage = evaluatorState.history
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastMessage?.content) return null;

    try {
      return JSON.parse(lastMessage.content) as EvaluationData;
    } catch (error) {
      console.error('Failed to parse evaluation data:', error);
      return null;
    }
  };

  const evaluationData = getEvaluationData();

  // Loading state - Pro Light with distinctive color
  if (evaluatorState.isLoading) {
    return (
      <div className="h-full flex flex-col p-6" style={{ 
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.06) 0%, rgba(13, 148, 136, 0.04) 100%)',
        borderLeft: '4px solid #14b8a6',
        borderRadius: '12px',
        boxShadow: '0 4px 20px -2px rgba(20, 184, 166, 0.12), 0 2px 8px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold pro-text-primary flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
            AI Analysis
          </h3>
          <span className="text-xs pro-text-muted pro-surface px-3 py-1.5 rounded-full border pro-border font-medium">
            🧠 Evaluating...
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-white/40 rounded-lg w-3/4 mb-2"></div>
            <div className="h-4 bg-white/40 rounded w-1/2"></div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-6 bg-white/40 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-white/40 rounded w-full mb-1"></div>
            <div className="h-4 bg-white/40 rounded w-5/6"></div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-4 bg-white/40 rounded w-1/4 mb-2"></div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-3 bg-white/40 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state - Pro Light
  if (evaluatorState.error) {
    return (
      <div className="h-full flex flex-col p-6" style={{ 
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.06) 100%)',
        borderLeft: '4px solid #ef4444',
        borderRadius: '12px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold pro-text-primary flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            AI Analysis
          </h3>
          <span className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 font-medium">
            ⚠️ Error
          </span>
        </div>
        
        <div className="text-red-600 text-sm">
          <p className="mb-3 font-medium">Failed to analyze responses:</p>
          <p className="text-red-700 bg-red-50 p-4 rounded-xl text-xs font-mono border border-red-200">
            {evaluatorState.error}
          </p>
        </div>
      </div>
    );
  }

  // No data state - Pro Light with distinctive color
  if (!evaluationData) {
    const isWaitingForCompletion = evaluatorState.history.length === 0 && !evaluatorState.error && !evaluatorState.isLoading;
    
    return (
      <div className="h-full flex flex-col p-6" style={{ 
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.04) 0%, rgba(13, 148, 136, 0.02) 100%)',
        borderLeft: '4px solid #9ca3af',
        borderRadius: '12px',
        boxShadow: '0 4px 20px -2px rgba(20, 184, 166, 0.08), 0 2px 8px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold pro-text-primary flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            AI Analysis
          </h3>
          <span className="text-xs pro-text-muted pro-surface px-3 py-1.5 rounded-full border pro-border font-medium">
            {isWaitingForCompletion ? "⏳ Waiting" : "✨ Ready"}
          </span>
        </div>
        
        <div className="pro-text-muted text-sm text-center py-8">
          {isWaitingForCompletion ? (
            <div className="space-y-3">
              <div className="text-base font-medium">Analysis will appear after all models complete their responses.</div>
              <div className="text-xs text-gray-500 pro-surface px-4 py-2 rounded-lg border pro-border inline-block">
                Ensuring all streaming is finished before evaluation...
              </div>
            </div>
          ) : (
            <div className="pro-text-primary font-medium">Ready to analyze responses.</div>
          )}
        </div>
      </div>
    );
  }

  // Success state - display the evaluation - Pro Light with distinctive color
  return (
    <div className="h-full flex flex-col" style={{ 
      background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.06) 0%, rgba(13, 148, 136, 0.04) 100%)',
      borderLeft: '4px solid #14b8a6',
      borderRadius: '12px',
      boxShadow: '0 4px 20px -2px rgba(20, 184, 166, 0.12), 0 2px 8px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(20, 184, 166, 0.08)'
    }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b pro-border bg-white/30 backdrop-blur-sm">
        <h3 className="text-lg font-semibold pro-text-primary flex items-center gap-2">
          <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
          AI Analysis
        </h3>
        <span className="text-xs font-medium text-teal-700 bg-teal-100/80 px-3 py-1 rounded-full">
          Complete
        </span>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 bg-white/20 backdrop-blur-sm">
        <div className="space-y-6">
          {/* Summary */}
          <div>
            <h4 className="text-sm font-semibold pro-text-primary mb-2 text-teal-700">Summary</h4>
            <p className="pro-text-primary text-sm leading-relaxed">
              {evaluationData.summary}
            </p>
          </div>

          {/* Verdict */}
          <div>
            <h4 className="text-sm font-semibold pro-text-primary mb-2 text-green-700">Best Response</h4>
            <div className="bg-white/40 backdrop-blur-sm border border-green-300/50 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-semibold text-sm">
                  {evaluationData.verdict.winner}
                </span>
              </div>
              <p className="pro-text-muted text-sm leading-relaxed">
                {evaluationData.reasoning}
              </p>
            </div>
          </div>

          {/* Speed Analysis */}
          {evaluationData.speedAnalysis && (
            <div>
              <h4 className="text-sm font-semibold pro-text-primary mb-3 text-teal-700">Speed Analysis</h4>
              <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 space-y-3 border border-blue-200/50 shadow-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50/80 backdrop-blur-sm border border-green-300/50 rounded p-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-700 text-xs font-semibold">Fastest</span>
                    </div>
                    <div className="pro-text-primary text-sm font-semibold">
                      {evaluationData.speedAnalysis.fastest.modelName}
                    </div>
                    <div className="pro-text-muted text-xs">
                      {evaluationData.speedAnalysis.fastest.timeToFirstToken}ms first token
                    </div>
                    <div className="pro-text-muted text-xs">
                      {evaluationData.speedAnalysis.fastest.totalResponseTime}ms total
                    </div>
                  </div>
                  
                  <div className="bg-red-50/80 backdrop-blur-sm border border-red-300/50 rounded p-2 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-700 text-xs font-semibold">Slowest</span>
                    </div>
                    <div className="pro-text-primary text-sm font-semibold">
                      {evaluationData.speedAnalysis.slowest.modelName}
                    </div>
                    <div className="pro-text-muted text-xs">
                      {evaluationData.speedAnalysis.slowest.timeToFirstToken}ms first token
                    </div>
                    <div className="pro-text-muted text-xs">
                      {evaluationData.speedAnalysis.slowest.totalResponseTime}ms total
                    </div>
                  </div>
                </div>
                
                <div className="text-xs pro-text-muted border-t pro-border pt-2">
                  <div>Avg first token: {evaluationData.speedAnalysis.averageFirstTokenTime.toFixed(0)}ms</div>
                  <div>Avg total time: {evaluationData.speedAnalysis.averageTotalTime.toFixed(0)}ms</div>
                </div>
              </div>
            </div>
          )}

          {/* Scorecard */}
          <div>
            <h4 className="text-sm font-semibold pro-text-primary mb-3 text-teal-700">Detailed Scores</h4>
            <div className="space-y-3">
              {evaluationData.scorecard.map((score, index) => (
                <div key={score.modelId} className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-teal-200/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="pro-text-primary font-semibold text-sm">
                      {score.modelName}
                    </span>
                    <span className="pro-text-primary text-sm font-bold text-teal-700">
                      {score.overall.toFixed(1)}/10
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="pro-text-muted block">Relevance</span>
                      <span className="pro-text-primary font-mono font-semibold">
                        {score.relevance.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="pro-text-muted block">Clarity</span>
                      <span className="pro-text-primary font-mono font-semibold">
                        {score.clarity.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="pro-text-muted block">Depth</span>
                      <span className="pro-text-primary font-mono font-semibold">
                        {score.depth.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="pro-text-muted block">Speed</span>
                      <span className="pro-text-primary font-mono font-semibold">
                        {score.speed.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Visual score bar */}
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(score.overall / 10) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-800">
            Analysis completed at {new Date(evaluationData.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
