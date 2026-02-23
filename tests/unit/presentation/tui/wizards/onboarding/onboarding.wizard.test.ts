/**
 * Onboarding Wizard Orchestrator Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DI container
vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

// Mock settings service
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  resetSettings: vi.fn(),
  initializeSettings: vi.fn(),
}));

import { onboardingWizard } from '../../../../../../src/presentation/tui/wizards/onboarding/onboarding.wizard.js';
import { container } from '@/infrastructure/di/container.js';
import { resetSettings, initializeSettings } from '@/infrastructure/services/settings.service.js';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';
import type { AgentConfigResult } from '../../../../../../src/presentation/tui/wizards/agent-config.wizard.js';
import type { WorkflowDefaultsResult } from '../../../../../../src/presentation/tui/wizards/onboarding/types.js';

describe('onboardingWizard', () => {
  const mockAgentResult: AgentConfigResult = {
    type: AgentType.ClaudeCode,
    authMethod: AgentAuthMethod.Session,
  };

  const mockIdeResult = 'vscode';

  const mockWorkflowResult: WorkflowDefaultsResult = {
    allowPrd: false,
    allowPlan: false,
    allowMerge: false,
    pushOnImplementationComplete: false,
    openPrOnImplementationComplete: false,
    autoMergeOnImplementationComplete: false,
  };

  const mockUpdatedSettings = { onboardingComplete: true };

  let mockExecute: ReturnType<typeof vi.fn>;
  let mockAgentStep: () => Promise<AgentConfigResult>;
  let mockIdeStep: () => Promise<string>;
  let mockWorkflowStep: () => Promise<WorkflowDefaultsResult>;
  beforeEach(() => {
    vi.clearAllMocks();

    mockExecute = vi.fn().mockResolvedValue(mockUpdatedSettings);
    vi.mocked(container.resolve).mockReturnValue({ execute: mockExecute });

    mockAgentStep = vi.fn<() => Promise<AgentConfigResult>>().mockResolvedValue(mockAgentResult);
    mockIdeStep = vi.fn<() => Promise<string>>().mockResolvedValue(mockIdeResult);
    mockWorkflowStep = vi
      .fn<() => Promise<WorkflowDefaultsResult>>()
      .mockResolvedValue(mockWorkflowResult);

    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call steps in order: agent, ide, workflow', async () => {
    const callOrder: string[] = [];
    mockAgentStep = vi.fn<() => Promise<AgentConfigResult>>().mockImplementation(async () => {
      callOrder.push('agent');
      return mockAgentResult;
    });
    mockIdeStep = vi.fn<() => Promise<string>>().mockImplementation(async () => {
      callOrder.push('ide');
      return mockIdeResult;
    });
    mockWorkflowStep = vi
      .fn<() => Promise<WorkflowDefaultsResult>>()
      .mockImplementation(async () => {
        callOrder.push('workflow');
        return mockWorkflowResult;
      });

    await onboardingWizard(mockAgentStep, mockIdeStep, mockWorkflowStep);

    expect(callOrder).toEqual(['agent', 'ide', 'workflow']);
  });

  it('should call CompleteOnboardingUseCase.execute() with combined results', async () => {
    await onboardingWizard(mockAgentStep, mockIdeStep, mockWorkflowStep);

    expect(mockExecute).toHaveBeenCalledWith({
      agent: mockAgentResult,
      ide: mockIdeResult,
      workflowDefaults: mockWorkflowResult,
    });
  });

  it('should call resetSettings() + initializeSettings() after use case', async () => {
    await onboardingWizard(mockAgentStep, mockIdeStep, mockWorkflowStep);

    expect(resetSettings).toHaveBeenCalledOnce();
    expect(initializeSettings).toHaveBeenCalledWith(mockUpdatedSettings);
  });

  it('should exit process when step throws ExitPromptError', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const exitError = new Error('User force closed the prompt');
    exitError.name = 'ExitPromptError';
    const failingStep = vi.fn<() => Promise<AgentConfigResult>>().mockRejectedValue(exitError);

    await onboardingWizard(failingStep, mockIdeStep, mockWorkflowStep);

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('should NOT call CompleteOnboardingUseCase when step throws ExitPromptError', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const exitError = new Error('User force closed the prompt');
    exitError.name = 'ExitPromptError';
    const failingIdeStep = vi.fn<() => Promise<string>>().mockRejectedValue(exitError);

    await onboardingWizard(mockAgentStep, failingIdeStep, mockWorkflowStep);

    expect(mockExecute).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('should re-throw non-ExitPromptError errors', async () => {
    const failingStep = vi
      .fn<() => Promise<AgentConfigResult>>()
      .mockRejectedValue(new Error('Unexpected error'));

    await expect(onboardingWizard(failingStep, mockIdeStep, mockWorkflowStep)).rejects.toThrow(
      'Unexpected error'
    );
  });
});
