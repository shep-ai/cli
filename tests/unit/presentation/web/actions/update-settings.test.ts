import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDefaultSettings } from '@shepai/core/domain/factories/settings-defaults.factory';

const mockLoadExecute = vi.fn();
const mockUpdateExecute = vi.fn();

vi.mock('../../../../../src/presentation/web/lib/server-container.js', () => ({
  resolve: (token: string) => {
    if (token === 'LoadSettingsUseCase') return { execute: mockLoadExecute };
    if (token === 'UpdateSettingsUseCase') return { execute: mockUpdateExecute };
    throw new Error(`Unknown token: ${token}`);
  },
}));

vi.mock('@shepai/core/application/use-cases/settings/load-settings.use-case', () => ({
  LoadSettingsUseCase: class LoadSettingsUseCase {},
}));

vi.mock('@shepai/core/application/use-cases/settings/update-settings.use-case', () => ({
  UpdateSettingsUseCase: class UpdateSettingsUseCase {},
}));

const { updateSettings } = await import(
  '../../../../../src/presentation/web/app/actions/update-settings.js'
);

describe('updateSettings server action', () => {
  const defaultSettings = createDefaultSettings();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadExecute.mockResolvedValue(defaultSettings);
    mockUpdateExecute.mockImplementation(async (s: unknown) => s);
  });

  // --- Success paths ---

  it('returns updated settings on success', async () => {
    const result = await updateSettings({
      section: 'models',
      data: { analyze: 'claude-opus-4' },
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data!.models.analyze).toBe('claude-opus-4');
  });

  it('merges only the specified section (models)', async () => {
    await updateSettings({
      section: 'models',
      data: { analyze: 'gpt-4o' },
    });

    const persisted = mockUpdateExecute.mock.calls[0][0];
    // Models section updated
    expect(persisted.models.analyze).toBe('gpt-4o');
    // Other model fields preserved from defaults
    expect(persisted.models.requirements).toBe(defaultSettings.models.requirements);
    expect(persisted.models.plan).toBe(defaultSettings.models.plan);
    expect(persisted.models.implement).toBe(defaultSettings.models.implement);
    // Other sections untouched
    expect(persisted.agent).toEqual(defaultSettings.agent);
    expect(persisted.system).toEqual(defaultSettings.system);
    expect(persisted.workflow).toEqual(defaultSettings.workflow);
  });

  it('merges only the specified section (agent)', async () => {
    await updateSettings({
      section: 'agent',
      data: { authMethod: 'token', token: 'my-secret' },
    });

    const persisted = mockUpdateExecute.mock.calls[0][0];
    expect(persisted.agent.authMethod).toBe('token');
    expect(persisted.agent.token).toBe('my-secret');
    expect(persisted.agent.type).toBe(defaultSettings.agent.type);
    // Models untouched
    expect(persisted.models).toEqual(defaultSettings.models);
  });

  it('merges nested workflow section correctly', async () => {
    await updateSettings({
      section: 'workflow',
      data: {
        openPrOnImplementationComplete: true,
        approvalGateDefaults: {
          ...defaultSettings.workflow.approvalGateDefaults,
          allowPrd: true,
        },
      },
    });

    const persisted = mockUpdateExecute.mock.calls[0][0];
    expect(persisted.workflow.openPrOnImplementationComplete).toBe(true);
    expect(persisted.workflow.approvalGateDefaults.allowPrd).toBe(true);
    expect(persisted.workflow.approvalGateDefaults.allowPlan).toBe(false);
  });

  it('loads current settings before merging', async () => {
    await updateSettings({
      section: 'system',
      data: { logLevel: 'debug' },
    });

    expect(mockLoadExecute).toHaveBeenCalledOnce();
    expect(mockUpdateExecute).toHaveBeenCalledOnce();
    // Load is called before update
    const loadOrder = mockLoadExecute.mock.invocationCallOrder[0];
    const updateOrder = mockUpdateExecute.mock.invocationCallOrder[0];
    expect(loadOrder).toBeLessThan(updateOrder);
  });

  // --- Error paths ---

  it('returns error when LoadSettingsUseCase throws', async () => {
    mockLoadExecute.mockRejectedValue(new Error('DB connection failed'));

    const result = await updateSettings({
      section: 'models',
      data: { analyze: 'test' },
    });

    expect(result).toEqual({ error: 'DB connection failed' });
    expect(result.data).toBeUndefined();
    expect(mockUpdateExecute).not.toHaveBeenCalled();
  });

  it('returns error when UpdateSettingsUseCase throws', async () => {
    mockUpdateExecute.mockRejectedValue(new Error('Write failed'));

    const result = await updateSettings({
      section: 'models',
      data: { analyze: 'test' },
    });

    expect(result).toEqual({ error: 'Write failed' });
    expect(result.data).toBeUndefined();
  });

  it('returns generic error for non-Error throws', async () => {
    mockLoadExecute.mockRejectedValue('unexpected');

    const result = await updateSettings({
      section: 'models',
      data: { analyze: 'test' },
    });

    expect(result).toEqual({ error: 'Failed to update settings' });
  });
});
