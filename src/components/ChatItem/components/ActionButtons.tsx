import { ActionIcon } from '@lobehub/ui';
import { Copy, Trash2, RotateCcw } from 'lucide-react';
import { memo } from 'react';

export interface ActionButtonsProps {
  text?: string;
  onCopy?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

const ActionButtons = memo<ActionButtonsProps>(
  ({ text, onCopy, onDelete, onRegenerate, showRegenerate }) => {
    const handleCopy = () => {
      if (text) {
        navigator.clipboard.writeText(text);
      }
      onCopy?.();
    };

    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {text && (
          <ActionIcon
            icon={Copy}
            title="复制"
            size="small"
            onClick={handleCopy}
          />
        )}
        {showRegenerate && (
          <ActionIcon
            icon={RotateCcw}
            title="重新生成"
            size="small"
            onClick={onRegenerate}
          />
        )}
        {onDelete && (
          <ActionIcon
            icon={Trash2}
            title="删除"
            size="small"
            onClick={onDelete}
          />
        )}
      </div>
    );
  },
);

ActionButtons.displayName = 'ActionButtons';

export default ActionButtons;
