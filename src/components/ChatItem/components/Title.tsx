import { Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { memo } from 'react';
import { type MetaData } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

export interface TitleProps {
  avatar: MetaData;
  showTitle?: boolean;
  time?: number;
}

const Title = memo<TitleProps>(({ showTitle, time, avatar }) => {
  const title = avatar.title || '未命名';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {showTitle && (
        <Text strong style={{ fontSize: 14 }}>
          {title}
        </Text>
      )}
      {time && (
        <Text
          type="secondary"
          style={{ fontSize: 12 }}
          title={dayjs(time).format('YYYY-MM-DD HH:mm:ss')}
        >
          {dayjs(time).fromNow()}
        </Text>
      )}
    </div>
  );
});

Title.displayName = 'ChatItemTitle';

export default Title;
