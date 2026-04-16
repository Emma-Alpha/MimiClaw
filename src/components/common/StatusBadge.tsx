/**
 * Status Badge Component
 * Displays connection/state status with color coding
 */
import { Badge } from '@/components/ui/badge';

export type Status = 'connected' | 'disconnected' | 'connecting' | 'error' | 'running' | 'stopped' | 'starting' | 'reconnecting';

interface StatusBadgeProps {
  status: Status;
  label?: string;
  showDot?: boolean;
}

const statusConfig: Record<Status, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive'; dotColor: string }> = {
  connected:    { label: 'Connected',    variant: 'success',     dotColor: '#16a34a' },
  running:      { label: 'Running',      variant: 'success',     dotColor: '#16a34a' },
  disconnected: { label: 'Disconnected', variant: 'secondary',   dotColor: '#9ca3af' },
  stopped:      { label: 'Stopped',      variant: 'secondary',   dotColor: '#9ca3af' },
  connecting:   { label: 'Connecting',   variant: 'warning',     dotColor: '#ca8a04' },
  starting:     { label: 'Starting',     variant: 'warning',     dotColor: '#ca8a04' },
  reconnecting: { label: 'Reconnecting', variant: 'warning',     dotColor: '#ca8a04' },
  error:        { label: 'Error',        variant: 'destructive',  dotColor: '#dc2626' },
};

export function StatusBadge({ status, label, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  return (
    <Badge variant={config.variant} style={{ gap: 6 }}>
      {showDot && (
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: config.dotColor,
            animation: config.variant === 'warning' ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
          }}
        />
      )}
      {displayLabel}
    </Badge>
  );
}
