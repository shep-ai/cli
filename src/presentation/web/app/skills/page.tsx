import { notFound } from 'next/navigation';
import { getSkills } from '@/lib/skills';
import { SkillsPageClient } from '@/components/features/skills';
import { featureFlags } from '@/lib/feature-flags';

export default async function SkillsPage() {
  if (!featureFlags.skills) notFound();

  const skills = await getSkills();

  return <SkillsPageClient skills={skills} />;
}
