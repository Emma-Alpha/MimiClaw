import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import { createStyles } from 'antd-style';
import { FileText, Folder, Monitor, Puzzle, X } from 'lucide-react';
import { memo } from 'react';

// ─── types ──────────────────────────────────────────────────────────────────

export type MentionChipKind = 'plugin' | 'folder' | 'file' | 'skill' | 'agent';

/** Serializable mention tag stored alongside messages for display. */
export interface MentionTag {
  kind: MentionChipKind;
  label: string;
  icon?: string;
}

export interface MentionChipProps {
  /** Semantic kind — drives fallback icon when `icon` is not provided */
  kind: MentionChipKind;
  /** Display label text */
  label: string;
  /** Icon: URL string, emoji string, or undefined (falls back to kind-based icon) */
  icon?: string;
  /** Whether to show a remove/X button (editor contexts only) */
  removable?: boolean;
  /** Called when the remove button is clicked */
  onRemove?: () => void;
  /** Tooltip text (e.g. absolute path) */
  title?: string;
  /** Additional className */
  className?: string;
  /** Additional inline style */
  style?: CSSProperties;
}

// ─── icon resolution ────────────────────────────────────────────────────────

const IMAGE_ICON_RE = /^(https?:\/\/|data:image\/|\/)/i;
const ICON_SIZE = 12;

export function resolveMentionIcon(
  kind: MentionChipKind | string | undefined,
  icon?: string,
): ReactNode {
  // Priority 1: explicit icon prop
  if (icon) {
    if (IMAGE_ICON_RE.test(icon)) {
      return (
        <img
          alt=""
          src={icon}
          style={{
            borderRadius: 2,
            height: ICON_SIZE,
            objectFit: 'contain',
            width: ICON_SIZE,
          }}
        />
      );
    }
    // Treat as emoji / text icon
    return <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>;
  }

  // Priority 2: kind-based fallback
  switch (kind) {
    case 'folder':
      return <Folder size={ICON_SIZE} strokeWidth={1.75} />;
    case 'skill':
      return <Puzzle size={ICON_SIZE} strokeWidth={1.75} />;
    case 'plugin':
    case 'agent':
      return <Monitor size={ICON_SIZE} strokeWidth={1.75} />;
    case 'file':
    default:
      return <FileText size={ICON_SIZE} strokeWidth={1.75} />;
  }
}

// ─── styles ─────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
  deleteBtn: css`
    all: unset;
    box-sizing: border-box;
    display: var(--mc-delete-display, none);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    border-radius: ${token.borderRadiusSM}px;
    color: ${token.colorTextSecondary};

    &:hover {
      color: ${token.colorError};
      background: ${token.colorErrorBg};
    }
  `,
  iconSlot: css`
    display: var(--mc-icon-display, flex);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: ${token.colorTextTertiary};
  `,
  label: css`
    overflow: hidden;
    min-width: 0;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  `,
  pill: css`
    --mc-delete-display: none;
    --mc-icon-display: flex;

    display: inline-flex;
    align-items: center;
    gap: ${token.marginXXS}px;
    padding: 2px 6px 2px 4px;

    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadiusSM}px;
    background: ${token.colorFillTertiary};
    color: ${token.colorText};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.4;

    cursor: default;
    user-select: none;
    vertical-align: middle;
    margin-inline: 2px;
  `,
  pillRemovable: css`
    &:hover {
      --mc-delete-display: flex;
      --mc-icon-display: none;
      border-color: ${token.colorPrimaryBorder};
      background: ${token.colorFillSecondary};
    }
  `,
}));

// ─── component ──────────────────────────────────────────────────────────────

const MentionChip = memo<MentionChipProps>(
  ({ kind, label, icon, removable, onRemove, title, className, style }) => {
    const { styles, cx } = useStyles();

    const displayLabel = kind === 'skill' ? `/${label}` : label;

    const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove?.();
    };

    return (
      <span
        className={cx(styles.pill, removable && styles.pillRemovable, className)}
        contentEditable={false}
        style={style}
        title={title ?? displayLabel}
      >
        <span aria-hidden className={styles.iconSlot}>
          {resolveMentionIcon(kind, icon)}
        </span>
        {removable && (
          <button
            aria-label="Remove mention"
            className={styles.deleteBtn}
            onClick={handleRemoveClick}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
        <span className={styles.label}>{displayLabel}</span>
      </span>
    );
  },
);

MentionChip.displayName = 'MentionChip';

/**
 * Parse message text and replace `@label` patterns (matching provided mentionTags)
 * with inline MentionChip components. Returns an array of ReactNode.
 */
export function renderTextWithMentions(
  text: string,
  mentionTags?: MentionTag[],
): ReactNode[] {
  if (!mentionTags || mentionTags.length === 0 || !text) {
    return [text];
  }

  // Build regex that matches any @label in the text, longest first to avoid partial matches
  const sorted = [...mentionTags].sort((a, b) => b.label.length - a.label.length);
  const escaped = sorted.map((t) => t.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`@(${escaped.join('|')})`, 'g');

  const tagMap = new Map(sorted.map((t) => [t.label, t]));
  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const tag = tagMap.get(label);
    if (tag) {
      result.push(
        <MentionChip
          key={`mention-${match.index}`}
          kind={tag.kind}
          label={tag.label}
          icon={tag.icon}
        />,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export default MentionChip;
