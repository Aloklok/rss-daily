'use client';

import React, { useState } from 'react';

export const MODELS = [
  {
    id: 'gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash-Lite (Sep)',
    desc: '2025.09 版，100 RPD 强力羊毛',
    hasSearch: true,
    quota: '15 RPM / 100 RPD',
  },
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini 1.5 Flash-Lite (Latest)',
    desc: '经典低负载，100 RPD 稳定羊毛',
    hasSearch: true,
    quota: '15 RPM / 100 RPD',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3.0 Flash (Preview)',
    desc: '最强下一代，目前独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-robotics-er-1.5-preview',
    name: 'Gemini 1.5 Robotics (Rare)',
    desc: '罕见 1.5 具身智能推理，独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    desc: '响应最快，额外独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.0-flash-lite-preview-02-05',
    name: 'Gemini 2.0 Flash-Lite (Old)',
    desc: '2.0 早期预览版，辅助独立池子',
    hasSearch: true,
    quota: '15 RPM / 独立 RPD',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    desc: '全能旗舰，共用每日 20 次',
    hasSearch: true,
    quota: '1500 RPM / 20 RPD',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    desc: '最强智力，极低 RPD 池',
    hasSearch: true,
    quota: '2 RPM / 50 RPD',
  },
];

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (id: string) => void;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelectModel,
  disabled,
  className = '',
  align = 'left',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const activeModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

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
              align === 'right' ? 'right-0' : 'left-[-110px]'
            }`}
          >
            <div className="space-y-1 p-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(m.id);
                    setIsMenuOpen(false);
                  }}
                  className={`flex w-full flex-col items-start rounded-xl px-4 py-3 text-left transition-all ${
                    selectedModel === m.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-bold">{m.name}</span>
                    <div className="flex items-center gap-1.5">
                      {m.hasSearch && (
                        <span className="rounded bg-black/10 px-1 py-0.5 text-[8px] font-black tracking-widest text-black/40 uppercase dark:bg-white/10 dark:text-white/40">
                          Search
                        </span>
                      )}
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-tight uppercase shadow-sm ${
                          selectedModel === m.id
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
                      selectedModel === m.id ? 'text-indigo-100' : 'text-stone-500'
                    }`}
                  >
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
