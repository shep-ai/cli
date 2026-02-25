'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AgentConfig } from '@shepai/core/domain/generated/output';
import { AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AgentSectionProps {
  agent: AgentConfig;
  onSave: (data: AgentConfig) => Promise<boolean>;
}

const SUPPORTED_AGENTS = new Set<AgentType>([AgentType.ClaudeCode]);

const AGENT_TYPE_OPTIONS = [
  { value: AgentType.ClaudeCode, label: 'Claude Code' },
  { value: AgentType.GeminiCli, label: 'Gemini CLI' },
  { value: AgentType.Aider, label: 'Aider' },
  { value: AgentType.Continue, label: 'Continue' },
  { value: AgentType.Cursor, label: 'Cursor' },
  { value: AgentType.Dev, label: 'Dev' },
] as const;

const AUTH_METHOD_OPTIONS = [
  { value: AgentAuthMethod.Session, label: 'Session' },
  { value: AgentAuthMethod.Token, label: 'Token' },
] as const;

export function AgentSection({ agent, onSave }: AgentSectionProps) {
  const [formData, setFormData] = useState<AgentConfig>({ ...agent });
  const [showToken, setShowToken] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await onSave(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Configuration</CardTitle>
        <CardDescription>Configure the AI coding agent</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-type">Agent Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: AgentType) => setFormData((prev) => ({ ...prev, type: value }))}
          >
            <SelectTrigger id="agent-type">
              <SelectValue placeholder="Select agent type" />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPE_OPTIONS.map((option) => {
                const isSupported = SUPPORTED_AGENTS.has(option.value);
                return (
                  <SelectItem key={option.value} value={option.value} disabled={!isSupported}>
                    <span className="flex items-center gap-2">
                      {option.label}
                      {!isSupported && <Badge variant="secondary">Coming Soon</Badge>}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-method">Authentication Method</Label>
          <Select
            value={formData.authMethod}
            onValueChange={(value: AgentAuthMethod) =>
              setFormData((prev) => ({ ...prev, authMethod: value }))
            }
          >
            <SelectTrigger id="auth-method">
              <SelectValue placeholder="Select auth method" />
            </SelectTrigger>
            <SelectContent>
              {AUTH_METHOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.authMethod === AgentAuthMethod.Token && (
          <div className="space-y-2">
            <Label htmlFor="agent-token">API Token</Label>
            <div className="relative">
              <Input
                id="agent-token"
                type={showToken ? 'text' : 'password'}
                value={formData.token ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, token: e.target.value }))}
                placeholder="Enter API token"
                autoComplete="off"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-2 -translate-y-1/2"
                onClick={() => setShowToken((prev) => !prev)}
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardFooter>
    </Card>
  );
}
