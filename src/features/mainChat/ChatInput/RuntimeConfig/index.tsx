import { Tag } from '@lobehub/ui';
import { useMemo } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { chatInputStoreSelectors, useChatInputStore } from '../store';

export function RuntimeConfig() {
  const remoteGatewayUrl = useSettingsStore((s) => s.remoteGatewayUrl);
  const autoApproveTools = useSettingsStore((s) => s.preference.autoApproveTools);
  const storeLeftLabel = useChatInputStore(chatInputStoreSelectors.runtimeLeftLabel);
  const storeRightLabel = useChatInputStore(chatInputStoreSelectors.runtimeRightLabel);

  const defaultLeftLabel = useMemo(() => (remoteGatewayUrl ? 'Cloud' : 'Local'), [remoteGatewayUrl]);
  const defaultRightLabel = autoApproveTools ? 'Auto Approve On' : 'Auto Approve Off';

  const leftLabel = storeLeftLabel ?? defaultLeftLabel;
  const rightLabel = storeRightLabel ?? defaultRightLabel;

  return (
    <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}>
      <Tag>{leftLabel}</Tag>
      <Tag>{rightLabel}</Tag>
    </div>
  );
}
