'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export interface DatabaseSettingsSectionProps {
  shepHome: string;
  dbFileSize: string;
}

export function DatabaseSettingsSection({ shepHome, dbFileSize }: DatabaseSettingsSectionProps) {
  return (
    <Card data-testid="database-settings-section">
      <CardHeader>
        <CardTitle>Database Location</CardTitle>
        <CardDescription>Information about your Shep data directory and database</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label>SHEP_HOME Directory</Label>
          <p className="text-muted-foreground font-mono text-sm" data-testid="shep-home-path">
            {shepHome}
          </p>
        </div>
        <div className="space-y-1">
          <Label>Database File Size</Label>
          <p className="text-muted-foreground text-sm" data-testid="db-file-size">
            {dbFileSize}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
