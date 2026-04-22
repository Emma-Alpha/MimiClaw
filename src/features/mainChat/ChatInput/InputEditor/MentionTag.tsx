import type { IEditorKernel } from '@lobehub/editor/es/types/kernel';
import type { LexicalEditor } from 'lexical';
import type { MouseEvent } from 'react';

import { useLexicalComposerContext } from '@lobehub/editor/es/editor-kernel/react/react-context';
import { createStyles } from 'antd-style';
import { $getNodeByKey } from 'lexical';
import { FileText, Folder, X } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';

interface MentionNodeLike {
  getKey: () => string;
  label: string;
  metadata?: Record<string, unknown>;
}

interface MentionTagProps {
  editor: LexicalEditor;
  node: MentionNodeLike;
}

const useStyles = createStyles(({ css, token }) => ({
  deleteBtn: css`
    all: unset;
    box-sizing: border-box;

    /* visibility is toggled via CSS custom property set by .pill:hover */
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
  fileIcon: css`
    /* visibility toggled via CSS custom property */
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
    /* CSS custom properties drive hover-toggle between icon ↔ delete button */
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

    &:hover {
      --mc-delete-display: flex;
      --mc-icon-display: none;
      border-color: ${token.colorPrimaryBorder};
      background: ${token.colorFillSecondary};
    }
  `,
}));

const MentionTag = memo<MentionTagProps>(({ node, editor }) => {
  const { styles } = useStyles();
  const metadata = node.metadata ?? {};
  const kind = (metadata as { kind?: string }).kind;
  const label = node.label || '';

  const handleDelete = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const key = node.getKey();
      editor.update(() => {
        $getNodeByKey(key)?.remove();
      });
    },
    [editor, node],
  );

  const FileIcon = kind === 'folder' ? Folder : FileText;

  return (
    <span className={styles.pill} contentEditable={false} title={label}>
      <span aria-hidden className={styles.fileIcon}>
        <FileIcon size={12} strokeWidth={1.75} />
      </span>
      <button
        aria-label="Remove mention"
        className={styles.deleteBtn}
        onClick={handleDelete}
        onMouseDown={(e) => e.preventDefault()}
        type="button"
      >
        <X size={12} strokeWidth={2} />
      </button>
      <span className={styles.label}>{label}</span>
    </span>
  );
});

MentionTag.displayName = 'MentionTag';

/**
 * Installs our custom mention pill as the 'mention' decorator, replacing the
 * built-in @lobehub/editor plain-text span.
 *
 * Timing rationale (the key bug fix):
 *   ReactPlainText calls kernel.setRootElement() inside a useEffect — which
 *   is what runs MentionPlugin.constructor and first registers the 'mention'
 *   decorator.  We must therefore also use useEffect (not useLayoutEffect) so
 *   our override fires AFTER setRootElement has run.  Because children of
 *   <Editor> appear after <ReactPlainText> in the sibling list, React
 *   guarantees our useEffect runs after ReactPlainText's.
 */
export const MentionTagDecoratorOverride = memo(() => {
  // lobe-editor stores [kernel, theme] in LexicalComposerContext — the kernel
  // is the IEditorKernel instance, giving us registerDecorator access.
  const context = useLexicalComposerContext() as unknown as [IEditorKernel | null];
  const kernel = context?.[0] ?? null;

  useEffect(() => {
    if (!kernel) return;

    const decorator = ((node: MentionNodeLike, activeEditor: LexicalEditor) => (
      <MentionTag editor={activeEditor} node={node} />
    )) as unknown as Parameters<typeof kernel.registerDecorator>[1];

    kernel.unregisterDecorator('mention');
    kernel.registerDecorator('mention', decorator);

    return () => {
      kernel.unregisterDecorator('mention');
    };
  }, [kernel]);

  return null;
});

MentionTagDecoratorOverride.displayName = 'MentionTagDecoratorOverride';
