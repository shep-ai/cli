import { Button } from '@/components/ui/button';
import type { SkillCategory } from '@/lib/skills';

const CATEGORIES: { label: string; value: SkillCategory | null }[] = [
  { label: 'All', value: null },
  { label: 'Workflow', value: 'Workflow' },
  { label: 'Code Generation', value: 'Code Generation' },
  { label: 'Analysis', value: 'Analysis' },
  { label: 'Reference', value: 'Reference' },
];

export interface CategoryFilterProps {
  activeCategory: SkillCategory | null;
  onCategoryChange: (category: SkillCategory | null) => void;
  counts?: Record<SkillCategory, number>;
}

export function CategoryFilter({ activeCategory, onCategoryChange, counts }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      {CATEGORIES.map(({ label, value }) => (
        <Button
          key={label}
          variant={activeCategory === value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(value)}
        >
          {label}
          {counts && value ? (
            <span className="ml-1 text-xs opacity-70">({counts[value]})</span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
