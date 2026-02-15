'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { VersionInfo, SystemInfo } from '@/lib/version';

interface InfoRowProps {
  label: string;
  value: string;
  badge?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'outline';
}

function InfoRow({ label, value, badge, badgeVariant = 'secondary' }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {badge ? (
        <Badge variant={badgeVariant}>{value}</Badge>
      ) : (
        <span className="font-mono text-sm">{value}</span>
      )}
    </div>
  );
}

interface VersionPageClientProps {
  versionInfo: VersionInfo;
  systemInfo: SystemInfo;
}

export default function VersionPageClient({ versionInfo, systemInfo }: VersionPageClientProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">{versionInfo.name}</h1>
          <p className="mt-2 text-muted-foreground">{versionInfo.description}</p>
          <div className="mt-4">
            <Badge variant="default" data-testid="version-badge">
              v{versionInfo.version}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Package Information</CardTitle>
                <CardDescription>Details about the Shep AI CLI package</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow label="Package" value={versionInfo.name} />
                <InfoRow
                  label="Version"
                  value={`v${versionInfo.version}`}
                  badge
                  badgeVariant="default"
                />
                <InfoRow label="License" value="MIT" badge badgeVariant="outline" />
                <InfoRow label="Author" value="Shep AI" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Runtime environment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <InfoRow
                  label="Node.js"
                  value={systemInfo.nodeVersion}
                  badge
                  badgeVariant="secondary"
                />
                <InfoRow label="Platform" value={`${systemInfo.platform} ${systemInfo.arch}`} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
                <CardDescription>What Shep AI can do for you</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">AI</Badge>
                    <span>Autonomous code generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">SDLC</Badge>
                    <span>Full development lifecycle automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">CLI</Badge>
                    <span>Powerful command-line interface</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">Web</Badge>
                    <span>Modern web UI dashboard</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/">Back to Home</Link>
          </Button>
          <Button asChild>
            <a href="https://github.com/shep-ai/cli" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
