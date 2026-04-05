import { notFound } from 'next/navigation';
import { getSkills } from '@/lib/skills';
import { SkillsPageClient } from '@/components/features/skills';
import { featureFlags } from '@/lib/feature-flags';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { createDefaultSettings } from '@shepai/core/domain/factories/settings-defaults.factory';

const defaultInjectionConfig = createDefaultSettings().workflow.skillInjection!;

export default async function SkillsPage() {
  if (!featureFlags.skills) notFound();

  const skills = await getSkills();
  const settings = getSettings();
  const injectionConfig = settings.workflow.skillInjection ?? defaultInjectionConfig;

  return <SkillsPageClient skills={skills} injectionConfig={injectionConfig} />;
}
