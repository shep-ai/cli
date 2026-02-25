import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SkillData } from '@/lib/skills';
import { FolderOpen } from 'lucide-react';

export interface SkillCardProps {
  skill: SkillData;
  onSelect: (skill: SkillData) => void;
}

export function SkillCard({ skill, onSelect }: SkillCardProps) {
  return (
    <Card
      className="hover:border-primary/50 cursor-pointer transition-colors"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(skill)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(skill);
        }
      }}
      data-testid={`skill-card-${skill.name}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{skill.displayName}</CardTitle>
        <p className="text-muted-foreground font-mono text-xs">{skill.name}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-2 text-sm">{skill.description}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={skill.source === 'project' ? 'secondary' : 'outline'}>
            {skill.source === 'project' ? 'Project' : 'Global'}
          </Badge>
          {skill.context ? <Badge variant="outline">{skill.context}</Badge> : null}
          {skill.allowedTools ? <Badge variant="outline">Tools</Badge> : null}
          {skill.resources.length > 0 ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <FolderOpen className="size-3" />
              {skill.resources.length} {skill.resources.length === 1 ? 'resource' : 'resources'}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
