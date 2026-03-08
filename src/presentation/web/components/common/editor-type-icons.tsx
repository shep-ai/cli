import type { ComponentType, SVGProps } from 'react';
import Image from 'next/image';
import { Code, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** Fallback icon for unknown editor types. */
function DefaultEditorIcon(props: IconProps) {
  return <Code className={cn('h-4 w-4', props.className)} {...(props as object)} />;
}

function VsCodeIcon({ className }: IconProps) {
  return (
    <Image
      src="/icons/editors/vscode.svg"
      alt="VS Code"
      width={24}
      height={24}
      className={cn('rounded-sm object-contain', className)}
    />
  );
}
VsCodeIcon.displayName = 'VsCodeIcon';

function CursorEditorIcon({ className }: IconProps) {
  return (
    <Image
      src="/icons/agents/cursor.jpeg"
      alt="Cursor"
      width={24}
      height={24}
      className={cn('rounded-sm object-contain', className)}
    />
  );
}
CursorEditorIcon.displayName = 'CursorEditorIcon';

function WindsurfIcon({ className }: IconProps) {
  return (
    <Image
      src="/icons/editors/windsurf.svg"
      alt="Windsurf"
      width={24}
      height={24}
      className={cn('rounded-sm object-contain', className)}
    />
  );
}
WindsurfIcon.displayName = 'WindsurfIcon';

function ZedIcon({ className }: IconProps) {
  return (
    <Image
      src="/icons/editors/zed.svg"
      alt="Zed"
      width={24}
      height={24}
      className={cn('rounded-sm object-contain', className)}
    />
  );
}
ZedIcon.displayName = 'ZedIcon';

function AntigravityIcon({ className, ...props }: IconProps) {
  return <Rocket className={cn('h-4 w-4', className)} {...(props as object)} />;
}
AntigravityIcon.displayName = 'AntigravityIcon';

const editorTypeIconMap: Record<string, ComponentType<IconProps>> = {
  vscode: VsCodeIcon,
  cursor: CursorEditorIcon,
  windsurf: WindsurfIcon,
  zed: ZedIcon,
  antigravity: AntigravityIcon,
};

/** Resolve an editor type string to its corresponding icon component. */
export function getEditorTypeIcon(editorType?: string): ComponentType<IconProps> {
  if (editorType && editorType in editorTypeIconMap) {
    return editorTypeIconMap[editorType];
  }
  return DefaultEditorIcon;
}
