import { Button, Flexbox, Modal, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Copy } from 'lucide-react';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

import type { PluginSkillEntry } from '@/types/claude-plugin';

const useStyles = createStyles(({ css, token }) => ({
  header: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  iconBox: css`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: ${token.colorFillSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  `,
  badge: css`
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 999px;
    background: ${token.colorFillTertiary};
    color: ${cssVar.colorTextSecondary};
    flex-shrink: 0;
  `,
  sectionTitle: css`
    font-size: 12px;
    font-weight: 600;
    color: ${cssVar.colorTextTertiary};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 16px;
  `,
  overview: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.7;
    white-space: pre-wrap;
    max-height: 300px;
    overflow-y: auto;
    padding: 12px;
    border-radius: 10px;
    background: ${token.colorFillQuaternary};
  `,
}));

interface SkillDetailModalProps {
  onClose: () => void;
  open: boolean;
  skill: PluginSkillEntry | null;
}

const SkillDetailModal = memo<SkillDetailModalProps>(
  ({ open, skill, onClose }) => {
    const { styles } = useStyles();

    const handleCopy = useCallback(() => {
      if (!skill?.overview) return;
      navigator.clipboard.writeText(skill.overview).then(
        () => toast.success('已复制内容'),
        () => toast.error('复制失败'),
      );
    }, [skill]);

    if (!skill) return null;

    return (
      <Modal
        footer={
          <Flexbox horizontal justify="flex-end" gap={8}>
            <Button onClick={onClose}>关闭</Button>
            {skill.overview && (
              <Button
                icon={<Copy size={14} />}
                onClick={handleCopy}
              >
                复制内容
              </Button>
            )}
          </Flexbox>
        }
        maskClosable
        onCancel={onClose}
        open={open}
        title="包含内容"
        width={560}
      >
        <Flexbox gap={16} style={{ padding: '8px 0' }}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.iconBox}>🛠</div>
            <Flexbox flex={1} gap={2}>
              <Flexbox horizontal align="center" gap={8}>
                <Text weight={600} style={{ fontSize: 16 }}>
                  {skill.name}
                </Text>
                {skill.badge && (
                  <span className={styles.badge}>{skill.badge}</span>
                )}
              </Flexbox>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {skill.description}
              </Text>
            </Flexbox>
          </div>

          {/* Overview */}
          {skill.overview && (
            <>
              <span className={styles.sectionTitle}>Overview</span>
              <div className={styles.overview}>{skill.overview}</div>
            </>
          )}
        </Flexbox>
      </Modal>
    );
  },
);

export default SkillDetailModal;
