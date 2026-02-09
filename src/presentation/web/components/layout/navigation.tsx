'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/' as const, label: 'Home' },
  { href: '/version' as const, label: 'Version' },
  { href: '/logs' as const, label: 'Logs' },
] as const;

export function Navigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto flex h-16 items-center px-4">
        <div className="mr-8">
          <Link href="/" className="text-xl font-bold">
            Shep AI
          </Link>
        </div>
        <div className="flex gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-muted-foreground hover:text-foreground text-sm font-medium transition-colors',
                isActive(item.href) && 'text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
