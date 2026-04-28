import type { IEditorKernel } from '@lobehub/editor/es/types/kernel';
import type { LexicalEditor } from 'lexical';

import { useLexicalComposerContext } from '@lobehub/editor/es/editor-kernel/react/react-context';
import { $getNodeByKey } from 'lexical';
import { memo, useCallback, useEffect, useRef } from 'react';

import MentionChip from '@/components/MentionChip';
import type { MentionChipKind } from '@/components/MentionChip';

interface MentionNodeLike {
  getKey: () => string;
  label: string;
  metadata?: Record<string, unknown>;
}

interface MentionTagProps {
  editor: LexicalEditor;
  node: MentionNodeLike;
}

const MentionTag = memo<MentionTagProps>(({ node, editor }) => {
  const metadata = node.metadata ?? {};
  const kind = (metadata.kind as MentionChipKind | undefined) ?? 'file';
  const icon = metadata.icon as string | undefined;
  const label = node.label || '';
  const pillRef = useRef<HTMLSpanElement>(null);

  // Strip the default mention theme styles from the outer <span> created
  // by MentionNode.createDOM (border, padding, background). Our custom
  // pill already provides its own styling.
  useEffect(() => {
    const outer = pillRef.current?.parentElement;
    if (outer) {
      outer.style.border = 'none';
      outer.style.padding = '0';
      outer.style.margin = '0 4px 0 0';
      outer.style.background = 'none';
      outer.style.display = 'inline-block';
      outer.style.paddingRight = '4px';
    }
  }, []);

  const handleRemove = useCallback(
    () => {
      const key = node.getKey();
      editor.update(() => {
        $getNodeByKey(key)?.remove();
      });
    },
    [editor, node],
  );

  return (
    <span ref={pillRef}>
      <MentionChip
        icon={icon}
        kind={kind}
        label={label}
        onRemove={handleRemove}
        removable
      />
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
