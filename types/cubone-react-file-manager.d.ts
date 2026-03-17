declare module '@cubone/react-file-manager' {
  import type { ComponentType } from 'react';

  export interface FileManagerFile {
    name: string;
    isDirectory: boolean;
    path?: string;
    updatedAt?: string;
    size?: number;
    [key: string]: unknown;
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
    files?: FileManagerFile[];
    isLoading?: boolean;
    height?: string | number;
    width?: string | number;
    layout?: 'grid' | 'list';
    enableFilePreview?: boolean;
    permissions?: FileManagerPermissions;
    onFileOpen?: (file: FileManagerFile) => void;
    onFolderChange?: (path: string) => void;
    onSelectionChange?: (files: FileManagerFile[]) => void;
    onDownload?: (files: FileManagerFile[]) => void;
    onError?: (error: Error) => void;
    onPaste?: (files: FileManagerFile[], destination: string) => void;
    onCut?: (files: FileManagerFile[]) => void;
    onCopy?: (files: FileManagerFile[]) => void;
    primaryColor?: string;
    fontFamily?: string;
    language?: string;
    collapsibleNav?: boolean;
    defaultNavExpanded?: boolean;
    className?: string;
    style?: React.CSSProperties;
    formatDate?: (date: string) => string;
    initialPath?: string;
    onSelect?: (file: FileManagerFile) => void;
  }

  export const FileManager: ComponentType<FileManagerProps>;
}

declare module '@cubone/react-file-manager/dist/style.css';
