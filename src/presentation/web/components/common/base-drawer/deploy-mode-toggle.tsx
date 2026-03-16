'use client';

import { Zap, Bot } from 'lucide-react';
import type { AnalysisMode } from '@shepai/core/application/ports/output/services/dev-environment-analyzer.interface';
import { cn } from '@/lib/utils';

export interface DeployModeToggleProps {
  mode: AnalysisMode;
  autoDetectedMode?: AnalysisMode | null;
  onModeChange: (mode: AnalysisMode) => void;
}

export function DeployModeToggle({ mode, autoDetectedMode, onModeChange }: DeployModeToggleProps) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Analysis mode">
      <ModeButton
        label="Fast"
        icon={<Zap className="h-3 w-3" />}
        selected={mode === 'fast'}
        isAutoDetected={autoDetectedMode === 'fast'}
        onClick={() => onModeChange('fast')}
      />
      <ModeButton
        label="Agent"
        icon={<Bot className="h-3 w-3" />}
        selected={mode === 'agent'}
        isAutoDetected={autoDetectedMode === 'agent'}
        onClick={() => onModeChange('agent')}
      />
    </div>
  );
}

function ModeButton({
  label,
  icon,
  selected,
  isAutoDetected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  isAutoDetected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${label} mode${isAutoDetected ? ' (auto-detected)' : ''}`}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {icon}
      {label}
      {isAutoDetected ? <span className="text-[10px] opacity-70">(auto)</span> : null}
    </button>
  );
}
