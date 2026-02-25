'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

export interface InstallInstructionsProps {
  tool: ToolItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function InstallInstructions({
  tool,
  open,
  onOpenChange,
  className,
}: InstallInstructionsProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!tool.installCommand) return;
    void navigator.clipboard.writeText(tool.installCommand).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="install-instructions" className={cn('sm:max-w-lg', className)}>
        <DialogHeader>
          <DialogTitle data-testid="install-instructions-title">Install {tool.name}</DialogTitle>
          <DialogDescription data-testid="install-instructions-description">
            {tool.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tool.installCommand ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Installation command</p>
              <div className="bg-muted relative rounded-md">
                <pre
                  data-testid="install-instructions-command"
                  className="overflow-x-auto px-4 py-3 pr-16 font-mono text-sm"
                >
                  <code>{tool.installCommand}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied!' : 'Copy install command'}
                  data-testid="install-instructions-copy-button"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <p
              data-testid="install-instructions-no-command"
              className="text-muted-foreground text-sm"
            >
              No automated install command available. Please refer to the documentation.
            </p>
          )}

          {tool.documentationUrl ? (
            <a
              data-testid="install-instructions-doc-link"
              href={tool.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
            >
              View documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
