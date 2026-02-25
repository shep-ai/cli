'use client';

import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FolderOpen } from 'lucide-react';
import type { SkillData } from '@/lib/skills';

export interface SkillDetailDrawerProps {
  skill: SkillData | null;
  onClose: () => void;
}

export function SkillDetailDrawer({ skill, onClose }: SkillDetailDrawerProps) {
  return (
    <BaseDrawer
      open={skill !== null}
      onClose={onClose}
      size="sm"
      modal
      data-testid="skill-detail-drawer"
      header={
        skill ? (
          <>
            <DrawerTitle>{skill.displayName}</DrawerTitle>
            <DrawerDescription>{skill.name}</DrawerDescription>
          </>
        ) : undefined
      }
    >
      {skill ? (
        <div className="px-4 pb-4">
          {/* Description */}
          <p className="text-muted-foreground text-sm">{skill.description}</p>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Badge variant={skill.source === 'project' ? 'secondary' : 'outline'}>
              {skill.source === 'project' ? 'Project' : 'Global'}
            </Badge>
            <Badge variant="outline">{skill.category}</Badge>
            {skill.context ? <Badge variant="outline">{skill.context}</Badge> : null}
          </div>

          {/* Allowed Tools */}
          {skill.allowedTools ? (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold">Allowed Tools</h3>
                <p className="text-muted-foreground mt-1 text-sm">{skill.allowedTools}</p>
              </div>
            </>
          ) : null}

          {/* Resources */}
          {skill.resources.length > 0 ? (
            <>
              <Separator className="my-4" />
              <div>
                <h3 className="text-sm font-semibold">Resources</h3>
                <ul className="mt-2 space-y-1.5">
                  {skill.resources.map((resource) => (
                    <li
                      key={resource.name}
                      className="text-muted-foreground flex items-center gap-2 text-sm"
                    >
                      <FolderOpen className="size-3.5 shrink-0" />
                      <span>
                        {resource.name}/ — {resource.fileCount}{' '}
                        {resource.fileCount === 1 ? 'file' : 'files'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {/* Body */}
          {skill.body ? (
            <>
              <Separator className="my-4" />
              <pre className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {skill.body}
              </pre>
            </>
          ) : null}
        </div>
      ) : null}
    </BaseDrawer>
  );
}
