import type { Node } from '@xyflow/react';

export interface AddRepositoryNodeData {
  [key: string]: unknown;
  onSelect?: (path: string) => void;
}

export type AddRepositoryNodeType = Node<AddRepositoryNodeData, 'addRepositoryNode'>;
