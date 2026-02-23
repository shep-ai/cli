/**
 * Complete Onboarding Use Case
 *
 * Accepts wizard results (agent config, IDE, workflow defaults),
 * merges them into the current settings, sets onboardingComplete=true,
 * and persists atomically via ISettingsRepository.
 */

import { injectable, inject } from 'tsyringe';
import type {
  Settings,
  AgentType,
  AgentAuthMethod,
  EditorType,
} from '../../../domain/generated/output.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';

/**
 * Input for completing onboarding.
 */
export interface CompleteOnboardingInput {
  agent: {
    type: AgentType;
    authMethod: AgentAuthMethod;
    token?: string;
  };
  ide: string;
  workflowDefaults: {
    allowPrd: boolean;
    allowPlan: boolean;
    allowMerge: boolean;
    pushOnImplementationComplete: boolean;
    openPrOnImplementationComplete: boolean;
    autoMergeOnImplementationComplete: boolean;
  };
}

/**
 * Use case for completing first-run onboarding.
 * Loads current settings, merges wizard results, sets onboardingComplete=true,
 * and persists in a single atomic write.
 */
@injectable()
export class CompleteOnboardingUseCase {
  constructor(
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository
  ) {}

  async execute(input: CompleteOnboardingInput): Promise<Settings> {
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not found. Please run initialization first.');
    }

    const updatedSettings: Settings = {
      ...settings,
      agent: {
        type: input.agent.type,
        authMethod: input.agent.authMethod,
        ...(input.agent.token !== undefined && { token: input.agent.token }),
      },
      environment: {
        ...settings.environment,
        defaultEditor: input.ide as EditorType,
      },
      workflow: {
        ...settings.workflow,
        approvalGateDefaults: {
          allowPrd: input.workflowDefaults.allowPrd,
          allowPlan: input.workflowDefaults.allowPlan,
          allowMerge: input.workflowDefaults.allowMerge,
          pushOnImplementationComplete: input.workflowDefaults.pushOnImplementationComplete,
        },
        openPrOnImplementationComplete: input.workflowDefaults.openPrOnImplementationComplete,
        autoMergeOnImplementationComplete: input.workflowDefaults.autoMergeOnImplementationComplete,
      },
      onboardingComplete: true,
      updatedAt: new Date(),
    };

    await this.settingsRepository.update(updatedSettings);
    return updatedSettings;
  }
}
