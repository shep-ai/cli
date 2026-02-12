'use client';

import { useRef } from 'react';
import { Plus } from 'lucide-react';
import type { AddRepositoryNodeData } from './add-repository-node-config';

export function AddRepositoryNode({
  data,
}: {
  data: AddRepositoryNodeData;
  [key: string]: unknown;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      // webkitRelativePath gives the relative path including folder name
      const folderPath = files[0].webkitRelativePath.split('/')[0];
      data.onSelect?.(folderPath);
    }
    // Reset so the same folder can be re-selected
    e.target.value = '';
  }

  return (
    <div className="group">
      <button
        type="button"
        data-testid="add-repository-node-card"
        onClick={handleClick}
        className="nodrag border-muted-foreground/30 flex w-56 cursor-pointer items-center gap-3 rounded-full border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-500 hover:text-blue-500"
      >
        <Plus className="h-5 w-5 shrink-0" />
        <span data-testid="add-repository-node-label" className="text-sm font-medium">
          Add Repository
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        data-testid="add-repository-node-input"
        className="hidden"
        onChange={handleChange}
        /* @ts-expect-error -- webkitdirectory is non-standard but widely supported */
        webkitdirectory=""
      />
    </div>
  );
}
