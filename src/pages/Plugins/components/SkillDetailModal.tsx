import { Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Modal } from 'antd';
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
  footerButton: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorder};
    background: transparent;
    color: ${cssVar.colorText};
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: ${token.colorPrimary};
    }
  `,
  footerPrimary: css`
    background: ${token.colorPrimary};
    color: ${token.colorWhite};
    border-color: ${token.colorPrimary};

    &:hover {
      opacity: 0.9;
      border-color: ${token.colorPrimary};
    }
  `,
}));

interface SkillDetailModalProps {
  open: boolean;
  skill: PluginSkillEntry | null;
  onClose: () => void;
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
        open={open}
        onCancel={onClose}
        closable={false}
        footer={null}
        width={560}
        centered
        styles={{
          body: { padding: 24 },
        }}
      >
        <Flexbox gap={16}>
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

          {/* Footer */}
          <Flexbox
            horizontal
            justify="flex-end"
            gap={8}
            style={{ marginTop: 8 }}
          >
            <button
              type="button"
              className={styles.footerButton}
              onClick={onClose}
            >
              关闭
            </button>
            {skill.overview && (
              <button
                type="button"
                className={styles.footerButton}
                onClick={handleCopy}
              >
                <Copy size={14} />
                复制内容
              </button>
            )}
          </Flexbox>
        </Flexbox>
      </Modal>
    );
  },
);

export default SkillDetailModal;
