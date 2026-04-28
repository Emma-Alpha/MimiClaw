import { AccordionItem, ActionIcon, Block, Flexbox, Highlighter, Icon, Tabs, type TabsProps } from '@lobehub/ui';
import { useTheme } from 'antd-style';
import {
  Check,
  CircleAlertIcon,
  FunctionSquareIcon,
  LucideBug,
  LucideBugOff,
  Loader2,
  MessageSquareCodeIcon,
  SquareArrowDownIcon,
  X,
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';

// ─── Status Indicator ──────────────────────────────────────────────

interface StatusIndicatorProps {
  hasError?: boolean;
  hasResult?: boolean;
}

const StatusIndicator = memo<StatusIndicatorProps>(({ hasError, hasResult }) => {
  const token = useTheme();

  let icon;
  if (hasError) {
    icon = <Icon color={token.colorError} icon={X} />;
  } else if (hasResult) {
    icon = <Icon color={token.colorSuccess} icon={Check} />;
  } else {
    icon = (
      <Loader2
        style={{
          width: 14,
          height: 14,
          animation: 'spin 1s linear infinite',
        }}
      />
    );
  }

  return (
    <Block
      horizontal
      align={'center'}
      flex={'none'}
      gap={4}
      height={24}
      justify={'center'}
      variant={'outlined'}
      width={24}
      style={{ fontSize: 12 }}
    >
      {icon}
    </Block>
  );
});

// ─── Tool Title ────────────────────────────────────────────────────

const MAX_PARAMS = 1;
const MAX_VALUE_LENGTH = 50;

const truncateValue = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength) + '...';
};

const formatParamValue = (value: unknown): string => {
  if (typeof value === 'string') return truncateValue(value, MAX_VALUE_LENGTH);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return truncateValue(JSON.stringify(value), MAX_VALUE_LENGTH);
  if (typeof value === 'object' && value !== null)
    return truncateValue(JSON.stringify(value), MAX_VALUE_LENGTH);
  return String(value);
};

interface ToolTitleProps {
  args?: Record<string, unknown>;
  isLoading?: boolean;
  name: string;
}

const ToolTitle = memo<ToolTitleProps>(({ name, args, isLoading }) => {
  const token = useTheme();

  const params = useMemo(() => {
    if (!args || typeof args !== 'object') return [];
    return Object.entries(args).slice(0, MAX_PARAMS);
  }, [args]);

  const remainingCount = useMemo(() => {
    if (!args || typeof args !== 'object') return 0;
    const total = Object.keys(args).length;
    return total > MAX_PARAMS ? total - MAX_PARAMS : 0;
  }, [args]);

  return (
    <div
      style={{
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: 1,
        fontSize: 13,
        lineHeight: '20px',
        color: token.colorTextDescription,
        ...(isLoading
          ? {
              background: `linear-gradient(90deg, ${token.colorTextSecondary} 0%, ${token.colorTextQuaternary} 50%, ${token.colorTextSecondary} 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shinyText 2s linear infinite',
            }
          : undefined),
      }}
    >
      <span style={{ fontFamily: token.fontFamilyCode, fontWeight: 500, color: token.colorText }}>
        {name}
      </span>
      {params.length > 0 && (
        <span style={{ fontFamily: token.fontFamilyCode, fontSize: 12 }}>
          <span style={{ color: token.colorTextTertiary }}>{' ('}</span>
          {params.map(([key, value], index) => (
            <span key={key}>
              <span style={{ color: token.colorTextTertiary }}>{key}:</span>
              <span style={{ color: token.colorTextSecondary }}>{formatParamValue(value)}</span>
              {index < params.length - 1 && <span style={{ color: token.colorTextTertiary }}>, </span>}
            </span>
          ))}
          {remainingCount > 0 && (
            <span style={{ color: token.colorTextTertiary }}> +{remainingCount}</span>
          )}
          <span style={{ color: token.colorTextTertiary }}>{')'}</span>
        </span>
      )}
    </div>
  );
});

// ─── Debug Panel ───────────────────────────────────────────────────

interface DebugPanelProps {
  name: string;
  requestArgs?: string;
  result?: string | null;
  resultError?: boolean;
  toolCallId?: string;
}

const DebugPanel = memo<DebugPanelProps>(({ name, requestArgs, result, resultError, toolCallId }) => {
  const params = useMemo(() => {
    try {
      return JSON.stringify(JSON.parse(requestArgs || '{}'), null, 2);
    } catch {
      return requestArgs || '';
    }
  }, [requestArgs]);

  const isJsonResult = result?.trim().startsWith('{') || result?.trim().startsWith('[');

  const formattedResult = useMemo(() => {
    if (!result) return '';
    if (isJsonResult) {
      try {
        return JSON.stringify(JSON.parse(result), null, 2);
      } catch {
        return result;
      }
    }
    return result;
  }, [result, isJsonResult]);

  const functionCall = useMemo(
    () =>
      JSON.stringify(
        { name, arguments: requestArgs, id: toolCallId },
        null,
        2,
      ),
    [name, requestArgs, toolCallId],
  );

  const items: TabsProps['items'] = useMemo(
    () =>
      [
        {
          children: (
            <Highlighter
              language={'json'}
              style={{ background: 'transparent', borderRadius: 0, height: '100%' }}
              variant={'filled'}
            >
              {params}
            </Highlighter>
          ),
          icon: <Icon icon={MessageSquareCodeIcon} />,
          key: 'arguments',
          label: 'Arguments',
        },
        result != null
          ? {
              children: (
                <Highlighter
                  language={isJsonResult ? 'json' : 'plaintext'}
                  style={{ background: 'transparent', borderRadius: 0, height: '100%' }}
                  variant={'filled'}
                >
                  {formattedResult}
                </Highlighter>
              ),
              icon: <Icon icon={SquareArrowDownIcon} />,
              key: 'response',
              label: 'Response',
            }
          : null,
        {
          children: (
            <Highlighter
              language={'json'}
              style={{ background: 'transparent', borderRadius: 0, height: '100%' }}
              variant={'filled'}
            >
              {functionCall}
            </Highlighter>
          ),
          icon: <Icon icon={FunctionSquareIcon} />,
          key: 'function_call',
          label: 'Function Call',
        },
        resultError && result
          ? {
              children: (
                <Highlighter
                  language={'plaintext'}
                  style={{ background: 'transparent', borderRadius: 0, height: '100%' }}
                  variant={'filled'}
                >
                  {result}
                </Highlighter>
              ),
              icon: <Icon icon={CircleAlertIcon} />,
              key: 'error',
              label: 'Error',
            }
          : null,
      ].filter(Boolean) as TabsProps['items'],
    [params, result, isJsonResult, formattedResult, functionCall, resultError],
  );

  return (
    <Block variant={'outlined'}>
      <Tabs
        compact
        items={items}
        tabPlacement={'start'}
        styles={{
          content: {
            height: 300,
            padding: 0,
          },
        }}
      />
    </Block>
  );
});

// ─── Result Content ────────────────────────────────────────────────

interface ResultContentProps {
  result: string;
}

const ResultContent = memo<ResultContentProps>(({ result }) => {
  const isJson = result.trim().startsWith('{') || result.trim().startsWith('[');

  const formatted = useMemo(() => {
    if (!isJson) return result;
    try {
      return JSON.stringify(JSON.parse(result), null, 2);
    } catch {
      return result;
    }
  }, [result, isJson]);

  return (
    <Highlighter
      language={isJson ? 'json' : 'plaintext'}
      style={{ background: 'transparent', borderRadius: 0 }}
      variant={'filled'}
    >
      {formatted}
    </Highlighter>
  );
});

// ─── ToolAccordionItem (for tool_use blocks in assistant messages) ─

export interface ToolAccordionItemProps {
  id: string;
  input: unknown;
  name: string;
}

export const ToolAccordionItem = memo<ToolAccordionItemProps>(({ id, name, input }) => {
  const [showDebug, setShowDebug] = useState(false);

  const args = typeof input === 'object' && input !== null
    ? (input as Record<string, unknown>)
    : undefined;

  const requestArgsStr = useMemo(() => {
    try {
      return JSON.stringify(input ?? {});
    } catch {
      return '{}';
    }
  }, [input]);

  return (
    <AccordionItem
      defaultExpand={false}
      itemKey={id || name}
      paddingBlock={4}
      paddingInline={4}
      title={
        <Flexbox horizontal align={'center'} gap={6} style={{ width: '100%' }}>
          <StatusIndicator hasResult />
          <ToolTitle name={name} args={args} />
          <ActionIcon
            icon={showDebug ? LucideBugOff : LucideBug}
            onClick={(e) => { e.stopPropagation(); setShowDebug((v) => !v); }}
            size={'small'}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          />
        </Flexbox>
      }
    >
      <Flexbox gap={8} paddingBlock={8}>
        {showDebug ? (
          <DebugPanel
            name={name}
            requestArgs={requestArgsStr}
            toolCallId={id}
          />
        ) : (
          <Highlighter
            language={'json'}
            style={{ background: 'transparent', borderRadius: 0 }}
            variant={'filled'}
          >
            {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
          </Highlighter>
        )}
      </Flexbox>
    </AccordionItem>
  );
});

ToolAccordionItem.displayName = 'ToolAccordionItem';

// ─── ToolResultAccordionItem (for toolresult messages) ─────────────

export interface ToolResultAccordionItemProps {
  isError?: boolean;
  result: string;
  toolCallId?: string;
  toolName?: string;
}

export const ToolResultAccordionItem = memo<ToolResultAccordionItemProps>(
  ({ toolName, result, isError, toolCallId }) => {
    const [showDebug, setShowDebug] = useState(false);
    const name = toolName || 'tool';

    return (
      <AccordionItem
        defaultExpand={false}
        itemKey={toolCallId || name}
        paddingBlock={4}
        paddingInline={4}
        title={
          <Flexbox horizontal align={'center'} gap={6} style={{ width: '100%' }}>
            <StatusIndicator hasResult hasError={isError} />
            <ToolTitle name={name} />
            <ActionIcon
              icon={showDebug ? LucideBugOff : LucideBug}
              onClick={(e) => { e.stopPropagation(); setShowDebug((v) => !v); }}
              size={'small'}
              style={{ marginLeft: 'auto', flexShrink: 0 }}
            />
          </Flexbox>
        }
      >
        <Flexbox gap={8} paddingBlock={8}>
          {showDebug ? (
            <DebugPanel
              name={name}
              result={result}
              resultError={isError}
              toolCallId={toolCallId}
            />
          ) : (
            <ResultContent result={result} />
          )}
        </Flexbox>
      </AccordionItem>
    );
  },
);

ToolResultAccordionItem.displayName = 'ToolResultAccordionItem';
