import { SpellCheck2 } from 'lucide-react';
import { useCallback } from 'react';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function TypoAction() {
  const { setExpanded } = useChatInputContext();

  const handleClick = useCallback(() => {
    setExpanded(true);
  }, [setExpanded]);

  return <ActionWrapper icon={SpellCheck2} onClick={handleClick} title="Typo" />;
}
