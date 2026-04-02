'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SkillInjectionConfig, SkillSource } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { removeInjectedSkill } from '@/app/actions/remove-injected-skill';
import { AddSkillDialog } from './add-skill-dialog';
import type { SkillData } from '@/lib/skills';

export interface AutoInjectedSkillsSectionProps {
  config: SkillInjectionConfig;
  discoveredSkills: SkillData[];
}

export function AutoInjectedSkillsSection({
  config,
  discoveredSkills,
}: AutoInjectedSkillsSectionProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingSkill, setRemovingSkill] = useState<string | null>(null);

  if (!config.skills.length) return null;

  const handleRemove = async (skillName: string) => {
    setRemovingSkill(skillName);
    const result = await removeInjectedSkill(skillName);
    setRemovingSkill(null);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to remove skill');
      return;
    }
    toast.success(`Removed "${skillName}" from auto-injection`);
    router.refresh();
  };

  const handleAdded = () => {
    setAddDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Auto-Injected Skills</h2>
        <p className="text-muted-foreground text-sm">Skills automatically added to new features</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {config.skills.map((skill) => (
          <InjectedSkillCard
            key={skill.name}
            skill={skill}
            onRemove={() => handleRemove(skill.name)}
            isRemoving={removingSkill === skill.name}
          />
        ))}
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddDialogOpen(true)}
          data-testid="add-injected-skill-button"
        >
          <Plus className="mr-1.5 size-4" />
          Add Skill
        </Button>
      </div>
      <AddSkillDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleAdded}
        discoveredSkills={discoveredSkills}
        existingSkillNames={config.skills.map((s) => s.name)}
      />
    </div>
  );
}

function InjectedSkillCard({
  skill,
  onRemove,
  isRemoving,
}: {
  skill: SkillSource;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <Card data-testid={`injected-skill-${skill.name}`}>
      <CardContent className="flex items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-medium">{skill.name}</span>
          <div className="flex items-center gap-1.5">
            <Badge variant={skill.type === 'local' ? 'secondary' : 'outline'} className="text-xs">
              {skill.type === 'local' ? 'Local' : 'Remote'}
            </Badge>
            <span className="text-muted-foreground max-w-37.5 truncate text-xs">
              {skill.source}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${skill.name}`}
          data-testid={`remove-injected-skill-${skill.name}`}
        >
          <X className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
