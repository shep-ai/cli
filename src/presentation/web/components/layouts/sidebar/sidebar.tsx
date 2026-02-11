import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  pathname: string;
  className?: string;
}

export function Sidebar({ items, pathname, className }: SidebarProps) {
  return (
    <nav className={cn('flex flex-col gap-1 p-4', className)}>
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
