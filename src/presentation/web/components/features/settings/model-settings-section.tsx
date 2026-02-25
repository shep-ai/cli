'use client';

import { useState, useTransition } from 'react';
import type { ModelConfiguration } from '@shepai/core/domain/generated/output';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface ModelSettingsSectionProps {
  models: ModelConfiguration;
  onSave: (data: ModelConfiguration) => Promise<boolean>;
}

const MODEL_FIELDS = [
  { key: 'analyze' as const, label: 'Analyze', description: 'Model for codebase analysis' },
  {
    key: 'requirements' as const,
    label: 'Requirements',
    description: 'Model for requirements gathering',
  },
  { key: 'plan' as const, label: 'Plan', description: 'Model for planning' },
  { key: 'implement' as const, label: 'Implement', description: 'Model for implementation' },
] as const;

export function ModelSettingsSection({ models, onSave }: ModelSettingsSectionProps) {
  const [formData, setFormData] = useState<ModelConfiguration>({ ...models });
  const [isPending, startTransition] = useTransition();

  function handleChange(key: keyof ModelConfiguration, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      await onSave(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Configuration</CardTitle>
        <CardDescription>Configure AI models for each SDLC phase</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {MODEL_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`model-${field.key}`}>{field.label}</Label>
            <Input
              id={`model-${field.key}`}
              value={formData[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()} model ID`}
            />
            <p className="text-muted-foreground text-sm">{field.description}</p>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
