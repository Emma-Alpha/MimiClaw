import { Markdown } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { useMemo } from 'react';
import { useEnhancedMarkdownProps, type EnhancedMarkdownProps } from '@/lib/markdown-enhancements';

interface MessageMarkdownProps {
  animated?: boolean;
  children: string;
  className?: string;
  compact?: boolean;
  headerMultiple?: number;
  markdownProps?: EnhancedMarkdownProps;
}

const useStyles = createStyles(({ css }) => ({
  compact: css`
    font-size: 11px;
    line-height: 1.45;

    p {
      margin: 0 0 3px;
    }

    p:last-child {
      margin-bottom: 0;
    }

    code {
      font-size: 10px;
    }

    pre {
      max-height: 88px;
      overflow: auto;
    }
  `,
  normal: css`
    word-break: break-word;
  `,
}));

export function MessageMarkdown({
  animated,
  children,
  className,
  compact = false,
  headerMultiple = 0,
  markdownProps,
}: MessageMarkdownProps) {
  const { cx, styles } = useStyles();
  const enhancedMarkdownProps = useEnhancedMarkdownProps();
  const resolvedMarkdownProps = useMemo(
    () => markdownProps ?? enhancedMarkdownProps,
    [enhancedMarkdownProps, markdownProps],
  );

  return (
    <Markdown
      animated={animated}
      className={cx(compact ? styles.compact : styles.normal, className)}
      headerMultiple={headerMultiple}
      variant="chat"
      {...resolvedMarkdownProps}
    >
      {children || ' '}
    </Markdown>
  );
}

