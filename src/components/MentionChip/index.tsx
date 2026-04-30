import type { CSSProperties, MouseEvent, ReactNode } from 'react';

import { createStyles } from 'antd-style';
import { FileText, Folder, Monitor, X } from 'lucide-react';
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
      return <span style={{ fontSize: 11, lineHeight: 1 }}>🛠</span>;
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
  iconSlotSkill: css`
    color: ${token.colorSuccess};
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
  pillSkill: css`
    border-color: ${token.colorSuccessBorder};
    border-radius: 6px;
    background: ${token.colorSuccessBg};
    color: ${token.colorSuccess};

    &&:hover {
      border-color: ${token.colorSuccess};
      background: ${token.colorSuccessBg};
    }
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

    const isSkill = kind === 'skill';
    const displayLabel = isSkill ? `/${label}` : label;

    const handleRemoveClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove?.();
    };

    return (
      <span
        className={cx(styles.pill, isSkill && styles.pillSkill, removable && styles.pillRemovable, className)}
        contentEditable={false}
        style={style}
        title={title ?? displayLabel}
      >
        <span aria-hidden className={cx(styles.iconSlot, isSkill && styles.iconSlotSkill)}>
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
 * Regex matching `@some-label` at the start of text or after whitespace.
 * Captures the label (letters, digits, hyphens, underscores, dots).
 */
const AT_MENTION_RE = /(?<=^|[\s])@([\w][\w.-]*[\w])/g;

/**
 * Parse message text and replace `@label` patterns with inline MentionChip components.
 *
 * - If `mentionTags` is provided, only those labels are matched (exact match).
 * - If `mentionTags` is not provided, all `@word-word` patterns are auto-detected
 *   and rendered as `plugin` kind chips (works after page refresh without persisted data).
 */
export function renderTextWithMentions(
  text: string,
  mentionTags?: MentionTag[],
): ReactNode[] {
  if (!text) return [text];

  let pattern: RegExp;
  let tagMap: Map<string, MentionTag>;

  if (mentionTags && mentionTags.length > 0) {
    // Exact match mode: only match known labels
    const sorted = [...mentionTags].sort((a, b) => b.label.length - a.label.length);
    const escaped = sorted.map((t) => t.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    pattern = new RegExp(`@(${escaped.join('|')})`, 'g');
    tagMap = new Map(sorted.map((t) => [t.label, t]));
  } else {
    // Auto-detect mode: match any @word-word pattern
    pattern = AT_MENTION_RE;
    tagMap = new Map();
  }

  const result: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let hasMatch = false;

  while ((match = pattern.exec(text)) !== null) {
    hasMatch = true;
    // Text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const tag = tagMap.get(label);
    result.push(
      <MentionChip
        key={`mention-${match.index}`}
        kind={tag?.kind ?? 'plugin'}
        label={label}
        icon={tag?.icon}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (!hasMatch) return [text];

  // Remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

/**
 * Detect a leading `/command` in message text and render it as a skill MentionChip.
 * The rest of the text is returned as-is.
 *
 * When `mentionTags` is provided, the skill label is matched exactly so that
 * `/image-gen9:16` correctly splits into chip `/image-gen` + text `9:16`.
 * Without tags, falls back to a regex that splits on the first non-alpha-hyphen char.
 */
const SLASH_CMD_FALLBACK_RE = /^(\/[a-zA-Z][a-zA-Z-]*)\s*/;

export function renderTextWithSlashCommand(
  text: string,
  mentionTags?: MentionTag[],
): ReactNode[] {
  if (!text) return [text];

  // Try exact match from mentionTags first
  if (mentionTags && mentionTags.length > 0) {
    for (const tag of mentionTags) {
      if (tag.kind !== 'skill') continue;
      const prefix = `/${tag.label}`;
      if (!text.startsWith(prefix)) continue;
      const rest = text.slice(prefix.length).replace(/^\s+/, '');
      const result: ReactNode[] = [
        <MentionChip key="slash-cmd" kind="skill" label={tag.label} icon={tag.icon} />,
      ];
      if (rest) result.push(rest);
      return result;
    }
  }

  // Fallback: letters + hyphens only (no digits) to avoid greedy matching
  const match = text.match(SLASH_CMD_FALLBACK_RE);
  if (!match) return [text];
  const cmd = match[1];
  const rest = text.slice(match[0].length);
  const result: ReactNode[] = [
    <MentionChip key="slash-cmd" kind="skill" label={cmd.slice(1)} />,
  ];
  if (rest) result.push(rest);
  return result;
}

export default MentionChip;
