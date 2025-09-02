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

  // Loading state
  if (evaluatorState.isLoading) {
    return (
      <div className="h-full bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            AI Analysis
          </h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
            Evaluating...
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-slate-700 rounded w-full mb-1"></div>
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          </div>
          
          <div className="animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/4 mb-2"></div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-3 bg-slate-700 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (evaluatorState.error) {
    return (
      <div className="h-full bg-slate-900 rounded-lg border border-red-500/30 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            AI Analysis
          </h3>
          <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            Error
          </span>
        </div>
        
        <div className="text-red-400 text-sm">
          <p className="mb-2">Failed to analyze responses:</p>
          <p className="text-red-300 bg-red-500/10 p-3 rounded text-xs font-mono">
            {evaluatorState.error}
          </p>
        </div>
      </div>
    );
  }

  // No data state
  if (!evaluationData) {
    const isWaitingForCompletion = evaluatorState.history.length === 0 && !evaluatorState.error && !evaluatorState.isLoading;
    
    return (
      <div className="h-full bg-slate-900 rounded-lg border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
            AI Analysis
          </h3>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
            {isWaitingForCompletion ? "Waiting" : "Ready"}
          </span>
        </div>
        
        <div className="text-slate-400 text-sm text-center py-8">
          {isWaitingForCompletion ? (
            <div className="space-y-2">
              <div>Analysis will appear after all models complete their responses.</div>
              <div className="text-xs text-slate-500">
                Ensuring all streaming is finished before evaluation...
              </div>
            </div>
          ) : (
            "Ready to analyze responses."
          )}
        </div>
      </div>
    );
  }

  // Success state - display the evaluation
  return (
    <div className="h-full bg-slate-900 rounded-lg border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          AI Analysis
        </h3>
        <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
          Complete
        </span>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto h-full">
        <div className="space-y-6">
          {/* Summary */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Summary</h4>
            <p className="text-slate-200 text-sm leading-relaxed">
              {evaluationData.summary}
            </p>
          </div>

          {/* Verdict */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Best Response</h4>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-purple-300 font-medium text-sm">
                  {evaluationData.verdict.winner}
                </span>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">
                {evaluationData.reasoning}
              </p>
            </div>
          </div>

          {/* Speed Analysis */}
          {evaluationData.speedAnalysis && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Speed Analysis</h4>
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-300 text-xs font-medium">Fastest</span>
                    </div>
                    <div className="text-slate-200 text-sm font-medium">
                      {evaluationData.speedAnalysis.fastest.modelName}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {evaluationData.speedAnalysis.fastest.timeToFirstToken}ms first token
                    </div>
                    <div className="text-slate-400 text-xs">
                      {evaluationData.speedAnalysis.fastest.totalResponseTime}ms total
                    </div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-300 text-xs font-medium">Slowest</span>
                    </div>
                    <div className="text-slate-200 text-sm font-medium">
                      {evaluationData.speedAnalysis.slowest.modelName}
                    </div>
                    <div className="text-slate-400 text-xs">
                      {evaluationData.speedAnalysis.slowest.timeToFirstToken}ms first token
                    </div>
                    <div className="text-slate-400 text-xs">
                      {evaluationData.speedAnalysis.slowest.totalResponseTime}ms total
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-slate-400 border-t border-slate-700 pt-2">
                  <div>Avg first token: {evaluationData.speedAnalysis.averageFirstTokenTime.toFixed(0)}ms</div>
                  <div>Avg total time: {evaluationData.speedAnalysis.averageTotalTime.toFixed(0)}ms</div>
                </div>
              </div>
            </div>
          )}

          {/* Scorecard */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-3">Detailed Scores</h4>
            <div className="space-y-3">
              {evaluationData.scorecard.map((score, index) => (
                <div key={score.modelId} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-200 font-medium text-sm">
                      {score.modelName}
                    </span>
                    <span className="text-slate-300 text-sm font-mono">
                      {score.overall.toFixed(1)}/10
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block">Relevance</span>
                      <span className="text-slate-200 font-mono">
                        {score.relevance.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Clarity</span>
                      <span className="text-slate-200 font-mono">
                        {score.clarity.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Depth</span>
                      <span className="text-slate-200 font-mono">
                        {score.depth.toFixed(1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Speed</span>
                      <span className="text-slate-200 font-mono">
                        {score.speed.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Visual score bar */}
                  <div className="mt-2">
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500"
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
