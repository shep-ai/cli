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
import { Separator } from '@/components/ui/separator';

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
        {header ? <DrawerHeader className="shrink-0">{header}</DrawerHeader> : null}

        {/* Separator between header and content — matches review drawer style */}
        {header ? <Separator /> : null}

        {/* Scrollable content area. Consumers should add p-4 for consistent spacing. */}
        {/* Footer components like DrawerActionBar typically include border-t. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>

        {/* Footer slot */}
        {footer ? <DrawerFooter className="shrink-0">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}
