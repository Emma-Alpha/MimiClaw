import { ActionIcon, Flexbox } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Switch } from 'antd';
import { Check, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { memo } from 'react';

import PluginAvatar from '@/components/Plugins/PluginAvatar';

const ACTION_CLASS = 'plugin-card-actions';

const useStyles = createStyles(({ css, token }) => ({
  card: css`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border-radius: 16px;
    border: 1px solid color-mix(in srgb, ${token.colorBorder} 40%, transparent);
    transition: background-color 0.15s;
    cursor: pointer;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 5%, transparent);
    }

    .${ACTION_CLASS}-trash {
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.15s;
    }

    &:hover .${ACTION_CLASS}-trash {
      visibility: visible;
      opacity: 1;
    }
  `,
  cardNonClickable: css`
    cursor: default;
  `,
  icon: css`
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
  `,
  content: css`
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
  `,
  titleRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  title: css`
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  badge: css`
    flex-shrink: 0;
    font-size: 11px;
    color: ${cssVar.colorTextDescription};
  `,
  description: css`
    font-size: 12px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  statusIcon: css`
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${token.colorSuccess};
  `,
}));

// ─── action variants ─────────────────────────────────────────────────────────

export type CardActionMode = 'toggle' | 'status' | 'install';

interface PluginCardProps {
  actionMode?: CardActionMode;
  badges?: string[];
  checked?: boolean;
  description?: string;
  icon?: string;
  onClick?: () => void;
  onInstall?: () => void;
  onToggle?: (checked: boolean) => void;
  onUninstall?: () => void;
  title: string;
  extra?: ReactNode;
}

const PluginCard = memo<PluginCardProps>(
  ({
    title,
    description,
    icon,
    badges,
    actionMode = 'status',
    checked,
    onClick,
    onToggle,
    onUninstall,
    onInstall,
    extra,
  }) => {
    const { styles, cx } = useStyles();

    const actionArea = (() => {
      switch (actionMode) {
        case 'toggle':
          return (
            <Flexbox horizontal align="center" gap={4}>
              {onUninstall && (
                <span className={`${ACTION_CLASS}-trash`}>
                  <ActionIcon
                    icon={Trash2}
                    size={{ blockSize: 28, size: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUninstall();
                    }}
                  />
                </span>
              )}
              <Switch
                size="small"
                checked={checked}
                onChange={(val, e) => {
                  e.stopPropagation();
                  onToggle?.(val);
                }}
              />
            </Flexbox>
          );
        case 'install':
          return (
            <ActionIcon
              icon={Plus}
              size={{ blockSize: 28, size: 14 }}
              onClick={(e) => {
                e.stopPropagation();
                onInstall?.();
              }}
            />
          );
        case 'status':
        default:
          return checked ? (
            <span className={styles.statusIcon}>
              <Check size={16} />
            </span>
          ) : extra ? (
            extra
          ) : null;
      }
    })();

    return (
      <div
        className={cx(styles.card, !onClick && styles.cardNonClickable)}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <Flexbox horizontal align="center" gap={10} style={{ minWidth: 0 }}>
          <div className={styles.icon}>
            <PluginAvatar
              avatar={icon || 'MCP_AVATAR'}
              size={32}
              style={{ borderRadius: 6 }}
            />
          </div>
          <div className={styles.content}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{title}</span>
              {badges?.map((b) => (
                <span key={b} className={styles.badge}>
                  {b}
                </span>
              ))}
            </div>
            {description && (
              <div className={styles.description}>{description}</div>
            )}
          </div>
          {actionArea && (
            <Flexbox
              horizontal
              align="center"
              gap={4}
              style={{ flexShrink: 0 }}
            >
              {actionArea}
            </Flexbox>
          )}
        </Flexbox>
      </div>
    );
  },
);

export default PluginCard;
