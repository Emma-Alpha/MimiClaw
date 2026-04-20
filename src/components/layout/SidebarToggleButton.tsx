import type { CSSProperties } from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token, css }) => ({
  button: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: ${token.borderRadiusSM}px;
    background: transparent;
    color: ${token.colorTextSecondary};
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: color-mix(in srgb, ${token.colorText} 6%, transparent);
      color: ${token.colorText};
    }
  `,
}));

interface SidebarToggleButtonProps {
  ariaLabel: string;
  className?: string;
  sidebarCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarToggleButton({
  ariaLabel,
  className,
  sidebarCollapsed,
  onToggle,
}: SidebarToggleButtonProps) {
  const { styles, cx } = useStyles();

  return (
    <button
      aria-label={ariaLabel}
      className={cx(styles.button, className)}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      style={{ WebkitAppRegion: 'no-drag' } as CSSProperties}
      title={ariaLabel}
      type="button"
    >
      {sidebarCollapsed ? (
        <PanelLeft style={{ height: 16, width: 16 }} />
      ) : (
        <PanelLeftClose style={{ height: 16, width: 16 }} />
      )}
    </button>
  );
}
