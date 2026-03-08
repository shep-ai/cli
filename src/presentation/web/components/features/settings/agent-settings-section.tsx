'use client';

import { useState, useTransition } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateSettingsAction } from '@/app/actions/update-settings';
import { AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';
import type { AgentConfig } from '@shepai/core/domain/generated/output';

const AGENT_TYPE_OPTIONS = [
  { value: AgentType.ClaudeCode, label: 'Claude Code' },
  { value: AgentType.Cursor, label: 'Cursor' },
  { value: AgentType.GeminiCli, label: 'Gemini CLI' },
  { value: AgentType.Aider, label: 'Aider' },
  { value: AgentType.Continue, label: 'Continue' },
  { value: AgentType.Dev, label: 'Dev' },
];

const AUTH_METHOD_OPTIONS = [
  { value: AgentAuthMethod.Session, label: 'Session' },
  { value: AgentAuthMethod.Token, label: 'Token' },
];

export interface AgentSettingsSectionProps {
  agent: AgentConfig;
}

export function AgentSettingsSection({ agent }: AgentSettingsSectionProps) {
  const [agentType, setAgentType] = useState(agent.type);
  const [authMethod, setAuthMethod] = useState(agent.authMethod);
  const [token, setToken] = useState(agent.token ?? '');
  const [showToken, setShowToken] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty =
    agentType !== agent.type ||
    authMethod !== agent.authMethod ||
    (authMethod === AgentAuthMethod.Token && token !== (agent.token ?? ''));

  function handleSave() {
    startTransition(async () => {
      const payload: Record<string, unknown> = {
        type: agentType,
        authMethod,
      };
      if (authMethod === AgentAuthMethod.Token) {
        payload.token = token;
      }
      const result = await updateSettingsAction({ agent: payload as AgentConfig });
      if (result.success) {
        toast.success('Agent settings saved');
      } else {
        toast.error(result.error ?? 'Failed to save agent settings');
      }
    });
  }

  return (
    <Card data-testid="agent-settings-section">
      <CardHeader>
        <CardTitle>Preferred Agent</CardTitle>
        <CardDescription>Choose your AI coding agent and authentication method</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-type">Agent Type</Label>
          <Select value={agentType} onValueChange={(v) => setAgentType(v as AgentType)}>
            <SelectTrigger id="agent-type" data-testid="agent-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth-method">Authentication Method</Label>
          <Select value={authMethod} onValueChange={(v) => setAuthMethod(v as AgentAuthMethod)}>
            <SelectTrigger id="auth-method" data-testid="auth-method-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUTH_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {authMethod === AgentAuthMethod.Token && (
          <div className="space-y-2">
            <Label htmlFor="agent-token">API Token</Label>
            <div className="relative">
              <Input
                id="agent-token"
                data-testid="agent-token-input"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your API token"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowToken(!showToken)}
                data-testid="toggle-token-visibility"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          data-testid="agent-save-button"
        >
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}
