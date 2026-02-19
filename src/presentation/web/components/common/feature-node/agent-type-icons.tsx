import type { ComponentType, SVGProps } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/** Agent type values mirroring the TypeSpec AgentType enum. */
export type AgentTypeValue = 'claude-code' | 'cursor' | 'gemini-cli' | 'aider' | 'continue';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** Create a stable image-based icon component for a brand. */
function createBrandIcon(src: string, alt: string): ComponentType<IconProps> {
  function BrandIcon({ className }: IconProps) {
    return (
      <Image
        src={src}
        alt={alt}
        width={24}
        height={24}
        className={cn('rounded-sm object-contain', className)}
      />
    );
  }
  BrandIcon.displayName = `BrandIcon(${alt})`;
  return BrandIcon;
}

/** Fallback icon when agent type is unknown or undefined. */
export function DefaultAgentIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  );
}

const agentTypeIconMap: Record<AgentTypeValue, ComponentType<IconProps>> = {
  'claude-code': createBrandIcon('/icons/agents/claude-ai-icon.svg', 'Claude Code'),
  cursor: createBrandIcon('/icons/agents/cursor.jpeg', 'Cursor'),
  'gemini-cli': createBrandIcon('/icons/agents/gemini-cli.jpeg', 'Gemini CLI'),
  aider: createBrandIcon('/icons/agents/aider.png', 'Aider'),
  continue: createBrandIcon('/icons/agents/continue.jpeg', 'Continue'),
};

/** Resolve an agent type string to its corresponding icon component. */
export function getAgentTypeIcon(agentType?: string): ComponentType<IconProps> {
  if (agentType && agentType in agentTypeIconMap) {
    return agentTypeIconMap[agentType as AgentTypeValue];
  }
  return DefaultAgentIcon;
}
