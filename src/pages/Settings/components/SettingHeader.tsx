import { Text } from '@lobehub/ui';
import { Divider } from 'antd';
import type { ReactNode } from 'react';

interface SettingHeaderProps {
  extra?: ReactNode;
  title: ReactNode;
}

export function SettingHeader({ title, extra }: SettingHeaderProps) {
  return (
    <div style={{ paddingTop: 12, marginBottom: 32 }}>
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
        <Text strong fontSize={24} style={{ marginRight: 'auto' }}>
          {title}
        </Text>
        {extra ? <div style={{ marginLeft: 'auto' }}>{extra}</div> : null}
      </div>
      <Divider style={{ margin: 0 }} />
    </div>
  );
}
