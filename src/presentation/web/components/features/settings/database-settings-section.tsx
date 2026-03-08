'use client';

import { Database, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export interface DatabaseSettingsSectionProps {
  shepHome: string;
  dbFileSize: string;
}

export function DatabaseSettingsSection({ shepHome, dbFileSize }: DatabaseSettingsSectionProps) {
  return (
    <Card id="database" className="scroll-mt-6" data-testid="database-settings-section">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="text-muted-foreground h-4 w-4" />
          <CardTitle>Database Location</CardTitle>
        </div>
        <CardDescription>
          <span className="inline-flex items-center gap-1">
            <Info className="h-3 w-3" />
            Read-only information about your Shep data directory and database
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="bg-muted/50 space-y-3 rounded-b-lg">
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">SHEP_HOME Directory</Label>
          <p className="font-mono text-sm" data-testid="shep-home-path">
            {shepHome}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-muted-foreground text-xs">Database File Size</Label>
          <p className="text-sm" data-testid="db-file-size">
            {dbFileSize}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
