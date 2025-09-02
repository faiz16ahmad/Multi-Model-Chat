'use client';

import { ModelId } from '../lib/atoms';
import ResponseColumn from './ResponseColumn';
import { useState } from 'react';

interface MainLayoutProps {
  selectedModels: ModelId[];
}

export default function MainLayout({ selectedModels }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState<ModelId | null>(
    selectedModels.length > 0 ? selectedModels[0] : null
  );

  if (selectedModels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-lg font-medium mb-2">No Models Selected</div>
          <div className="text-sm">Select one or more AI models to compare their responses.</div>
        </div>
      </div>
    );
  }

  // Mobile/Tablet view (single column with tabs)
  if (selectedModels.length === 1) {
    return (
      <div className="flex-1 h-full">
        <ResponseColumn modelId={selectedModels[0]} />
      </div>
    );
  }

  // Desktop view (multi-column grid)
  return (
    <div className="flex-1 h-full">
      {/* Mobile/Tablet Tabs */}
      <div className="lg:hidden mb-4">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
          {selectedModels.map((modelId) => (
            <button
              key={modelId}
              onClick={() => setActiveTab(modelId)}
              className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                activeTab === modelId
                  ? 'bg-gray-700 text-gray-200'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {modelId.split('-')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid h-full gap-4" style={{
        gridTemplateColumns: `repeat(${selectedModels.length}, 1fr)`
      }}>
        {selectedModels.map((modelId) => (
          <ResponseColumn key={modelId} modelId={modelId} />
        ))}
      </div>

      {/* Mobile/Tablet Single Column */}
      <div className="lg:hidden h-full">
        {activeTab && <ResponseColumn modelId={activeTab} />}
      </div>
    </div>
  );
}
