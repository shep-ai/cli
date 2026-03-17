'use server';

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { IS_WINDOWS } from '@shepai/core/infrastructure/platform';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { resolve } from '@/lib/server-container';
import type { ListToolsUseCase } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface AgentAuthStatus {
  agentType: string;
  /** Whether the CLI tool binary is installed */
  installed: boolean;
  /** Whether credentials / auth appear valid */
  authenticated: boolean;
  /** Human-readable label for the agent */
  label: string;
  /** CLI binary name (e.g. "claude", "gemini") */
  binaryName: string | null;
  /** Instructions to authenticate if not authenticated */
  authCommand: string | null;
}

const AGENT_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor Agent',
  'gemini-cli': 'Gemini CLI',
  aider: 'Aider',
  continue: 'Continue',
  dev: 'Demo',
};

const AGENT_TOOL_MAP: Record<string, string> = {
  'claude-code': 'claude-code',
  cursor: 'cursor-cli',
  'gemini-cli': 'gemini-cli',
};

const AGENT_BINARY_MAP: Record<string, string> = {
  'claude-code': 'claude',
  cursor: 'cursor-agent',
  'gemini-cli': 'gemini',
};

/**
 * Tier 1: Instant credential/env check (~5ms, no subprocess).
 * Returns true if credentials likely exist.
 */
function tier1AuthCheck(agentType: string): boolean {
  const home = homedir();

  switch (agentType) {
    case 'claude-code': {
      if (process.env['ANTHROPIC_API_KEY']) return true;
      if (process.env['CLAUDE_CODE_USE_BEDROCK']) return true;
      if (process.env['CLAUDE_CODE_USE_VERTEX']) return true;
      if (process.env['CLAUDE_CODE_OAUTH_TOKEN']) return true;
      const credPath = join(home, '.claude', '.credentials.json');
      return existsSync(credPath);
    }
    case 'cursor': {
      if (process.env['CURSOR_API_KEY']) return true;
      // Cursor Agent stores creds after `agent login` — check common locations
      const cursorDir = join(home, '.cursor');
      return existsSync(cursorDir);
    }
    case 'gemini-cli': {
      if (process.env['GEMINI_API_KEY']) return true;
      if (process.env['GOOGLE_API_KEY']) return true;
      if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) return true;
      const accountsPath = join(home, '.gemini', 'google_accounts.json');
      return existsSync(accountsPath);
    }
    default:
      // dev, aider, continue — assume no auth needed
      return true;
  }
}

/**
 * Tier 2: Subprocess verification (~200ms).
 * Only called if tier 1 passes, to confirm tokens aren't expired.
 */
function tier2AuthVerify(agentType: string, binaryName: string): Promise<boolean> {
  return new Promise((resolve) => {
    let cmd: string;
    let args: string[];

    switch (agentType) {
      case 'claude-code':
        cmd = binaryName;
        args = ['auth', 'status'];
        break;
      case 'cursor':
        cmd = binaryName;
        args = ['status'];
        break;
      default:
        // No tier 2 command available — trust tier 1
        resolve(true);
        return;
    }

    try {
      const opts = IS_WINDOWS ? { timeout: 5000, windowsHide: true } : { timeout: 5000 };
      execFile(cmd, args, opts, (error) => {
        resolve(!error);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Check agent tool installation + auth status.
 * Uses two-tier detection: instant file/env check, then optional subprocess verify.
 */
export async function checkAgentAuth(): Promise<AgentAuthStatus> {
  let agentType: string;
  try {
    agentType = getSettings().agent.type;
  } catch {
    return {
      agentType: 'unknown',
      installed: false,
      authenticated: false,
      label: 'Unknown',
      binaryName: null,
      authCommand: null,
    };
  }

  const label = AGENT_LABELS[agentType] ?? agentType;
  const toolId = AGENT_TOOL_MAP[agentType] ?? null;
  const binaryName = AGENT_BINARY_MAP[agentType] ?? null;

  // Dev/demo agents — always good
  if (!toolId) {
    return {
      agentType,
      installed: true,
      authenticated: true,
      label,
      binaryName: null,
      authCommand: null,
    };
  }

  // Check if tool is installed
  let installed = false;
  try {
    const useCase = resolve<ListToolsUseCase>('ListToolsUseCase');
    const tools = await useCase.execute();
    const tool = tools.find((t) => t.id === toolId);
    installed = tool?.status.status === 'available';
  } catch {
    installed = false;
  }

  if (!installed) {
    return {
      agentType,
      installed: false,
      authenticated: false,
      label,
      binaryName,
      authCommand: binaryName ? `Install ${label} first` : null,
    };
  }

  // Tier 1: instant file/env check
  const tier1 = tier1AuthCheck(agentType);

  if (!tier1) {
    return {
      agentType,
      installed: true,
      authenticated: false,
      label,
      binaryName,
      authCommand: binaryName,
    };
  }

  // Tier 2: subprocess verify (best effort, ~200ms)
  let authenticated = true;
  if (binaryName) {
    authenticated = await tier2AuthVerify(agentType, binaryName);
  }

  return {
    agentType,
    installed: true,
    authenticated,
    label,
    binaryName,
    authCommand: authenticated ? null : binaryName,
  };
}
