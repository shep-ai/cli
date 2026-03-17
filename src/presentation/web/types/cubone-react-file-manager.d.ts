declare module '@cubone/react-file-manager' {
  import type { ComponentType } from 'react';

  export interface FileManagerFile {
    name: string;
    isDirectory: boolean;
    path?: string;
    updatedAt?: string;
  }

  export interface FileManagerPermissions {
    upload?: boolean;
    delete?: boolean;
    create?: boolean;
    download?: boolean;
    copy?: boolean;
    move?: boolean;
    rename?: boolean;
  }

  export interface FileManagerProps {
    files: FileManagerFile[];
    isLoading?: boolean;
    height?: string;
    width?: string;
    layout?: 'grid' | 'list';
    enableFilePreview?: boolean;
    permissions?: FileManagerPermissions;
    onFileOpen?: (file: FileManagerFile) => void;
    onSelectionChange?: (files: FileManagerFile[]) => void;
  }

  export const FileManager: ComponentType<FileManagerProps>;
}
