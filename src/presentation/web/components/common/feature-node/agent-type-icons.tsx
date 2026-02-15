import type { ComponentType, SVGProps } from 'react';

/** Agent type values mirroring the TypeSpec AgentType enum. */
export type AgentTypeValue = 'claude-code' | 'cursor' | 'gemini-cli' | 'aider' | 'continue';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

/** Claude Code — Anthropic logomark (simplified spark). */
export function ClaudeCodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M16.01 11.39l-4.36-7.2a1.67 1.67 0 0 0-2.88 0L3.2 14.47a1.67 1.67 0 0 0 1.44 2.5h3.13l3.41 5.64a.84.84 0 0 0 1.44 0l3.41-5.64h3.13a1.67 1.67 0 0 0 1.44-2.5l-4.59-7.08Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Cursor — code cursor icon. */
export function CursorIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5.5 3l13 9-5.5 1.5L10 19l-1-6.5L5.5 3Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Gemini CLI — twin stars. */
export function GeminiCliIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2C12 2 14.5 8 12 12C9.5 8 12 2 12 2Z" fill="currentColor" />
      <path d="M12 12C12 12 18 9.5 22 12C18 14.5 12 12 12 12Z" fill="currentColor" />
      <path d="M12 12C12 12 14.5 18 12 22C9.5 18 12 12 12 12Z" fill="currentColor" />
      <path d="M12 12C12 12 6 9.5 2 12C6 14.5 12 12 12 12Z" fill="currentColor" />
    </svg>
  );
}

/** Aider — terminal prompt icon. */
export function AiderIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 12l3-3m0 0l3 3m-3-3v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Continue — play/forward icon. */
export function ContinueIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 4l12 8-12 8V4Z" fill="currentColor" />
    </svg>
  );
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
  'claude-code': ClaudeCodeIcon,
  cursor: CursorIcon,
  'gemini-cli': GeminiCliIcon,
  aider: AiderIcon,
  continue: ContinueIcon,
};

/** Resolve an agent type string to its corresponding icon component. */
export function getAgentTypeIcon(agentType?: string): ComponentType<IconProps> {
  if (agentType && agentType in agentTypeIconMap) {
    return agentTypeIconMap[agentType as AgentTypeValue];
  }
  return DefaultAgentIcon;
}
