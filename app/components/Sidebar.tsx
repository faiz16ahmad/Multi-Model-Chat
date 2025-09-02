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
      className={`bg-slate-800 border-r border-slate-700 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-80'
      }`}
      role="navigation"
      aria-label="Model selection and conversation history"
    >
      {/* Header */}
      <div className="p-2 md:p-3 border-b border-slate-700/30">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium text-slate-300 truncate">Fiesta AI</h2>
              <p className="text-xs text-slate-500 mt-1 truncate">
                Multi-Model Chat
              </p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-lg transition-all duration-200 touch-manipulation ${
              isCollapsed 
                ? 'bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/50' 
                : 'hover:bg-slate-800/50 border border-transparent hover:border-slate-600/30'
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
            aria-controls="sidebar-content"
          >
            <svg
              className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Model Selection */}
      <div id="sidebar-content" className="flex-1 overflow-y-auto" role="region" aria-labelledby="models-heading">
        <div className="p-2 md:p-3">
          {/* New Chat Button */}
          {!isCollapsed && (
            <div className="mb-3">
              <button
                onClick={onNewChat}
                className="w-full px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
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
          
          {/* Select All / Clear All Controls */}
          {!isCollapsed && (
            <div className="mb-3 flex gap-2" role="group" aria-label="Model selection controls">
              <button
                onClick={handleSelectAll}
                disabled={!canSelectAll}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  canSelectAll
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500'
                    : 'border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                title="Select up to 4 available models"
                aria-label={`Select all available models (${availableModelsCount} available)`}
                aria-describedby="select-all-help"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                disabled={!canClearAll}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  canClearAll
                    ? 'border-slate-600 text-slate-300 hover:bg-slate-800/50 hover:border-slate-500'
                    : 'border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
                title="Clear all selected models"
                aria-label={`Clear all selected models (${selectedModels.length} selected)`}
                aria-describedby="clear-all-help"
              >
                Clear All
              </button>
              <div id="select-all-help" className="sr-only">Selects up to 4 available models for comparison</div>
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
                <div key={model.id} className="relative">
                  <label className={`flex items-center p-2 rounded-lg transition-colors group touch-manipulation ${
                    isDisabled 
                      ? 'cursor-not-allowed opacity-50' 
                      : 'cursor-pointer hover:bg-slate-800/50 active:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 focus-within:ring-offset-slate-900'
                  } ${isCollapsed ? 'justify-center' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isDisabled}
                      onChange={() => onModelToggle(model.id as ModelId)}
                      className={`rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                        isCollapsed ? 'w-4 h-4' : 'w-3 h-3'
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
                            <p className={`text-sm truncate ${
                              isDisabled ? 'text-slate-500' : 'text-slate-200'
                            }`} title={model.fullName}>
                              {model.name}
                            </p>
                            {getStatusIndicator()}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${
                            isDisabled ? 'text-slate-600' : 'text-slate-400'
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
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg 
                            className="w-3 h-3 text-slate-400" 
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
                          <div className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-slate-900"></div>
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
              Powered by OpenRouter
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