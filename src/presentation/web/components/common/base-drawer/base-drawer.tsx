'use client';

import { XIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerOverlay,
} from '@/components/ui/drawer';

const drawerVariants = cva('', {
  variants: {
    size: {
      sm: 'w-96',
      md: 'w-xl',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export interface BaseDrawerProps extends VariantProps<typeof drawerVariants> {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function BaseDrawer({
  open,
  onClose,
  modal = false,
  size,
  header,
  children,
  footer,
  className,
  'data-testid': testId,
}: BaseDrawerProps) {
  return (
    <Drawer
      direction="right"
      modal={modal}
      handleOnly
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      {modal ? <DrawerOverlay /> : null}
      <DrawerContent
        direction="right"
        showCloseButton={false}
        className={cn(drawerVariants({ size }), className)}
        data-testid={testId}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          data-testid={testId ? `${testId}-close-button` : undefined}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header slot */}
        {header ? <DrawerHeader>{header}</DrawerHeader> : null}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">{children}</div>
        </div>

        {/* Footer slot */}
        {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}
