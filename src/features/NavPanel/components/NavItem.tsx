import { type BlockProps, type GenericItemType, type IconProps } from '@lobehub/ui';
import { Block, Center, ContextMenuTrigger, Flexbox, Icon, Text } from '@lobehub/ui';
import { createStaticStyles, cssVar, cx } from 'antd-style';
import { type ReactNode } from 'react';
import { memo } from 'react';

import NeuralNetworkLoading from './NeuralNetworkLoading';

const ACTION_CLASS_NAME = 'nav-item-actions';
const ICON_DEFAULT_CLASS = 'nav-item-icon-default';
const ICON_HOVER_CLASS = 'nav-item-icon-hover';

const styles = createStaticStyles(({ css }) => ({
  container: css`
    user-select: none;
    overflow: hidden;
    min-width: 32px;
    border-radius: 12px;
    border: 1px solid transparent;
    transition:
      background-color 0.16s ${cssVar.motionEaseOut},
      border-color 0.16s ${cssVar.motionEaseOut},
      box-shadow 0.16s ${cssVar.motionEaseOut};

    .${ACTION_CLASS_NAME} {
      width: 0;
      margin-inline-end: 2px;
      opacity: 0;
      transition: opacity 0.2s ${cssVar.motionEaseOut};

      &:has([data-popup-open]) {
        width: unset;
        opacity: 1;
      }
    }

    .${ICON_HOVER_CLASS} {
      opacity: 0;
      position: absolute;
      transition: opacity 0.15s ${cssVar.motionEaseOut};
    }

    .${ICON_DEFAULT_CLASS} {
      opacity: 1;
      transition: opacity 0.15s ${cssVar.motionEaseOut};
    }

    &:hover {
      .${ACTION_CLASS_NAME} {
        width: unset;
        opacity: 1;
      }

      .${ICON_DEFAULT_CLASS} {
        opacity: 0;
      }

      .${ICON_HOVER_CLASS} {
        opacity: 1;
      }
    }
  `,
  idle: css`
    background: transparent;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 5%, transparent);
      border-color: transparent;
    }
  `,
  active: css`
    background: color-mix(in oklab, ${cssVar.colorText} 10%, transparent);
    border-color: transparent;
    box-shadow: none;

    &:hover {
      background: color-mix(in oklab, ${cssVar.colorText} 10%, transparent);
    }
  `,
  iconWrap: css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  `,
}));

export interface NavItemSlots {
  iconPostfix?: ReactNode;
  titlePrefix?: ReactNode;
}

export interface NavItemProps extends Omit<BlockProps, 'children' | 'title'> {
  actions?: ReactNode;
  active?: boolean;
  contextMenuItems?: GenericItemType[] | (() => GenericItemType[]);
  disabled?: boolean;
  extra?: ReactNode;
  /**
   * Optional href for cmd+click to open in new tab
   */
  href?: string;
  icon?: IconProps['icon'];
  /**
   * 鼠标悬浮时替换左侧 icon 显示的图标，不传则不切换
   */
  iconHover?: IconProps['icon'];
  iconSize?: number;
  inactiveTone?: 'muted' | 'title';
  loading?: boolean;
  slots?: NavItemSlots;
  title: ReactNode;
}

const NavItem = memo<NavItemProps>(
  ({
    className,
    actions,
    contextMenuItems,
    active,
    href,
    icon,
    iconHover,
    iconSize = 18,
    inactiveTone = 'muted',
    title,
    onClick,
    disabled,
    loading,
    extra,
    slots,
    ...rest
  }) => {
    const inactiveColor = inactiveTone === 'title' ? cssVar.colorText : cssVar.colorTextSecondary;
    const iconColor = active ? cssVar.colorText : inactiveColor;
    const textColor = active ? cssVar.colorText : inactiveColor;

    const { titlePrefix, iconPostfix } = slots || {};

    const linkProps = href
      ? {
          as: 'a' as const,
          href,
          style: { color: 'inherit', textDecoration: 'none' },
        }
      : {};

    const Content = (
      <Block
        horizontal
        align={'center'}
        className={cx(
          styles.container,
          active ? styles.active : styles.idle,
          className,
        )}
        clickable={!disabled}
        gap={8}
        height={34}
        paddingInline={6}
        variant={'borderless'}
        onClick={(e) => {
          if (href && !(e.metaKey || e.ctrlKey)) {
            e.preventDefault();
          }
          if (disabled) return;
          onClick?.(e);
        }}
        {...linkProps}
        {...rest}
      >
        {icon && (
          <Center flex={'none'} height={28} width={28} className={iconHover ? styles.iconWrap : undefined}>
            {loading ? (
              <NeuralNetworkLoading size={iconSize} />
            ) : iconHover ? (
              <>
                <span className={ICON_DEFAULT_CLASS}>
                  <Icon color={iconColor} icon={icon} size={iconSize} />
                </span>
                <span className={ICON_HOVER_CLASS}>
                  <Icon color={iconColor} icon={iconHover} size={iconSize} />
                </span>
              </>
            ) : (
              <Icon color={iconColor} icon={icon} size={iconSize} />
            )}
          </Center>
        )}

        {iconPostfix}
        <Flexbox horizontal align={'center'} flex={1} gap={8} style={{ overflow: 'hidden' }}>
          {titlePrefix}
          <Text
            color={textColor}
            style={{ flex: 1 }}
            ellipsis={{
              tooltipWhenOverflow: true,
            }}
          >
            {title}
          </Text>
          <Flexbox
            horizontal
            align={'center'}
            gap={2}
            justify={'flex-end'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {extra}
            {actions && (
              <Flexbox
                horizontal
                align={'center'}
                className={ACTION_CLASS_NAME}
                gap={2}
                justify={'flex-end'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {actions}
              </Flexbox>
            )}
          </Flexbox>
        </Flexbox>
      </Block>
    );

    if (!contextMenuItems) return Content;
    return <ContextMenuTrigger items={contextMenuItems}>{Content}</ContextMenuTrigger>;
  },
);

export default NavItem;
