import type { Metadata } from 'next';
import '@xyflow/react/dist/base.css';
import './globals.css';
import { AppShell } from '@/components/layouts/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { getFeatureFlags } from '@/lib/feature-flags';

/** Force dynamic rendering for all pages since they depend on client-side context. */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shep AI',
  description:
    'Autonomous AI Native SDLC Platform - Automate the development cycle from idea to deploy',
  icons: [
    {
      rel: 'icon',
      url: '/favicon-light.svg',
      type: 'image/svg+xml',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      url: '/favicon-dark.svg',
      type: 'image/svg+xml',
      media: '(prefers-color-scheme: dark)',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('shep-theme');
                  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (theme === 'system' && systemDark) || (!theme && systemDark)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <AppShell skillsEnabled={getFeatureFlags().skills}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
