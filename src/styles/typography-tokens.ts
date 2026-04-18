import type { ThemeConfig } from 'antd';
import {
  baseToken as themeSystemBaseToken,
  createThemeConfig,
  type CreateThemeConfigParams,
  type NeutralColors,
  type PrimaryColors,
} from '@4399ywkf/theme-system';
import { clampChatFontSize, DEFAULT_CHAT_FONT_SIZE } from '../../shared/appearance';

type MimiThemeConfigParams = CreateThemeConfigParams & {
  fontSize?: number;
  neutralColor?: NeutralColors;
  primaryColor?: PrimaryColors;
};

export const APP_BUTTON_RADIUS = 12;
export const APP_CARD_RADIUS = 16;
export const APP_STATUS_BADGE_RADIUS = 10;

export const CHAT_ACTION_BUTTON_SIZE = 28;
export const CHAT_ACTION_ICON_SIZE = 16;
export const CHAT_ACTION_ICON_SIZE_COMPACT = 15;
export const CHAT_ACTION_BUTTON_SIZE_COMPACT = 24;
export const CHAT_PRIMARY_ACTION_BUTTON_SIZE = 30;
export const CHAT_PRIMARY_ACTION_ICON_SIZE = 16;
export const CHAT_STOP_ICON_SIZE = 12;
export const CHAT_CHIP_ICON_SIZE = 12;
export const CHAT_INPUT_ICON_SIZE = 16;
export const CHAT_NAV_ICON_SIZE = 16;
export const CHAT_SESSION_CARD_ICON_SIZE = 18;
export const CHAT_SESSION_EMPTY_ICON_SIZE = 24;
export const CHAT_SESSION_HEADER_ICON_SIZE = 16;
export const CHAT_SESSION_META_FONT_SIZE = 11;
export const CHAT_SESSION_META_ICON_SIZE = 12;
export const CHAT_SESSION_TITLE_FONT_SIZE = 13;

type ChatTypographyScale = {
  base: number;
  lg: number;
  md: number;
  sm: number;
  xl: number;
  xs: number;
  xxs: number;
};

function createChatTypographyScale(fontSize = DEFAULT_CHAT_FONT_SIZE): ChatTypographyScale {
  const base = clampChatFontSize(fontSize);

  return {
    base,
    lg: Math.min(base + 2, 20),
    md: Math.min(base - 1, 17),
    sm: Math.max(base - 2, 11),
    xl: Math.min(base + 4, 22),
    xs: Math.max(base - 3, 10),
    xxs: Math.max(base - 4, 9),
  };
}

export function getChatTypographyVars(fontSize = DEFAULT_CHAT_FONT_SIZE) {
  const scale = createChatTypographyScale(fontSize);

  return {
    '--mimi-font-size-2xs': `${scale.xxs}px`,
    '--mimi-font-size-base': `${scale.base}px`,
    '--mimi-font-size-lg': `${scale.lg}px`,
    '--mimi-font-size-md': `${scale.md}px`,
    '--mimi-font-size-sm': `${scale.sm}px`,
    '--mimi-font-size-xl': `${scale.xl}px`,
    '--mimi-font-size-xs': `${scale.xs}px`,
    '--mimi-font-weight-medium': '500',
    '--mimi-font-weight-semibold': '600',
  } as const;
}

export function getTypographyTokenOverrides(fontSize = DEFAULT_CHAT_FONT_SIZE): Record<string, number> {
  const scale = createChatTypographyScale(fontSize);

  return {
    borderRadius: 8,
    borderRadiusLG: APP_BUTTON_RADIUS,
    borderRadiusSM: 6,
    fontSize: scale.base,
    fontSizeLG: scale.lg,
    fontSizeSM: scale.sm,
    fontSizeXL: scale.xl,
    lineHeight: 1.5,
    lineHeightLG: 1.6,
    lineHeightSM: 1.35,
    fontWeightStrong: 500,
  };
}

export function createMimiThemeConfig(params: MimiThemeConfigParams): ThemeConfig {
  const { fontSize, ...rest } = params;
  const themeConfig = createThemeConfig(rest);

  return {
    ...themeConfig,
    token: {
      ...(themeConfig.token ?? {}),
      ...getTypographyTokenOverrides(fontSize),
      fontFamily: themeConfig.token?.fontFamily ?? themeSystemBaseToken.fontFamily,
      fontFamilyCode: themeConfig.token?.fontFamilyCode ?? themeSystemBaseToken.fontFamilyCode,
    },
  };
}
