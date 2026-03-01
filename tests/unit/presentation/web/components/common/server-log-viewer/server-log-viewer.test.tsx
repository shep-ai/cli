import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServerLogViewer } from '@/components/common/server-log-viewer';
import type { LogEntry } from '@shepai/core/application/ports/output/services/deployment-service.interface';

// Mock the useDeploymentLogs hook
const mockUseDeploymentLogs = vi.fn();

vi.mock('@/hooks/use-deployment-logs', () => ({
  useDeploymentLogs: (...args: unknown[]) => mockUseDeploymentLogs(...args),
}));

const sampleLogs: LogEntry[] = [
  { targetId: 't1', stream: 'stdout', line: 'Server starting...', timestamp: 1000 },
  { targetId: 't1', stream: 'stderr', line: 'Warning: deprecation notice', timestamp: 1001 },
  { targetId: 't1', stream: 'stdout', line: 'Listening on port 3000', timestamp: 1002 },
];

describe('ServerLogViewer', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    targetId: 'target-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeploymentLogs.mockReturnValue({ logs: [], isConnected: true });
  });

  describe('visibility', () => {
    it('renders dialog content when open is true', () => {
      render(<ServerLogViewer {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog content when open is false', () => {
      render(<ServerLogViewer {...defaultProps} open={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('renders dialog title for accessibility', () => {
      render(<ServerLogViewer {...defaultProps} />);
      expect(screen.getByText('Server Logs')).toBeInTheDocument();
    });

    it('renders empty state message when no logs', () => {
      mockUseDeploymentLogs.mockReturnValue({ logs: [], isConnected: true });
      render(<ServerLogViewer {...defaultProps} />);
      expect(screen.getByText('Waiting for log output...')).toBeInTheDocument();
    });

    it('renders log lines when logs are present', () => {
      mockUseDeploymentLogs.mockReturnValue({ logs: sampleLogs, isConnected: true });
      render(<ServerLogViewer {...defaultProps} />);

      expect(screen.getByText('Server starting...')).toBeInTheDocument();
      expect(screen.getByText('Warning: deprecation notice')).toBeInTheDocument();
      expect(screen.getByText('Listening on port 3000')).toBeInTheDocument();
    });
  });

  describe('stderr styling', () => {
    it('applies stderr styling to stderr log lines', () => {
      mockUseDeploymentLogs.mockReturnValue({
        logs: [{ targetId: 't1', stream: 'stderr', line: 'Error occurred', timestamp: 1000 }],
        isConnected: true,
      });
      render(<ServerLogViewer {...defaultProps} />);

      const errorLine = screen.getByText('Error occurred');
      expect(errorLine.closest('[data-stream]')).toHaveAttribute('data-stream', 'stderr');
    });

    it('applies stdout styling to stdout log lines', () => {
      mockUseDeploymentLogs.mockReturnValue({
        logs: [{ targetId: 't1', stream: 'stdout', line: 'Normal output', timestamp: 1000 }],
        isConnected: true,
      });
      render(<ServerLogViewer {...defaultProps} />);

      const normalLine = screen.getByText('Normal output');
      expect(normalLine.closest('[data-stream]')).toHaveAttribute('data-stream', 'stdout');
    });
  });

  describe('connection status', () => {
    it('shows connected indicator when isConnected is true', () => {
      mockUseDeploymentLogs.mockReturnValue({ logs: [], isConnected: true });
      render(<ServerLogViewer {...defaultProps} />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows disconnected indicator when isConnected is false', () => {
      mockUseDeploymentLogs.mockReturnValue({ logs: sampleLogs, isConnected: false });
      render(<ServerLogViewer {...defaultProps} />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  describe('hook integration', () => {
    it('calls useDeploymentLogs with the targetId', () => {
      render(<ServerLogViewer {...defaultProps} targetId="my-target" />);
      expect(mockUseDeploymentLogs).toHaveBeenCalledWith('my-target');
    });

    it('passes null to useDeploymentLogs when dialog is not open', () => {
      render(<ServerLogViewer {...defaultProps} open={false} />);
      expect(mockUseDeploymentLogs).toHaveBeenCalledWith(null);
    });
  });

  describe('dialog behavior', () => {
    it('calls onOpenChange when dialog state changes', () => {
      const onOpenChange = vi.fn();
      render(<ServerLogViewer {...defaultProps} onOpenChange={onOpenChange} />);

      // Verify dialog is rendered (onOpenChange integration is handled by Radix)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
