'use client';

import { useState } from 'react';
import { openRouterModels, ModelId } from '../lib/atoms';

interface ChatInputProps {
  onSubmit: (prompt: string, selectedModels: ModelId[]) => void;
  isSubmitting: boolean;
}

export default function ChatInput({ onSubmit, isSubmitting }: ChatInputProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<ModelId[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && selectedModels.length > 0) {
      onSubmit(prompt.trim(), selectedModels);
    }
  };

  const handleModelToggle = (modelId: ModelId) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-3">
            Select AI Models to Compare
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {openRouterModels.map((model) => (
              <label
                key={model.id}
                className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleModelToggle(model.id)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200">
                    {model.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {model.id}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-200 mb-2">
            Your Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isSubmitting}
            placeholder="Enter your prompt here..."
            className="w-full h-32 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !prompt.trim() || selectedModels.length === 0}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        >
          {isSubmitting ? 'Generating Responses...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
