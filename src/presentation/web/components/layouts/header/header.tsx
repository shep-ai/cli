import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Header({ title, breadcrumbs, actions, className }: HeaderProps) {
  return (
    <header className={cn('flex flex-col gap-2 px-6 py-4', className)}>
      {breadcrumbs ? <div data-slot="breadcrumbs">{breadcrumbs}</div> : null}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {actions ? <div data-slot="actions">{actions}</div> : null}
      </div>
    </header>
  );
}
