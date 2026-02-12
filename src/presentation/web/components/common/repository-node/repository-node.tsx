'use client';

import { Handle, Position } from '@xyflow/react';
import { Github, Plus } from 'lucide-react';
import type { RepositoryNodeData } from './repository-node-config';

export function RepositoryNode({ data }: { data: RepositoryNodeData; [key: string]: unknown }) {
  return (
    <div className="group relative">
      {data.showHandles ? (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="opacity-0!"
        />
      ) : null}

      <button
        type="button"
        data-testid="repository-node-card"
        onClick={(e) => {
          e.stopPropagation();
          data.onClick?.();
        }}
        className="nodrag bg-card flex w-56 cursor-default items-center gap-3 rounded-full border px-4 py-3 shadow-sm"
      >
        <Github className="text-muted-foreground h-5 w-5 shrink-0" />
        <span data-testid="repository-node-name" className="min-w-0 truncate text-sm font-medium">
          {data.name}
        </span>

        {data.onAdd ? (
          <div
            aria-label="Add feature"
            data-testid="repository-node-add-button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAdd?.();
            }}
            className="ml-auto flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 hover:bg-blue-600"
          >
            <Plus className="h-3.5 w-3.5" />
          </div>
        ) : null}
      </button>

      {/* Source handle — invisible, for edge connections */}
      {data.onAdd || data.showHandles ? (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={!data.showHandles}
          className="opacity-0!"
        />
      ) : null}
    </div>
  );
}
