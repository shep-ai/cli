'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CellValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string;
  value: string;
}

export function CellValueDialog({ open, onOpenChange, columnName, value }: CellValueDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{columnName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <pre className="text-sm break-all whitespace-pre-wrap" data-testid="cell-value-content">
            {value}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
