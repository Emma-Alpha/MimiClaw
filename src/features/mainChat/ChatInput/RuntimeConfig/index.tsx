import { Tag } from '@lobehub/ui';
import { useMemo } from 'react';
import { useSettingsStore } from '@/stores/settings';

export function RuntimeConfig() {
  const remoteGatewayUrl = useSettingsStore((s) => s.remoteGatewayUrl);
  const autoApproveTools = useSettingsStore((s) => s.preference.autoApproveTools);

  const runtimeLabel = useMemo(() => (remoteGatewayUrl ? 'Cloud' : 'Local'), [remoteGatewayUrl]);

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Tag>{runtimeLabel}</Tag>
      <Tag>{autoApproveTools ? 'Auto Approve On' : 'Auto Approve Off'}</Tag>
    </div>
  );
}
