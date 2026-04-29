import { Atom } from 'lucide-react';
import { createStyles } from 'antd-style';
import { useCallback, useState } from 'react';
import type { ThinkingLevel } from '../../store';
import { chatInputStoreSelectors, useChatInputStore } from '../../store';
import { useChatStore } from '@/stores/chat';
import { ActionWrapper } from './ActionWrapper';

const THINKING_LEVELS: { description: string; key: ThinkingLevel; label: string }[] = [
  { description: 'No extended thinking', key: 'none', label: 'Off' },
  { description: 'Quick reasoning', key: 'low', label: 'Low' },
  { description: 'Balanced reasoning', key: 'medium', label: 'Medium' },
  { description: 'Deep reasoning', key: 'high', label: 'High' },
];

const useStyles = createStyles(({ css, token }) => ({
  item: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    transition: background 120ms ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillSecondary};
    }

    &[data-selected='true'] {
      background: ${token.colorPrimaryBg};
    }
  `,
  itemDescription: css`
    font-size: 12px;
    color: ${token.colorTextTertiary};
  `,
  itemLabel: css`
    font-size: 13px;
    font-weight: 500;
    color: ${token.colorText};
  `,
  panel: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 200px;
  `,
  title: css`
    padding: 4px 12px 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${token.colorTextQuaternary};
  `,
}));

export function ThinkingAction() {
  const { styles } = useStyles();
  const globalThinkingLevel = useChatInputStore(chatInputStoreSelectors.thinkingLevel);
  const setGlobalThinkingLevel = useChatInputStore((s) => s.setThinkingLevel);

  // Dedicated session config store — guaranteed reactive
  const sessionThinkingLevel = useChatStore((s) => s.sessionThinkingLevel);
  const thinkingLevel = sessionThinkingLevel ?? globalThinkingLevel;

  const [open, setOpen] = useState(false);
  const isActive = thinkingLevel !== 'none';

  const handleSelect = useCallback((level: ThinkingLevel) => {
    if (useChatStore.getState().sessionId) {
      useChatStore.getState().setSessionThinkingLevel(level);
    } else {
      setGlobalThinkingLevel(level);
    }
    setOpen(false);
  }, [setGlobalThinkingLevel]);

  const popoverContent = (
    <div className={styles.panel}>
      <div className={styles.title}>Thinking Level</div>
      {THINKING_LEVELS.map((level) => (
        <div
          className={styles.item}
          data-selected={thinkingLevel === level.key}
          key={level.key}
          onClick={() => handleSelect(level.key)}
        >
          <div className={styles.itemLabel}>{level.label}</div>
          <div className={styles.itemDescription}>{level.description}</div>
        </div>
      ))}
    </div>
  );

  return (
    <ActionWrapper
      active={isActive}
      icon={Atom}
      onPopoverOpenChange={setOpen}
      popoverContent={popoverContent}
      popoverOpen={open}
      title={`Thinking: ${thinkingLevel}`}
    />
  );
}
