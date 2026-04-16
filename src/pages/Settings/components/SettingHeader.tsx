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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Text strong fontSize={24}>{title}</Text>
        {extra}
      </div>
      <Divider style={{ margin: 0 }} />
    </div>
  );
}
