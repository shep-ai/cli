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
      <DialogContent data-testid="install-instructions" className={cn('sm:max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle data-testid="install-instructions-title">Install {tool.name}</DialogTitle>
          <DialogDescription data-testid="install-instructions-description">
            {tool.summary}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {tool.installCommand && tool.autoInstall ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                Installation command
              </span>
              <div className="bg-muted relative rounded-md">
                <pre
                  data-testid="install-instructions-command"
                  className="overflow-x-auto px-3 py-2.5 pr-20 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
                >
                  <code>{tool.installCommand}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-1.5 right-1.5 h-7 cursor-pointer px-2"
                  onClick={handleCopy}
                  aria-label={copied ? 'Copied!' : 'Copy install command'}
                  data-testid="install-instructions-copy-button"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1 text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
              </div>
            </div>
          ) : tool.installCommand ? (
            <p data-testid="install-instructions-command" className="text-muted-foreground text-sm">
              {tool.installCommand}
            </p>
          ) : (
            <p
              data-testid="install-instructions-no-command"
              className="text-muted-foreground text-sm"
            >
              Please refer to the documentation for installation instructions.
            </p>
          )}

          {tool.documentationUrl ? (
            <Button variant="outline" size="sm" className="w-fit cursor-pointer" asChild>
              <a
                data-testid="install-instructions-doc-link"
                href={tool.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View documentation
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
