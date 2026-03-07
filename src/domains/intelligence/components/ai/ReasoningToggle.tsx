'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';

interface ReasoningToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
  modelName?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const ReasoningToggle: React.FC<ReasoningToggleProps> = ({
  enabled,
  onToggle,
  disabled,
  modelName,
  className = '',
  size = 'md',
}) => {
  return (
    <button
      onClick={() => !disabled && onToggle(!enabled)}
      disabled={disabled}
      title={
        disabled ? `${modelName || '该模型'} 不支持深度思考` : '开启深度思考获得更高质量的逻辑推理'
      }
      className={`group flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest transition-all ${
        enabled && !disabled
          ? 'bg-purple-600/10 text-purple-600 shadow-[0_0_15px_-5px_rgba(147,51,234,0.4)] ring-1 ring-purple-600/20'
          : 'bg-stone-100 text-stone-400 dark:bg-white/5'
      } ${disabled ? 'cursor-not-allowed opacity-30 grayscale' : 'hover:scale-105 active:scale-95'} ${className}`}
    >
      <BrainCircuit
        className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${enabled && !disabled ? 'animate-pulse' : ''}`}
      />
      <span className="uppercase">深度思考</span>
      <span className="ml-1 font-mono text-[9px]">{enabled && !disabled ? 'ON' : 'OFF'}</span>
    </button>
  );
};
