import type { Node } from '@xyflow/react';

export interface RepositoryNodeData {
  [key: string]: unknown;
  /** Repository name, e.g. "shep-ai/cli" */
  name: string;
  onClick?: () => void;
  onAdd?: () => void;
  showHandles?: boolean;
}

export type RepositoryNodeType = Node<RepositoryNodeData, 'repositoryNode'>;
