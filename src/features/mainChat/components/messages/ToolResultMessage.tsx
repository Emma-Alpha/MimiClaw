import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Wrench } from 'lucide-react';

import { extractText } from '../../lib/message-utils';
import type { RawMessage } from '@/stores/chat';
import { useMessageStyles } from './styles';

interface ToolResultMessageProps {
  message: RawMessage;
}

const COLLAPSE_THRESHOLD = 300;

export function ToolResultMessage({ message }: ToolResultMessageProps) {
  const { styles, cx } = useMessageStyles();
  const [expanded, setExpanded] = useState(false);

  const text = extractText(message);
  if (!text) return null;

  const toolName = message.toolName;
  const isError = message.isError;
  const isLong = text.length > COLLAPSE_THRESHOLD;
  const displayText = !expanded && isLong ? `${text.slice(0, COLLAPSE_THRESHOLD)}…` : text;

  return (
    <div className={cx(styles.toolResultCard, isError && styles.toolResultCardError)}>
      <button
        type="button"
        className={styles.toolResultHeader}
        style={!isLong ? { cursor: 'default' } : undefined}
        onClick={() => isLong && setExpanded((v) => !v)}
      >
        {isError ? (
          <AlertCircle style={{ width: 13, height: 13, color: 'var(--ant-color-error)', flexShrink: 0 }} />
        ) : (
          <CheckCircle2 style={{ width: 13, height: 13, color: '#22c55e', flexShrink: 0 }} />
        )}
        <Wrench style={{ width: 11, height: 11, flexShrink: 0, opacity: 0.5 }} />
        {toolName && (
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--mimi-font-size-xs)' }}>
            {toolName}
          </span>
        )}
        <span style={{ fontSize: 'var(--mimi-font-size-xs)', opacity: 0.5 }}>result</span>
        {isLong && (
          <span style={{ marginLeft: 'auto', display: 'flex' }}>
            {expanded
              ? <ChevronDown style={{ width: 11, height: 11 }} />
              : <ChevronRight style={{ width: 11, height: 11 }} />}
          </span>
        )}
      </button>
      <pre className={styles.toolResultBody}>{displayText}</pre>
    </div>
  );
}
