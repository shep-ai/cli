'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SkillInjectionConfig, SkillSource } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const skillDescriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of discoveredSkills) {
      map.set(s.name, s.description);
    }
    return map;
  }, [discoveredSkills]);

  const handleRemove = async (skillName: string) => {
    setRemovingSkill(skillName);
    const result = await removeInjectedSkill(skillName);
    setRemovingSkill(null);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to remove skill');
      return;
    }
    toast.success(`Removed "${skillName}" from feature skills`);
    router.refresh();
  };

  const handleAdded = () => {
    setAddDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">Feature Skills</h2>
        <p className="text-muted-foreground text-sm">
          Curated skills included in new feature worktrees to guide the agent
        </p>
      </div>
      {config.skills.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {config.skills.map((skill) => (
            <InjectedSkillCard
              key={skill.name}
              skill={skill}
              description={skillDescriptions.get(skill.name)}
              onRemove={() => handleRemove(skill.name)}
              isRemoving={removingSkill === skill.name}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No skills configured. Add skills to guide the agent when working on new features.
        </p>
      )}
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
  description,
  onRemove,
  isRemoving,
}: {
  skill: SkillSource;
  description?: string;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <Card data-testid={`injected-skill-${skill.name}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <CardTitle className="truncate text-sm">{skill.name}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${skill.name}`}
          data-testid={`remove-injected-skill-${skill.name}`}
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {description ? (
          <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>
        ) : null}
        <div className="flex items-center gap-1.5">
          <Badge variant={skill.type === 'local' ? 'secondary' : 'outline'} className="text-xs">
            {skill.type === 'local' ? 'Local' : 'Remote'}
          </Badge>
          <span className="text-muted-foreground max-w-37.5 truncate text-xs">{skill.source}</span>
        </div>
      </CardContent>
    </Card>
  );
}
