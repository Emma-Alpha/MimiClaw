import type { NeutralColors, PrimaryColors } from '@4399ywkf/theme-system';
import { createStyles, cssVar, cx } from 'antd-style';
import { Center, Flexbox, Icon, Tooltip } from '@lobehub/ui';
import { CheckIcon } from 'lucide-react';
import { memo } from 'react';
import { readableColor, rgba } from 'polished';
import { useTranslation } from 'react-i18next';

const PRIMARY_COLORS: Record<PrimaryColors, string> = {
  blue: '#3B82F6',
  cyan: '#4FD6C2',
  geekblue: '#5B6CFF',
  gold: '#FFB021',
  green: '#49CC68',
  lime: '#B7E34B',
  magenta: '#D95CFF',
  orange: '#FF8A34',
  purple: '#9B5CFF',
  red: '#F54E6B',
  volcano: '#F26A4B',
  yellow: '#FFD84D',
} as const;

const NEUTRAL_COLORS: Record<NeutralColors, string> = {
  mauve: '#7F7A85',
  olive: '#7E8173',
  sage: '#7A837E',
  sand: '#8A8478',
  slate: '#6B7280',
} as const;

const useStyles = createStyles(({ css, cssVar: lobeCssVar }) => ({
  active: css`
    box-shadow: inset 0 0 0 1px ${lobeCssVar.colorFill};
  `,
  container: css`
    cursor: pointer;

    flex: none;

    width: 24px;
    min-width: 24px;
    height: 24px;
    min-height: 24px;

    background: ${lobeCssVar.colorBgContainer};
    box-shadow: inset 0 0 0 1px ${lobeCssVar.colorFillSecondary};

    &:hover {
      box-shadow:
        inset 0 0 0 1px rgba(0, 0, 0, 5%),
        0 0 0 2px ${lobeCssVar.colorText};
    }
  `,
  transparent: css`
    background-image: conic-gradient(
      ${lobeCssVar.colorFillSecondary} 25%,
      transparent 25% 50%,
      ${lobeCssVar.colorFillSecondary} 50% 75%,
      transparent 75% 100%
    );
    background-size: 50% 50%;
  `,
  wrapper: css`
    flex-wrap: wrap;
  `,
}));

function safeReadableColor(bgColor: string, fallbackColor?: string) {
  try {
    return readableColor(bgColor);
  } catch {
    return fallbackColor || cssVar.colorText;
  }
}

function isTransparentColor(color?: string) {
  if (!color) return false;
  if (color === 'transparent') return true;

  const normalized = color.replace(/\s+/g, '').toLowerCase();
  return /^rgba\((?:\d{1,3},){3}0(?:\.0+)?\)$/.test(normalized)
    || /^hsla\([^)]*,0(?:\.0+)?\)$/.test(normalized);
}

interface SwatchItem<T extends string> {
  color?: string;
  title: string;
  value?: T;
}

interface ThemeSwatchGroupProps<T extends string> {
  items: SwatchItem<T>[];
  onChange?: (value?: T) => void;
  value?: T;
}

const ThemeSwatchGroup = <T extends string,>({
  items,
  onChange,
  value,
}: ThemeSwatchGroupProps<T>) => {
  const { styles } = useStyles();

  return (
    <Flexbox horizontal gap={6} className={styles.wrapper}>
      {items.map((item, index) => {
        const color = item.color || cssVar.colorPrimary;
        const isActive = value === undefined ? item.value === undefined : item.value === value;
        const isTransparent = item.color?.startsWith('var(')
          ? false
          : isTransparentColor(item.color);
        const actualColorForReadable = item.color?.startsWith('var(') ? cssVar.colorPrimary : color;

        return (
          <Tooltip key={item.value ?? `default-${index}`} title={item.title}>
            <Center
              className={cx(
                styles.container,
                isTransparent && styles.transparent,
                isActive && styles.active,
              )}
              style={{
                background: isTransparent ? undefined : color,
                borderRadius: '50%',
              }}
              onClick={() => onChange?.(item.value)}
            >
              {isActive && (
                <Icon
                  color={rgba(safeReadableColor(actualColorForReadable), 0.33)}
                  icon={CheckIcon}
                  size={{ size: 14, strokeWidth: 4 }}
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </Center>
          </Tooltip>
        );
      })}
    </Flexbox>
  );
};

ThemeSwatchGroup.displayName = 'ThemeSwatchGroup';

function createOptions<T extends string>(
  map: Record<T, string>,
  t: (key: string) => string,
): SwatchItem<T>[] {
  return [
    {
      color: 'rgba(0, 0, 0, 0)',
      title: t('appearance.colors.default'),
      value: undefined,
    },
    ...(Object.entries(map) as Array<[T, string]>).map(([key, color]) => ({
      color,
      title: t(`appearance.colors.${key}`),
      value: key,
    })),
  ];
}

interface ThemeSwatchesPrimaryProps {
  onChange?: (value?: PrimaryColors) => void;
  value?: PrimaryColors;
}

export const ThemeSwatchesPrimary = memo<ThemeSwatchesPrimaryProps>(({ onChange, value }) => {
  const { t } = useTranslation('settings');

  return (
    <ThemeSwatchGroup
      items={createOptions(PRIMARY_COLORS, t)}
      value={value}
      onChange={onChange}
    />
  );
});

interface ThemeSwatchesNeutralProps {
  onChange?: (value?: NeutralColors) => void;
  value?: NeutralColors;
}

export const ThemeSwatchesNeutral = memo<ThemeSwatchesNeutralProps>(({ onChange, value }) => {
  const { t } = useTranslation('settings');

  return (
    <ThemeSwatchGroup
      items={createOptions(NEUTRAL_COLORS, t)}
      value={value}
      onChange={onChange}
    />
  );
});
