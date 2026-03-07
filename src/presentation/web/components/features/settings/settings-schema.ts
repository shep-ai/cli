import { z } from 'zod';
import { EditorType, AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';

const modelsSchema = z.object({
  analyze: z.string().min(1),
  requirements: z.string().min(1),
  plan: z.string().min(1),
  implement: z.string().min(1),
});

const userSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  githubUsername: z.string().optional(),
});

const environmentSchema = z.object({
  defaultEditor: z.enum(Object.values(EditorType) as [string, ...string[]]),
  shellPreference: z.string().min(1),
});

const systemSchema = z.object({
  autoUpdate: z.boolean(),
  logLevel: z.string().min(1),
});

const agentSchema = z.object({
  type: z.enum(Object.values(AgentType) as [string, ...string[]]),
  authMethod: z.enum(Object.values(AgentAuthMethod) as [string, ...string[]]),
  token: z.string().optional(),
});

const notificationChannelSchema = z.object({
  enabled: z.boolean(),
});

const notificationEventSchema = z.object({
  agentStarted: z.boolean(),
  phaseCompleted: z.boolean(),
  waitingApproval: z.boolean(),
  agentCompleted: z.boolean(),
  agentFailed: z.boolean(),
  prMerged: z.boolean(),
  prClosed: z.boolean(),
  prChecksPassed: z.boolean(),
  prChecksFailed: z.boolean(),
});

const notificationsSchema = z.object({
  inApp: notificationChannelSchema,
  browser: notificationChannelSchema,
  desktop: notificationChannelSchema,
  events: notificationEventSchema,
});

const approvalGateDefaultsSchema = z.object({
  allowPrd: z.boolean(),
  allowPlan: z.boolean(),
  allowMerge: z.boolean(),
  pushOnImplementationComplete: z.boolean(),
});

const optionalPositiveInt = z.coerce.number().int().positive().optional();

const workflowSchema = z.object({
  openPrOnImplementationComplete: z.boolean(),
  approvalGateDefaults: approvalGateDefaultsSchema,
  ciMaxFixAttempts: optionalPositiveInt,
  ciWatchTimeoutMs: optionalPositiveInt,
  ciLogMaxChars: optionalPositiveInt,
});

export const settingsFormSchema = z.object({
  models: modelsSchema,
  user: userSchema,
  environment: environmentSchema,
  system: systemSchema,
  agent: agentSchema,
  notifications: notificationsSchema,
  workflow: workflowSchema,
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;
