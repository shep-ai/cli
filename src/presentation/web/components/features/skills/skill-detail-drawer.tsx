'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FolderOpen } from 'lucide-react';
import type { SkillData } from '@/lib/skills';

export interface SkillDetailDrawerProps {
  skill: SkillData | null;
  onClose: () => void;
}

export function SkillDetailDrawer({ skill, onClose }: SkillDetailDrawerProps) {
  return (
    <Sheet
      open={skill !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {skill ? (
          <>
            <SheetHeader>
              <SheetTitle>{skill.displayName}</SheetTitle>
              <SheetDescription>{skill.name}</SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-4 pb-4">
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
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
