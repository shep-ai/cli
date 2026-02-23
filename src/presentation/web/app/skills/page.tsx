import { getSkills } from '@/lib/skills';
import { SkillsPageClient } from '@/components/features/skills';

export default async function SkillsPage() {
  const skills = await getSkills();

  return <SkillsPageClient skills={skills} />;
}
