import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationSeverity, NotificationEventType } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';

// --- Mock sonner toast ---
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
};

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// --- Mock useAgentEventsContext ---
let mockEvents: NotificationEvent[] = [];
let mockLastEvent: NotificationEvent | null = null;

vi.mock('../../../../../src/presentation/web/hooks/agent-events-provider.js', () => ({
  useAgentEventsContext: () => ({
    events: mockEvents,
    lastEvent: mockLastEvent,
    connectionStatus: 'connected' as const,
  }),
}));

// --- Mock Notification API ---
class MockNotification {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn();
  static instances: MockNotification[] = [];

  title: string;
  options?: NotificationOptions;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.options = options;
    MockNotification.instances.push(this);
  }
}

function createEvent(overrides?: Partial<NotificationEvent>): NotificationEvent {
  return {
    eventType: NotificationEventType.AgentCompleted,
    agentRunId: 'run-123',
    featureName: 'Test Feature',
    message: 'Agent completed successfully',
    severity: NotificationSeverity.Success,
    timestamp: '2026-02-17T10:00:00Z',
    ...overrides,
  };
}

describe('useNotifications', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let useNotifications: typeof import('../../../../../src/presentation/web/hooks/use-notifications.js').useNotifications;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEvents = [];
    mockLastEvent = null;
    MockNotification.instances = [];
    MockNotification.permission = 'default';
    MockNotification.requestPermission.mockResolvedValue('granted');
    (globalThis as any).Notification = MockNotification;

    const mod = await import('../../../../../src/presentation/web/hooks/use-notifications.js');
    useNotifications = mod.useNotifications;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('agentCompleted event triggers toast.success with feature name', () => {
    const event = createEvent({
      eventType: NotificationEventType.AgentCompleted,
      severity: NotificationSeverity.Success,
      featureName: 'Login Feature',
      message: 'Agent completed successfully',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(mockToast.success).toHaveBeenCalledWith('Login Feature', {
      description: 'Agent completed successfully',
    });
  });

  it('agentFailed event triggers toast.error', () => {
    const event = createEvent({
      eventType: NotificationEventType.AgentFailed,
      severity: NotificationSeverity.Error,
      featureName: 'Auth Feature',
      message: 'Agent failed with error',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(mockToast.error).toHaveBeenCalledWith('Auth Feature', {
      description: 'Agent failed with error',
    });
  });

  it('waitingApproval event triggers toast.warning', () => {
    const event = createEvent({
      eventType: NotificationEventType.WaitingApproval,
      severity: NotificationSeverity.Warning,
      featureName: 'Deploy Feature',
      message: 'Waiting for user approval',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(mockToast.warning).toHaveBeenCalledWith('Deploy Feature', {
      description: 'Waiting for user approval',
    });
  });

  it('agentStarted event triggers toast.info', () => {
    const event = createEvent({
      eventType: NotificationEventType.AgentStarted,
      severity: NotificationSeverity.Info,
      featureName: 'Search Feature',
      message: 'Agent started running',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(mockToast.info).toHaveBeenCalledWith('Search Feature', {
      description: 'Agent started running',
    });
  });

  it('phaseCompleted event triggers toast.info', () => {
    const event = createEvent({
      eventType: NotificationEventType.PhaseCompleted,
      severity: NotificationSeverity.Info,
      featureName: 'API Feature',
      message: 'Completed analyze phase',
      phaseName: 'analyze',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(mockToast.info).toHaveBeenCalledWith('API Feature', {
      description: 'Completed analyze phase',
    });
  });

  it('browser Notification created when permission granted', () => {
    MockNotification.permission = 'granted';

    const event = createEvent({
      featureName: 'Notify Feature',
      message: 'Agent done',
    });
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe('Notify Feature');
    expect(MockNotification.instances[0].options?.body).toBe('Agent done');
  });

  it('no browser Notification when permission not granted', () => {
    MockNotification.permission = 'denied';

    const event = createEvent();
    mockLastEvent = event;
    mockEvents = [event];

    renderHook(() => useNotifications());

    expect(MockNotification.instances).toHaveLength(0);
  });

  it('requestBrowserPermission calls Notification.requestPermission', async () => {
    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.requestBrowserPermission();
    });

    expect(MockNotification.requestPermission).toHaveBeenCalled();
  });

  it('requestBrowserPermission updates browserPermissionState', async () => {
    MockNotification.requestPermission.mockResolvedValue('granted');

    const { result } = renderHook(() => useNotifications());
    expect(result.current.browserPermissionState).toBe('default');

    await act(async () => {
      await result.current.requestBrowserPermission();
    });

    expect(result.current.browserPermissionState).toBe('granted');
  });

  it('does not dispatch toast when lastEvent is null', () => {
    mockLastEvent = null;
    mockEvents = [];

    renderHook(() => useNotifications());

    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(mockToast.warning).not.toHaveBeenCalled();
    expect(mockToast.info).not.toHaveBeenCalled();
  });

  it('graceful fallback when Notification API unavailable', () => {
    delete (globalThis as any).Notification;

    const event = createEvent();
    mockLastEvent = event;
    mockEvents = [event];

    // Should not throw
    const { result } = renderHook(() => useNotifications());

    expect(result.current.browserPermissionState).toBe('default');
  });
});
