import type { NeutralColors, PrimaryColors } from '@4399ywkf/theme-system';
import { ColorSwatches } from '@lobehub/ui';
import { memo } from 'react';
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

function findThemeName<T extends Record<string, string>>(map: T, value: string | undefined): keyof T | undefined {
  if (!value) return undefined;
  return Object.entries(map).find(([, color]) => color === value)?.[0] as keyof T | undefined;
}

interface ThemeSwatchesPrimaryProps {
  onChange?: (value: PrimaryColors) => void;
  value?: PrimaryColors;
}

export const ThemeSwatchesPrimary = memo<ThemeSwatchesPrimaryProps>(({ onChange, value }) => {
  const { t } = useTranslation('settings');

  return (
    <ColorSwatches
      colors={[
        { color: 'rgba(0, 0, 0, 0)', title: t('appearance.colors.default') },
        ...Object.entries(PRIMARY_COLORS).map(([key, color]) => ({
          color,
          title: t(`appearance.colors.${key}`),
        })),
      ]}
      value={value ? PRIMARY_COLORS[value] : undefined}
      onChange={(color) => {
        const next = findThemeName(PRIMARY_COLORS, color);
        if (next) onChange?.(next as PrimaryColors);
      }}
    />
  );
});

interface ThemeSwatchesNeutralProps {
  onChange?: (value: NeutralColors) => void;
  value?: NeutralColors;
}

export const ThemeSwatchesNeutral = memo<ThemeSwatchesNeutralProps>(({ onChange, value }) => {
  const { t } = useTranslation('settings');

  return (
    <ColorSwatches
      colors={[
        { color: 'rgba(0, 0, 0, 0)', title: t('appearance.colors.default') },
        ...Object.entries(NEUTRAL_COLORS).map(([key, color]) => ({
          color,
          title: t(`appearance.colors.${key}`),
        })),
      ]}
      value={value ? NEUTRAL_COLORS[value] : undefined}
      onChange={(color) => {
        const next = findThemeName(NEUTRAL_COLORS, color);
        if (next) onChange?.(next as NeutralColors);
      }}
    />
  );
});
