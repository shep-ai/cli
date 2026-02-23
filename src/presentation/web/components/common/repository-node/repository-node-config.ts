import type { Node } from '@xyflow/react';

export interface RepositoryNodeData {
  [key: string]: unknown;
  /** Repository domain entity ID (UUID), used for delete operations */
  id?: string;
  /** Repository name, e.g. "shep-ai/cli" */
  name: string;
  /** Absolute path to the repository root, used for IDE/shell actions */
  repositoryPath?: string;
  onClick?: () => void;
  onAdd?: () => void;
  onDelete?: (repositoryId: string) => void;
  showHandles?: boolean;
}

export type RepositoryNodeType = Node<RepositoryNodeData, 'repositoryNode'>;
