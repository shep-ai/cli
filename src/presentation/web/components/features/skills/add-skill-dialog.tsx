'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { SkillSourceType } from '@shepai/core/domain/generated/output';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { addInjectedSkill } from '@/app/actions/add-injected-skill';
import type { SkillData } from '@/lib/skills';

export interface AddSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  discoveredSkills: SkillData[];
  existingSkillNames: string[];
}

export function AddSkillDialog({
  open,
  onOpenChange,
  onAdded,
  discoveredSkills,
  existingSkillNames,
}: AddSkillDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [remoteSource, setRemoteSource] = useState('');
  const [remoteSkillName, setRemoteSkillName] = useState('');

  const availableSkills = discoveredSkills.filter((s) => !existingSkillNames.includes(s.name));

  const handleAddLocal = async (skill: SkillData) => {
    setIsSubmitting(true);
    const result = await addInjectedSkill({
      name: skill.name,
      type: 'local' as SkillSourceType,
      source: `.claude/skills/${skill.name}`,
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to add skill');
      return;
    }
    toast.success(`Added "${skill.name}" to auto-injection`);
    onAdded();
  };

  const handleAddRemote = async () => {
    if (!remoteName.trim() || !remoteSource.trim()) {
      toast.error('Name and source are required');
      return;
    }
    setIsSubmitting(true);
    const result = await addInjectedSkill({
      name: remoteName.trim(),
      type: 'remote' as SkillSourceType,
      source: remoteSource.trim(),
      ...(remoteSkillName.trim() && { remoteSkillName: remoteSkillName.trim() }),
    });
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(result.error ?? 'Failed to add skill');
      return;
    }
    toast.success(`Added "${remoteName.trim()}" to auto-injection`);
    setRemoteName('');
    setRemoteSource('');
    setRemoteSkillName('');
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="add-skill-dialog">
        <DialogHeader>
          <DialogTitle>Add Skill to Auto-Injection</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="local">
          <TabsList className="w-full">
            <TabsTrigger value="local" className="flex-1">
              Local
            </TabsTrigger>
            <TabsTrigger value="remote" className="flex-1">
              Remote
            </TabsTrigger>
          </TabsList>
          <TabsContent value="local" className="mt-4">
            {availableSkills.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                All discovered skills are already configured.
              </p>
            ) : (
              <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
                {availableSkills.map((skill) => (
                  <button
                    key={skill.name}
                    type="button"
                    className="hover:bg-accent flex flex-col gap-0.5 rounded-md border p-3 text-left transition-colors"
                    onClick={() => handleAddLocal(skill)}
                    disabled={isSubmitting}
                    data-testid={`add-local-skill-${skill.name}`}
                  >
                    <span className="text-sm font-medium">{skill.displayName}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {skill.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="remote" className="mt-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-name">Name</Label>
                <Input
                  id="remote-name"
                  placeholder="e.g. remotion-best-practices"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  data-testid="remote-skill-name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-source">Source (npm package or URL)</Label>
                <Input
                  id="remote-source"
                  placeholder="e.g. @anthropic/remotion-skills"
                  value={remoteSource}
                  onChange={(e) => setRemoteSource(e.target.value)}
                  data-testid="remote-skill-source"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="remote-skill-name">Skill Name (optional)</Label>
                <Input
                  id="remote-skill-name"
                  placeholder="e.g. remotion-best-practices"
                  value={remoteSkillName}
                  onChange={(e) => setRemoteSkillName(e.target.value)}
                  data-testid="remote-skill-skill-name"
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddRemote}
                  disabled={isSubmitting || !remoteName.trim() || !remoteSource.trim()}
                  data-testid="add-remote-skill-submit"
                >
                  Add Remote Skill
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
