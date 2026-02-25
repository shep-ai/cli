import { SkillCard } from './skill-card';
import type { SkillCategory, SkillData } from '@/lib/skills';

const CATEGORY_ORDER: SkillCategory[] = ['Workflow', 'Code Generation', 'Analysis', 'Reference'];

export interface SkillListProps {
  skills: SkillData[];
  onSkillSelect: (skill: SkillData) => void;
}

function groupByCategory(skills: SkillData[]): Map<SkillCategory, SkillData[]> {
  const groups = new Map<SkillCategory, SkillData[]>();
  for (const skill of skills) {
    const group = groups.get(skill.category) ?? [];
    group.push(skill);
    groups.set(skill.category, group);
  }
  return groups;
}

export function SkillList({ skills, onSkillSelect }: SkillListProps) {
  const groups = groupByCategory(skills);

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map((category) => {
        const categorySkills = groups.get(category);
        if (!categorySkills || categorySkills.length === 0) return null;

        return (
          <section key={category}>
            <h2 className="mb-4 text-lg font-semibold">
              {category}{' '}
              <span className="text-muted-foreground text-sm font-normal">
                ({categorySkills.length})
              </span>
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categorySkills.map((skill) => (
                <SkillCard key={skill.name} skill={skill} onSelect={onSkillSelect} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
