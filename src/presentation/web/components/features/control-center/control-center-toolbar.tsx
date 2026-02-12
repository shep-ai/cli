'use client';

import { Panel } from '@xyflow/react';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ControlCenterToolbarProps {
  onAddFeature?: () => void;
  onAutoLayout?: () => void;
}

export function ControlCenterToolbar({ onAddFeature, onAutoLayout }: ControlCenterToolbarProps) {
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
          disabled
          data-testid="toolbar-auto-layout"
          onClick={onAutoLayout}
        >
          <LayoutGrid className="mr-1.5 h-4 w-4" />
          Auto-Layout
        </Button>
      </div>
    </Panel>
  );
}
