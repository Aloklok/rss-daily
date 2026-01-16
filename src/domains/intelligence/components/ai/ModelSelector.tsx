'use client';

import React, { useState } from 'react';

import { MODELS, DEFAULT_MODEL_ID } from '@/domains/intelligence/constants';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

type ModelSource = 'siliconflow' | 'cheng30' | 'alok';

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  disabled,
  className = '',
  align = 'left',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Parse incoming model to determine source
  // Format: "modelId" or "modelId@source"
  const [cleanId, alias] = (selectedModel || '').split('@');

  // Determine initial source state
  // If alias exists, use it. If not, check if it's a SiliconFlow model.
  const isSiliconFlowModel = MODELS.find((m) => m.id === cleanId)?.provider === 'siliconflow';
  const derivedSource: ModelSource =
    alias === 'alok'
      ? 'alok'
      : alias === 'cheng30'
        ? 'cheng30'
        : isSiliconFlowModel
          ? 'siliconflow'
          : 'siliconflow'; // Default to SiliconFlow as requested

  const [source, setSource] = useState<ModelSource>(derivedSource);

  // Sync state when menu opens (optional, but good for consistency if external prop changes)
  // Or just rely on derived state if we want strict control.
  // But user wants to switch tabs. So we need internal state for the "viewing" tab.
  // We initialize visual source from the current selection only when the menu is *not* open?
  // Actually simplest is to init state once or use effect.
  React.useEffect(() => {
    if (isMenuOpen) return; // Don't jump tabs while user is interacting
    setSource(derivedSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  // Default to DEFAULT_MODEL_ID if cleanId not found
  const activeModel =
    MODELS.find((m) => m.id === cleanId) ||
    MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ||
    MODELS[0];

  const filteredModels = MODELS.filter((m) => {
    if (source === 'siliconflow') return m.provider === 'siliconflow';
    return !m.provider || m.provider === 'google';
  });

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={disabled}
        className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-stone-500 uppercase transition-colors hover:text-indigo-600 disabled:opacity-50"
      >
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
        {activeModel.name}
        {alias ? <span className="hidden opacity-50 sm:inline">@{alias.toUpperCase()}</span> : null}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-3 w-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isMenuOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setIsMenuOpen(false)} />
          <div
            className={`scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-white/10 absolute bottom-full z-[50] mb-3 max-h-[400px] w-64 overflow-y-auto rounded-2xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-2xl dark:bg-stone-900/90 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {/* Source Tabs */}
            <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-black/5 bg-white/50 p-1 backdrop-blur-md dark:border-white/5 dark:bg-black/50">
              {(['siliconflow', 'cheng30', 'alok'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`rounded-lg py-1.5 text-[9px] font-black tracking-widest uppercase transition-all ${
                    source === s
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-stone-500 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  {s === 'siliconflow' ? '硅基流动' : s.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="space-y-1 p-2">
              {filteredModels.map((m) => {
                const isSelected =
                  cleanId === m.id &&
                  (source === 'siliconflow'
                    ? true // SF IDs are unique, no alias check needed implied
                    : alias === source); // For Google, check if alias matches current source tab (so we show selected correctly)

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      // Construct full ID based on source
                      let fullId = m.id;
                      if (source === 'cheng30') fullId += '@cheng30';
                      if (source === 'alok') fullId += '@alok';
                      // SiliconFlow doesn't need suffix

                      onSelectModel(fullId);
                      setIsMenuOpen(false);
                    }}
                    className={`flex w-full flex-col items-start rounded-xl px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="text-xs font-bold">{m.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-tight uppercase shadow-sm ${
                            isSelected
                              ? 'bg-white/30 text-white'
                              : 'bg-indigo-50 text-indigo-600 dark:bg-white/10 dark:text-indigo-400'
                          }`}
                        >
                          {m.quota}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`mt-1 text-[10px] ${
                        isSelected ? 'text-indigo-100' : 'text-stone-500'
                      }`}
                    >
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
