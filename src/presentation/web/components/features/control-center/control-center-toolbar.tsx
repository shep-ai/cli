'use client';

import { Panel } from '@xyflow/react';
import { Plus, ArrowDown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LayoutDirection } from '@/lib/layout-with-dagre';

export interface ControlCenterToolbarProps {
  onAddFeature?: () => void;
  onLayout?: (direction: LayoutDirection) => void;
}

export function ControlCenterToolbar({ onAddFeature, onLayout }: ControlCenterToolbarProps) {
  return (
    <Panel position="top-left">
      <div
        data-testid="control-center-toolbar"
        className="bg-background/80 flex items-center gap-1.5 rounded-lg border p-1.5 shadow-sm backdrop-blur-sm"
      >
        <Button variant="ghost" size="sm" data-testid="toolbar-add-feature" onClick={onAddFeature}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Feature
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="toolbar-layout-vertical"
          onClick={() => onLayout?.('TB')}
        >
          <ArrowDown className="mr-1.5 h-4 w-4" />
          Vertical
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="toolbar-layout-horizontal"
          onClick={() => onLayout?.('LR')}
        >
          <ArrowRight className="mr-1.5 h-4 w-4" />
          Horizontal
        </Button>
      </div>
    </Panel>
  );
}
