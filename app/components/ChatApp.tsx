'use client';

import { useAtom } from 'jotai';
import { useState, useEffect, useRef } from 'react';
import { 
  openRouterModels, 
  modelsStateAtom, 
  type ModelId,
  type ExtendedModelId,
  type ModelState,
  type Message,
  addMessageToHistory,
  getConversationContext,
  EVALUATOR_AGENT_ID
} from '../lib/atoms';
import Sidebar from './Sidebar';
import MultiResponseDisplay from './MultiResponseDisplay';
import PromptInput from './PromptInput';
import { ToastProvider } from '../lib/toastContext';
import { ConnectionPool } from '../lib/connectionPool';
import { SSEEventData } from '../lib/sseManager';

export default function ChatApp() {
  const [selectedModels, setSelectedModels] = useState<ModelId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error' | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const connectionPoolRef = useRef<ConnectionPool | null>(null);
  const currentConnectionRef = useRef<string | null>(null);
  const [evaluationRequested, setEvaluationRequested] = useState<string | null>(null); // Track current prompt being evaluated
  const evaluationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For delayed evaluation
  const lastResponseTimestamp = useRef<Map<string, number>>(new Map()); // Track last response time per model

  // Auto-collapse sidebar on mobile for better UX
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use the single state atom
  const [modelsState, setModelsState] = useAtom(modelsStateAtom);

  // Initialize connection pool
  useEffect(() => {
    connectionPoolRef.current = new ConnectionPool(
      {
        maxConcurrentConnections: 2,
        connectionTimeout: 60000,
        retryOptions: {
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 60000,
          heartbeatInterval: 10000
        }
      },
      handleSSEEvent,
      handleConnectionStatusChange
    );

    // Setup periodic cleanup of stale connections
    const cleanupInterval = setInterval(() => {
      if (connectionPoolRef.current) {
        const cleaned = connectionPoolRef.current.cleanupStaleConnections();
        if (cleaned > 0) {
          console.log(`Cleaned up ${cleaned} stale connections`);
        }
      }
    }, 60000); // Every minute

    // Cleanup on unmount
    return () => {
      if (connectionPoolRef.current) {
        connectionPoolRef.current.closeAllConnections();
      }
      clearInterval(cleanupInterval);
      
      // Clear evaluation timeout
      if (evaluationTimeoutRef.current) {
        clearTimeout(evaluationTimeoutRef.current);
      }
    };
  }, []);

  // Auto-trigger evaluation when all selected models finish responding (with smart delay)
  useEffect(() => {
    if (!currentPrompt || evaluationRequested === currentPrompt || selectedModels.length === 0) {
      return;
    }

    // Clear any existing timeout
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }

    // Check if all selected models have finished loading
    const allModelsFinished = selectedModels.every(modelId => {
      const modelState = modelsState.get(modelId);
      return modelState && !modelState.isLoading;
    });

    // Check if at least one model has a response (to avoid evaluating errors only)
    const hasSuccessfulResponses = selectedModels.some(modelId => {
      const modelState = modelsState.get(modelId);
      return modelState && !modelState.error && modelState.history.length > 0 && 
             modelState.history.some(msg => msg.role === 'assistant');
    });

    // Count how many models have meaningful responses (not just started)
    const modelsWithCompleteResponses = selectedModels.filter(modelId => {
      const modelState = modelsState.get(modelId);
      if (!modelState || modelState.error || modelState.isLoading) return false;
      
      const assistantMessages = modelState.history.filter(msg => msg.role === 'assistant');
      const latestResponse = assistantMessages[assistantMessages.length - 1];
      
      // Consider a response complete if it has substantial content (more than just a few characters)
      return latestResponse && latestResponse.content.trim().length > 10;
    }).length;

    if (allModelsFinished && hasSuccessfulResponses && modelsWithCompleteResponses >= Math.min(2, selectedModels.length)) {
      // Add a smart delay before evaluation to ensure all streaming is truly complete
      const delayMs = selectedModels.length <= 2 ? 2000 : 3000; // Longer delay for more models
      
      console.log(`All models finished. Scheduling evaluation in ${delayMs}ms...`);
      
      evaluationTimeoutRef.current = setTimeout(() => {
        console.log('Triggering evaluation after delay...');
        setEvaluationRequested(currentPrompt);
        triggerEvaluation();
        evaluationTimeoutRef.current = null;
      }, delayMs);
    }
  }, [modelsState, selectedModels, currentPrompt, evaluationRequested]);

  // Function to trigger AI evaluation
  const triggerEvaluation = async () => {
    if (!currentPrompt || selectedModels.length === 0) return;

    // Set evaluator to loading state
    setModelsState(currentMap => {
      const newMap = new Map(currentMap);
      newMap.set(EVALUATOR_AGENT_ID, {
        history: [],
        isLoading: true,
        error: null,
        progress: 'Analyzing responses...',
        retryable: false
      });
      return newMap;
    });

    try {
      // Collect model responses for evaluation with timing data
      const modelResponses = selectedModels
        .map(modelId => {
          const modelState = modelsState.get(modelId);
          const model = openRouterModels.find(m => m.id === modelId);
          
          if (!modelState || !model) return null;
          
          // Get the latest assistant response
          const assistantMessages = modelState.history.filter(msg => msg.role === 'assistant');
          const latestResponse = assistantMessages[assistantMessages.length - 1];
          
          if (!latestResponse || modelState.error) return null;
          
          // Calculate timing metrics
          const timeToFirstToken = modelState.firstTokenTime && modelState.requestStartTime 
            ? modelState.firstTokenTime - modelState.requestStartTime 
            : null;
          const totalResponseTime = modelState.responseEndTime && modelState.requestStartTime 
            ? modelState.responseEndTime - modelState.requestStartTime 
            : null;
          const streamingDuration = modelState.lastTokenTime && modelState.firstTokenTime 
            ? modelState.lastTokenTime - modelState.firstTokenTime 
            : null;
          
          return {
            modelId: model.id,
            modelName: model.name,
            response: latestResponse.content,
            timing: {
              timeToFirstToken, // Latency (ms to first token)
              totalResponseTime, // Total time from request to completion
              streamingDuration, // How long the streaming took
              requestStartTime: modelState.requestStartTime,
              firstTokenTime: modelState.firstTokenTime,
              responseEndTime: modelState.responseEndTime
            }
          };
        })
        .filter(response => response !== null);

      if (modelResponses.length === 0) {
        throw new Error('No valid responses to evaluate');
      }

      // Call the evaluation API
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: currentPrompt,
          modelResponses
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const evaluationResult = await response.json();

      // Update evaluator state with the result
      setModelsState(currentMap => {
        const newMap = new Map(currentMap);
        const evaluationMessage: Message = {
          id: `eval-${Date.now()}`,
          role: 'assistant',
          content: JSON.stringify(evaluationResult),
          timestamp: Date.now(),
          modelId: EVALUATOR_AGENT_ID
        };

        newMap.set(EVALUATOR_AGENT_ID, {
          history: [evaluationMessage],
          isLoading: false,
          error: null,
          progress: null,
          retryable: false
        });
        return newMap;
      });

    } catch (error) {
      console.error('Evaluation failed:', error);
      
      // Set evaluator error state
      setModelsState(currentMap => {
        const newMap = new Map(currentMap);
        newMap.set(EVALUATOR_AGENT_ID, {
          history: [],
          isLoading: false,
          error: error instanceof Error ? error.message : 'Evaluation failed',
          progress: null,
          retryable: true
        });
        return newMap;
      });
    }
  };

  const handleModelToggle = (modelId: ModelId) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        // Deselecting a model - always allow
        return prev.filter(id => id !== modelId);
      } else {
        // Selecting a model - check if we're at the limit
        if (prev.length >= 4) {
          // Don't add more models if we already have 4
          return prev;
        }
        return [...prev, modelId];
      }
    });
  };

  // Handle SSE events from connection pool
  const handleSSEEvent = (event: SSEEventData & { connectionId?: string }) => {
    if (event.type === 'heartbeat') {
      // Update connection health status
      setConnectionStatus('connected');
      return;
    }

    const { modelId, type, data } = event;
    
    // Helper function to update model state
    const updateModelState = (modelId: ModelId, partialState: Partial<ModelState>) => {
      setModelsState(currentMap => {
        const newMap = new Map(currentMap);
        const currentState = newMap.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
        newMap.set(modelId, { ...currentState, ...partialState });
        return newMap;
      });
    };

    switch (type) {
      case 'chunk':
        if (data.token) {
          const currentTime = Date.now();
          // Update last response timestamp for this model
          lastResponseTimestamp.current.set(modelId, currentTime);
          
          setModelsState(currentMap => {
            const newMap = new Map(currentMap);
            const currentState = newMap.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
            const updatedHistory = [...currentState.history];
            
            // Find the last assistant message for this model, or create a new one
            const lastMessage = updatedHistory[updatedHistory.length - 1];
            const isFirstToken = !lastMessage || lastMessage.role !== 'assistant' || lastMessage.modelId !== modelId;
            
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.modelId === modelId) {
              // Append token to existing assistant message
              lastMessage.content += data.token;
            } else {
              // Create new assistant message
              const newMessage: Message = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: 'assistant',
                content: data.token,
                timestamp: Date.now(),
                modelId
              };
              updatedHistory.push(newMessage);
            }
            
            newMap.set(modelId, { 
              ...currentState, 
              history: updatedHistory,
              progress: null,
              // Update timing information
              firstTokenTime: isFirstToken ? currentTime : currentState.firstTokenTime,
              lastTokenTime: currentTime
            });
            return newMap;
          });
        }
        break;
      
      case 'progress':
        updateModelState(modelId, {
          progress: data.message || 'Processing...'
        });
        break;
      
      case 'error':
        updateModelState(modelId, {
          error: data.message || 'An error occurred',
          isLoading: false,
          progress: null,
          retryable: data.retryable || false
        });
        break;
      
      case 'end':
        updateModelState(modelId, { 
          isLoading: false,
          progress: null,
          responseEndTime: Date.now()
        });
        

        break;
    }
  };



  // Handle connection status changes
  const handleConnectionStatusChange = (connectionId: string, status: string) => {
    console.log(`Connection ${connectionId} status: ${status}`);
    
    switch (status) {
      case 'connecting':
        setConnectionStatus('connecting');
        setGlobalError(null);
        break;
      case 'connected':
        setConnectionStatus('connected');
        setGlobalError(null);
        break;
      case 'error':
        setConnectionStatus('error');
        break;
      case 'disconnected':
        setConnectionStatus(null);
        setIsSubmitting(false);
        break;
    }
  };

  const handleNewChat = () => {
    // Close existing connections
    if (connectionPoolRef.current && currentConnectionRef.current) {
      connectionPoolRef.current.closeConnection(currentConnectionRef.current);
      currentConnectionRef.current = null;
    }

    // Clear all responses and reset state
    const initialMap = new Map();
    openRouterModels.forEach(model => {
      initialMap.set(model.id, { history: [], isLoading: false, error: null, progress: null, retryable: false });
    });
    setModelsState(initialMap);
    setCurrentPrompt('');
    setIsSubmitting(false);
    setConnectionStatus(null);
    setGlobalError(null);
    setEvaluationRequested(null); // Reset evaluation tracking
    lastResponseTimestamp.current.clear(); // Clear response timestamps
    
    // Clear any pending evaluation
    if (evaluationTimeoutRef.current) {
      clearTimeout(evaluationTimeoutRef.current);
      evaluationTimeoutRef.current = null;
    }
  };

  const handleSubmit = async (prompt: string) => {
    if (selectedModels.length === 0 || !connectionPoolRef.current) return;

    setIsSubmitting(true);
    setCurrentPrompt(prompt);

    // Close existing connection if any
    if (currentConnectionRef.current) {
      await connectionPoolRef.current.closeConnection(currentConnectionRef.current);
    }

    // Add user message to all selected models' history and set loading state
    const requestStartTime = Date.now();
    setModelsState(currentMap => {
      const newMap = new Map(currentMap);
      
      selectedModels.forEach(modelId => {
        const currentState = newMap.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
        const updatedHistory = addMessageToHistory(currentState.history, prompt, 'user');
        
        newMap.set(modelId, { 
          ...currentState,
          history: updatedHistory,
          isLoading: true, 
          error: null, 
          progress: 'Initializing...', 
          retryable: false,
          // Initialize timing
          requestStartTime,
          firstTokenTime: undefined,
          lastTokenTime: undefined,
          responseEndTime: undefined
        });
      });
      
      return newMap;
    });

    // Retry function for failed requests using connection pool
    const retryRequest = async (failedModels: ModelId[]) => {
      if (failedModels.length === 0 || !connectionPoolRef.current) return;
      
      // Reset failed models to loading state
      failedModels.forEach(modelId => {
        setModelsState(currentMap => {
          const newMap = new Map(currentMap);
          const currentState = newMap.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
          newMap.set(modelId, { 
            ...currentState, 
            isLoading: true,
            error: null,
            progress: 'Retrying...'
          });
          return newMap;
        });
      });

      // Get current state and conversation context for retry
      setModelsState(currentMap => {
        const firstFailedModelState = currentMap.get(failedModels[0]);
        const conversationHistory = firstFailedModelState?.history || [];
        const conversationContext = getConversationContext(conversationHistory.filter(msg => msg.role === 'user'));
        
        // Create new connection for retry (async)
        connectionPoolRef.current?.createConnection(conversationContext, failedModels)
          .then(connectionId => {
            currentConnectionRef.current = connectionId;
          })
          .catch(error => {
            console.error('Retry failed:', error);
            setIsSubmitting(false);
            setGlobalError(error instanceof Error ? error.message : 'Retry failed');
          });
        
        return currentMap; // Return unchanged state for this update
      });
    };

    // Get conversation context for API call (from current state)
    setModelsState(currentMap => {
      const firstSelectedModelState = currentMap.get(selectedModels[0]);
      const currentHistory = firstSelectedModelState?.history || [];
      const conversationContext = getConversationContext(currentHistory);
      
      // Create new connection using connection pool with conversation context (async)
      connectionPoolRef.current?.createConnection(conversationContext, selectedModels)
        .then(connectionId => {
          currentConnectionRef.current = connectionId;
          console.log(`Created connection ${connectionId} for models:`, selectedModels);
        })
        .catch(error => {
          console.error('Failed to create connection:', error);
          setIsSubmitting(false);
          setConnectionStatus('error');
          
          let errorMessage = 'Failed to connect to server';
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          setGlobalError(errorMessage);
          
          // Set error for all requested models
          selectedModels.forEach(modelId => {
            setModelsState(currentMap => {
              const newMap = new Map(currentMap);
              const currentState = newMap.get(modelId) || { history: [], isLoading: false, error: null, progress: null, retryable: false };
              newMap.set(modelId, { 
                ...currentState, 
                error: errorMessage,
                isLoading: false,
                progress: null,
                retryable: true
              });
              return newMap;
            });
          });
        });
      
      return currentMap; // Return unchanged state for this update
    });

    // Expose retry function globally for use by components
    (window as any).retryFailedModels = retryRequest;
  };

  return (
    <ToastProvider>
      <div className="h-screen bg-slate-900 flex overflow-hidden">
        <Sidebar
          selectedModels={selectedModels}
          onModelToggle={handleModelToggle}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onNewChat={handleNewChat}
        />
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Global Error Banner */}
          {globalError && (
            <div className="bg-red-600/20 border-b border-red-600/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-300">{globalError}</span>
              </div>
              <button
                onClick={() => setGlobalError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Header */}
          <header className="border-b border-slate-700/30 p-3 md:p-4 flex-shrink-0" role="banner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">

                
                <div>
                  <h1 className="text-base md:text-lg font-medium text-slate-200 truncate">
                    Multi-Model Chat
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                {/* Connection Status Indicator */}
                {connectionStatus && (
                  <div 
                    className="flex items-center gap-1"
                    role="status"
                    aria-live="polite"
                    aria-label={`Connection status: ${connectionStatus}`}
                  >
                    {connectionStatus === 'connecting' && (
                      <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" aria-hidden="true"></div>
                        <span className="text-xs text-yellow-400 hidden sm:inline">Connecting...</span>
                        <span className="sr-only">Connecting to AI models</span>
                      </>
                    )}
                    {connectionStatus === 'connected' && (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true"></div>
                        <span className="text-xs text-green-400 hidden sm:inline">Connected</span>
                        <span className="sr-only">Successfully connected to AI models</span>
                      </>
                    )}
                    {connectionStatus === 'error' && (
                      <>
                        <div className="w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></div>
                        <span className="text-xs text-red-400 hidden sm:inline">Connection Error</span>
                        <span className="sr-only">Connection error occurred</span>
                      </>
                    )}
                  </div>
                )}
                
                <div className="text-xs md:text-sm text-slate-400">
                  {selectedModels.length}/4 model{selectedModels.length !== 1 ? 's' : ''}
                  <span className="hidden sm:inline"> selected</span>
                </div>
              </div>
            </div>
          </header>

          {/* Response Area (scrollable) */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MultiResponseDisplay
              selectedModels={selectedModels}
              currentPrompt={currentPrompt}
              onFocusModel={(modelId) => setSelectedModels([modelId])}
            />
          </div>

          {/* Fixed Input Area */}
          <PromptInput
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={selectedModels.length === 0}
          />
        </div>
      </div>
      {/* Screen reader announcements for dynamic content */}
      <div 
        id="sr-announcements" 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      ></div>
    </ToastProvider>
  );
}
