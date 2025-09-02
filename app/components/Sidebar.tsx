'use client';
import { openRouterModels, type ModelId } from '../lib/atoms';
import ModelTooltip from './ModelTooltip';

interface SidebarProps {
  selectedModels: ModelId[];
  onModelToggle: (modelId: ModelId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
}

export default function Sidebar({ selectedModels, onModelToggle, isCollapsed, onToggleCollapse, onNewChat }: SidebarProps) {
  const handleSelectAll = () => {
    const availableModels = openRouterModels
      .filter(model => model.status === 'available')
      .slice(0, 4) // Limit to 4 models
      .map(model => model.id as ModelId);
    
    availableModels.forEach(modelId => {
      if (!selectedModels.includes(modelId)) {
        onModelToggle(modelId);
      }
    });
  };

  const handleClearAll = () => {
    selectedModels.forEach(modelId => {
      onModelToggle(modelId);
    });
  };

  // Calculate available models count
  const availableModelsCount = openRouterModels.filter(model => model.status === 'available').length;
  
  // Check if we can select all or clear all
  const canSelectAll = availableModelsCount > 0 && selectedModels.length < 4;
  const canClearAll = selectedModels.length > 0;

  return (
    <nav 
      id="sidebar-navigation"
      className={`pro-surface border-r pro-border flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
      role="navigation"
      aria-label="Model selection and conversation history"
    >
      {/* Header */}
      <div className="p-4 border-b pro-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold pro-text-primary truncate">Fiesta AI</h2>
              <p className="text-sm pro-text-muted mt-1 truncate">
                Pro Platform
              </p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 touch-manipulation hover:scale-105 shadow-lg flex items-center justify-center"
            style={{ width: '30px', height: '30px', minWidth: '30px', minHeight: '30px' }}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            aria-controls="sidebar-content"
          >
            <svg
              style={{ width: '15px', height: '15px' }}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div id="sidebar-content" className="flex-1 overflow-y-auto" role="region" aria-labelledby="models-heading">
        <div className="p-4">
          {/* New Chat Button */}
          {!isCollapsed && (
            <div className="mb-6">
              <button
                onClick={onNewChat}
                className="pro-button w-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Start a new conversation"
                aria-label="Start a new conversation and clear all chat history"
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Chat
                </div>
              </button>
            </div>
          )}
          
          {/* Clear All Control */}
          {!isCollapsed && (
            <div className="mb-3" role="group" aria-label="Model selection controls">
              <button
                onClick={handleClearAll}
                disabled={!canClearAll}
                className={`w-full px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  canClearAll
                    ? 'pro-button-secondary'
                    : 'border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                title="Clear all selected models"
                aria-label={`Clear all selected models (${selectedModels.length} selected)`}
                aria-describedby="clear-all-help"
              >
                Clear All
              </button>
              <div id="clear-all-help" className="sr-only">Removes all currently selected models</div>
            </div>
          )}

          <fieldset className="space-y-1">
            <legend className="sr-only">Available AI Models for Selection</legend>
            {openRouterModels.map((model, index) => {
              const isSelected = selectedModels.includes(model.id as ModelId);
              const isDisabled = (!isSelected && selectedModels.length >= 4) || model.status !== 'available';
              
              const getStatusIndicator = () => {
                switch (model.status) {
                  case 'available':
                    return <div className="w-2 h-2 bg-green-400 rounded-full" title="Available" aria-label="Available" />;
                  case 'rate-limited':
                    return <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Rate Limited" aria-label="Rate Limited" />;
                  case 'unavailable':
                    return <div className="w-2 h-2 bg-red-400 rounded-full" title="Unavailable" aria-label="Unavailable" />;
                  default:
                    return null;
                }
              };

              const getDisabledReason = () => {
                if (model.status !== 'available') return `Model is ${model.status}`;
                if (!isSelected && selectedModels.length >= 4) return 'Maximum 4 models can be selected';
                return '';
              };
              
              const modelContent = (
                <div key={model.id} className="relative mb-2">
                  <label className={`flex items-center p-3 rounded-xl transition-all duration-200 group touch-manipulation border ${
                    isSelected && !isDisabled
                      ? 'pro-bg-accent-light border-blue-300 shadow-sm'
                      : isDisabled 
                        ? 'cursor-not-allowed opacity-50 border-gray-200' 
                        : 'cursor-pointer hover:pro-surface-elevated hover:shadow-sm border-gray-200 hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-500'
                  } ${isCollapsed ? 'justify-center' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => onModelToggle(model.id as ModelId)}
                      className={`rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                        isCollapsed ? 'w-4 h-4' : 'w-4 h-4'
                      }`}
                      aria-label={isDisabled 
                        ? `${model.name} - ${getDisabledReason()}`
                        : `${isSelected ? 'Deselect' : 'Select'} ${model.name} model`
                      }
                      aria-describedby={`model-${index}-description`}
                      title={isCollapsed ? model.name : undefined}
                      tabIndex={0}
                    />
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${
                              isSelected && !isDisabled ? 'pro-accent' :
                              isDisabled ? 'text-gray-400' : 'pro-text-primary'
                            }`} title={model.fullName}>
                              {model.name}
                            </p>
                            {getStatusIndicator()}
                          </div>
                          <p className={`text-xs truncate mt-1 ${
                            isDisabled ? 'text-gray-400' : 'pro-text-muted'
                          }`}>
                            {model.provider}
                          </p>
                          <div id={`model-${index}-description`} className="sr-only">
                            {model.fullName} by {model.provider}. Status: {model.status}. 
                            {model.description}
                            {isDisabled && ` - ${getDisabledReason()}`}
                          </div>
                        </div>
                        {/* Info icon for tooltip */}
                        <div className="ml-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <svg 
                            className="w-4 h-4 pro-text-muted" 
                            fill="currentColor" 
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                          >
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {isCollapsed && (
                      <>
                        {isSelected && (
                          <div className="absolute -right-0.5 -top-0.5 w-3 h-3 pro-bg-accent rounded-full border-2 border-white shadow-sm"></div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5">
                          {getStatusIndicator()}
                        </div>
                      </>
                    )}
                  </label>
                </div>
              );

              // Wrap with tooltip only if not collapsed and not disabled
              if (!isCollapsed && !isDisabled) {
                return (
                  <ModelTooltip key={model.id} model={model} disabled={isDisabled}>
                    {modelContent}
                  </ModelTooltip>
                );
              }

              return modelContent;
            })}
          </fieldset>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700/30 mt-auto">
        {!isCollapsed && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Selected:</span>
              <span className="text-slate-300 font-medium">{selectedModels.length}/4</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Available:</span>
              <span className="text-green-400 font-medium">{availableModelsCount}</span>
            </div>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-700/50">
              <div>Powered by</div>
              <div>OpenRouter</div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onNewChat}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              title="Start a new conversation"
              aria-label="Start a new conversation and clear all chat history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <div className="text-xs text-slate-400 font-mono">{selectedModels.length}/4</div>
            <div className="text-xs text-slate-500">OR</div>
          </div>
        )}
      </div>
    </nav>
  );
}