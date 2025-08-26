'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { modelConfigs, type ModelId } from '@/lib/ai-providers';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedConfig = modelConfigs[selectedModel as ModelId];

  return (
    <div className="relative">
      <button
        aria-label="Model selector"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 h-9 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px]"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="font-medium truncate">
            {selectedConfig?.name || 'Select Model'}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                Available Models
              </div>
              
              {Object.entries(modelConfigs).map(([modelId, config]) => (
                <button
                  key={modelId}
                  onClick={() => {
                    onModelChange(modelId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedModel === modelId ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{config.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {config.provider}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {config.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>Max: {config.maxTokens.toLocaleString()} tokens</span>
                        <span>
                          ${config.costPer1kTokens.input}/${config.costPer1kTokens.output} per 1K tokens
                        </span>
                      </div>
                    </div>
                    {selectedModel === modelId && (
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="border-t border-gray-200 p-3 bg-gray-50 text-xs text-gray-600">
              <p>💡 <strong>Fast models</strong> for quick responses, <strong>Advanced models</strong> for complex tasks</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 