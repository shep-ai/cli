export interface ReactFileManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string | null) => void;
  initialPath?: string;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: true;
  updatedAt: string;
}

export interface DirectoryListResponse {
  entries: DirectoryEntry[];
  currentPath: string;
}
