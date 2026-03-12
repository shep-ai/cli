'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';

export interface ChatHeaderProps {
  onClear?: () => void;
  isStreaming?: boolean;
  className?: string;
}

export function ChatHeader({ onClear, isStreaming = false, className }: ChatHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between border-b px-4 py-2', className)}>
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Chat</h1>
        {isStreaming ? <Loader variant="typing" size="sm" /> : null}
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClear}>
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
