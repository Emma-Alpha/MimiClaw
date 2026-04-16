import { ActionIcon, Button, Flexbox } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { ChevronLeftIcon } from 'lucide-react';
import { type MouseEvent, type PropsWithChildren, type ReactNode, useCallback } from 'react';
import { memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ToggleLeftPanelButton from '../ToggleLeftPanelButton';

const DESKTOP_HEADER_ICON_SIZE = { blockSize: 32, size: 20 };

const styles = createStaticStyles(({ css, cssVar }) => ({
  button: css`
    height: 32px;
    padding-inline-start: 4px;
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};

    &:hover {
      color: ${cssVar.colorText};
    }
  `,
}));

interface BackNavProps extends PropsWithChildren {
  expand?: boolean;
  onToggle?: () => void;
  toggleButton?: ReactNode;
}

const BackLink = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      navigate('/');
    },
    [navigate],
  );

  return (
    <Link to="/" onClick={handleClick}>
      {children}
    </Link>
  );
};

const BackNav = memo<BackNavProps>(({ children, expand, onToggle, toggleButton }) => {
  const leftContent = children ? (
    <Flexbox horizontal align={'center'} gap={4}>
      <BackLink>
        <ActionIcon icon={ChevronLeftIcon} size={DESKTOP_HEADER_ICON_SIZE} />
      </BackLink>
      {children}
    </Flexbox>
  ) : (
    <BackLink>
      <Button className={styles.button} icon={ChevronLeftIcon} type={'text'}>
        返回
      </Button>
    </BackLink>
  );

  return (
    <Flexbox horizontal align={'center'} gap={4} justify={'space-between'} padding={8}>
      {leftContent}
      {toggleButton ?? <ToggleLeftPanelButton expand={expand} onToggle={onToggle} />}
    </Flexbox>
  );
});

export default BackNav;
