import { Text } from '@lobehub/ui';
import { Divider } from 'antd';
import type { ReactNode } from 'react';

interface SettingHeaderProps {
  extra?: ReactNode;
  leading?: ReactNode;
  title: ReactNode;
}

export function SettingHeader({ title, extra, leading }: SettingHeaderProps) {
  return (
    <div
      style={{
        marginBottom: 32,
        marginInline: 'calc(var(--setting-header-bleed, 0px) * -1)',
        paddingInlineEnd: 'max(var(--setting-header-bleed, 0px), var(--mimi-content-safe-end, 0px))',
        paddingInlineStart: 'max(var(--setting-header-bleed, 0px), var(--mimi-content-safe-start, 0px))',
        paddingTop: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          rowGap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginRight: 'auto', minWidth: 0 }}>
          {leading}
          <Text strong fontSize={24}>
            {title}
          </Text>
        </div>
        {extra ? <div style={{ marginLeft: 'auto' }}>{extra}</div> : null}
      </div>
      <Divider style={{ margin: 0 }} />
    </div>
  );
}
