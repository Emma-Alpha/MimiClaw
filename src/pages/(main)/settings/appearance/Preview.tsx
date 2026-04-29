import { Block, Flexbox } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';

const useStyles = createStyles(({ token, css }) => ({
  agent: css`
    padding: 4px;
    border-radius: 4px;
  `,
  agentActive: css`
    background: ${token.colorFillSecondary};
  `,
  bubble: css`
    padding: 6px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 6px;
    background: ${token.colorBgContainer};
  `,
  container: css`
    overflow: hidden;
    width: 332px;
    height: 200px;
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    background: ${token.colorBgLayout};
  `,
  conversation: css`
    background: ${token.colorBgContainer};
  `,
  header: css`
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  icon: css`
    flex: none;
    border-radius: 4px;
    background: ${token.colorFillSecondary};
  `,
  input: css`
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  nav: css`
    padding: 4px;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgLayout};
  `,
  sidebar: css`
    padding: 4px;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgLayout};
  `,
}));

const AgentItem = memo<{ active?: boolean; color?: string }>(({ active, color }) => {
  const { styles } = useStyles();

  return (
    <Flexbox
      horizontal
      align={'center'}
      className={`${styles.agent} ${active ? styles.agentActive : ''}`}
      gap={4}
      width={'100%'}
    >
      <Flexbox
        className={styles.icon}
        height={12}
        style={{ background: color ?? 'var(--ant-color-primary)', borderRadius: '50%' }}
        width={12}
      />
      <Flexbox flex={1} gap={4}>
        <Flexbox className={styles.icon} height={2} width={'66%'} style={{ background: 'var(--ant-color-text-tertiary)' }} />
        <Flexbox className={styles.icon} height={2} width={'100%'} style={{ background: 'var(--ant-color-text-quaternary)' }} />
      </Flexbox>
    </Flexbox>
  );
});

const Preview = memo(() => {
  const { styles } = useStyles();

  return (
    <Block horizontal className={styles.container} shadow variant={'outlined'}>
      <Flexbox align={'center'} className={styles.nav} gap={8} width={24}>
        <Flexbox
          className={styles.icon}
          height={14}
          style={{ border: '2px solid var(--ant-color-primary)', borderRadius: '50%' }}
          width={14}
        />
        <Flexbox className={styles.icon} height={12} width={12} />
        <Flexbox className={styles.icon} height={12} width={12} />
        <Flexbox className={styles.icon} height={12} width={12} />
      </Flexbox>
      <Flexbox className={styles.sidebar} gap={4} width={72}>
        <Flexbox gap={4} paddingInline={2} style={{ paddingTop: 4 }}>
          <Flexbox className={styles.icon} height={8} width={'50%'} />
          <Flexbox className={styles.icon} height={8} style={{ background: 'var(--ant-color-fill-tertiary)' }} width={'100%'} />
        </Flexbox>
        <AgentItem />
        <AgentItem active />
        <AgentItem />
        <AgentItem />
      </Flexbox>
      <Flexbox className={styles.conversation} flex={1}>
        <Flexbox horizontal align={'center'} className={styles.header} justify={'space-between'} padding={4}>
          <Flexbox horizontal align={'center'} gap={4}>
            <Flexbox className={styles.icon} height={12} style={{ borderRadius: '50%' }} width={12} />
            <Flexbox className={styles.icon} height={8} width={32} />
          </Flexbox>
          <Flexbox horizontal gap={2}>
            <Flexbox className={styles.icon} height={10} width={10} />
            <Flexbox className={styles.icon} height={10} width={10} />
          </Flexbox>
        </Flexbox>
        <Flexbox align={'flex-start'} flex={1} gap={8} padding={6}>
          <Flexbox horizontal align={'center'} gap={4} justify={'flex-end'} width={'100%'}>
            <Flexbox className={styles.bubble} gap={4} width={64}>
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'100%'} />
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'66%'} />
            </Flexbox>
            <Flexbox className={styles.icon} height={14} style={{ borderRadius: '50%' }} width={14} />
          </Flexbox>
          <Flexbox horizontal gap={4}>
            <Flexbox className={styles.icon} height={14} style={{ borderRadius: '50%' }} width={14} />
            <Flexbox className={styles.bubble} gap={4} width={160}>
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'100%'} />
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'66%'} />
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'100%'} />
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'100%'} />
              <Flexbox className={styles.icon} height={2} style={{ background: 'var(--ant-color-text-quaternary)' }} width={'33%'} />
            </Flexbox>
          </Flexbox>
        </Flexbox>
        <Flexbox align={'flex-end'} className={styles.input} height={48} justify={'flex-end'} padding={8}>
          <Flexbox className={styles.icon} height={12} style={{ background: 'var(--ant-color-primary)' }} width={32} />
        </Flexbox>
      </Flexbox>
    </Block>
  );
});

export default Preview;
