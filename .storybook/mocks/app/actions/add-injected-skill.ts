import type { SkillSource } from '@shepai/core/domain/generated/output';

export async function addInjectedSkill(
  _skill: SkillSource
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}
