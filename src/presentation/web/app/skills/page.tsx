import { notFound } from 'next/navigation';
import { getSkills } from '@/lib/skills';
import { SkillsPageClient } from '@/components/features/skills';
import { featureFlags } from '@/lib/feature-flags';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';

export default async function SkillsPage() {
  if (!featureFlags.skills) notFound();

  const skills = await getSkills();
  const settings = getSettings();
  const injectionConfig = settings.workflow.skillInjection ?? { enabled: false, skills: [] };

  return <SkillsPageClient skills={skills} injectionConfig={injectionConfig} />;
}
