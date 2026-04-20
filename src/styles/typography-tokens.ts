import type { ThemeConfig } from 'antd';
import { baseToken as themeSystemBaseToken, colorScales, createThemeConfig, primary } from '@4399ywkf/theme-system';
import type { CreateThemeConfigParams, NeutralColors, PrimaryColors } from '@4399ywkf/theme-system';
import { clampChatFontSize, DEFAULT_CHAT_FONT_SIZE } from '../../shared/appearance';

type MimiThemeConfigParams = CreateThemeConfigParams & {
  fontSize?: number;
  neutralColor?: NeutralColors;
  primaryColor?: PrimaryColors;
};

const DARK_SOLID_TEXT_COLOR = '#111111';
const LIGHT_SOLID_TEXT_COLOR = '#ffffff';
const DARK_SWITCH_HANDLE_EMPHASIS = 0.88;
const DARK_SWITCH_TRACK_EMPHASIS = 0.42;
const DARK_SWITCH_TRACK_HOVER_EMPHASIS = 0.5;

const CODEX_DARK_TOKEN_OVERRIDES = {
  boxShadowSecondary: '0 24px 48px rgba(0, 0, 0, 0.28)',
  colorBgContainer: '#181818',
  colorBgElevated: '#2d2d2d',
  colorBgLayout: '#131313',
  colorBorder: 'rgba(255, 255, 255, 0.12)',
  colorBorderSecondary: 'rgba(255, 255, 255, 0.084)',
  colorFill: 'rgba(255, 255, 255, 0.08)',
  colorFillQuaternary: 'rgba(255, 255, 255, 0.03)',
  colorFillSecondary: 'rgba(255, 255, 255, 0.05)',
  colorFillTertiary: 'rgba(255, 255, 255, 0.1)',
  colorText: '#fcfcfc',
  colorTextQuaternary: 'rgba(252, 252, 252, 0.45)',
  colorTextSecondary: '#8f8f8f',
  colorTextTertiary: '#666666',
} as const;

const CODEX_LIGHT_TOKEN_OVERRIDES = {
  boxShadowSecondary: '0 20px 40px rgba(15, 23, 42, 0.08)',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#fcfcfc',
  colorBorder: 'rgba(13, 13, 13, 0.12)',
  colorBorderSecondary: 'rgba(13, 13, 13, 0.078)',
  colorFill: 'rgba(13, 13, 13, 0.08)',
  colorFillQuaternary: 'rgba(13, 13, 13, 0.03)',
  colorFillSecondary: 'rgba(13, 13, 13, 0.05)',
  colorFillTertiary: 'rgba(13, 13, 13, 0.1)',
  colorText: '#0d0d0d',
  colorTextQuaternary: 'rgba(13, 13, 13, 0.4)',
  colorTextSecondary: '#666666',
  colorTextTertiary: '#8f8f8f',
} as const;

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

function normalizeHexColor(color: string): string | null {
  const value = color.trim();

  if (/^#[\da-f]{3}$/iu.test(value)) {
    const [r, g, b] = value.slice(1).split('');

    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#[\da-f]{6}$/iu.test(value)) {
    return value.toLowerCase();
  }

  return null;
}

function getHexChannels(color: string): [number, number, number] | null {
  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) return null;

  const channels = normalizedColor
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16));

  if (!channels || channels.length !== 3) return null;

  const [red, green, blue] = channels;

  return [red, green, blue];
}

function mixHexColors(foregroundColor: string, backgroundColor: string, foregroundWeight: number): string | null {
  const foregroundChannels = getHexChannels(foregroundColor);
  const backgroundChannels = getHexChannels(backgroundColor);

  if (!foregroundChannels || !backgroundChannels) return null;

  const [foregroundRed, foregroundGreen, foregroundBlue] = foregroundChannels;
  const [backgroundRed, backgroundGreen, backgroundBlue] = backgroundChannels;
  const weight = Math.min(Math.max(foregroundWeight, 0), 1);
  const mixChannel = (foreground: number, background: number) =>
    Math.round(foreground * weight + background * (1 - weight));

  return `#${[
    mixChannel(foregroundRed, backgroundRed),
    mixChannel(foregroundGreen, backgroundGreen),
    mixChannel(foregroundBlue, backgroundBlue),
  ]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`;
}

function getRelativeLuminance(color: string): number | null {
  const normalizedColor = normalizeHexColor(color);

  if (!normalizedColor) return null;

  const channels = normalizedColor
    .slice(1)
    .match(/.{2}/gu)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) return null;

  const linearChannels = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );

  const [red, green, blue] = linearChannels;

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function getContrastRatio(foregroundColor: string, backgroundColor: string): number {
  const foregroundLuminance = getRelativeLuminance(foregroundColor);
  const backgroundLuminance = getRelativeLuminance(backgroundColor);

  if (foregroundLuminance === null || backgroundLuminance === null) return 0;

  const lighterColor = Math.max(foregroundLuminance, backgroundLuminance);
  const darkerColor = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighterColor + 0.05) / (darkerColor + 0.05);
}

export function resolvePrimarySolidTextColor(
  appearance: CreateThemeConfigParams['appearance'],
  primaryColor?: PrimaryColors,
): string {
  const primaryScale = primaryColor ? colorScales[primaryColor] : primary;
  const primaryBackgroundColor = primaryScale[appearance][9];

  return getContrastRatio(DARK_SOLID_TEXT_COLOR, primaryBackgroundColor) >=
    getContrastRatio(LIGHT_SOLID_TEXT_COLOR, primaryBackgroundColor)
    ? DARK_SOLID_TEXT_COLOR
    : LIGHT_SOLID_TEXT_COLOR;
}

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
  const primarySolidTextColor = resolvePrimarySolidTextColor(rest.appearance, rest.primaryColor);
  const darkSwitchOverrides = rest.appearance === 'dark'
    ? {
        colorPrimary: mixHexColors(
          themeConfig.token?.colorPrimary ?? '',
          themeConfig.token?.colorBgContainer ?? '',
          DARK_SWITCH_TRACK_EMPHASIS,
        ) ?? themeConfig.token?.colorPrimary,
        colorPrimaryHover: mixHexColors(
          themeConfig.token?.colorPrimary ?? '',
          themeConfig.token?.colorBgContainer ?? '',
          DARK_SWITCH_TRACK_HOVER_EMPHASIS,
        ) ?? themeConfig.token?.colorPrimaryHover ?? themeConfig.token?.colorPrimary,
        handleBg: mixHexColors(
          '#ffffff',
          themeConfig.token?.colorBgElevated ?? themeConfig.token?.colorBgContainer ?? '',
          DARK_SWITCH_HANDLE_EMPHASIS,
        ) ?? '#f0f0f0',
        handleShadow: '0 1px 3px rgba(0, 0, 0, 0.45)',
      }
    : undefined;
  const codexTokenOverrides = rest.appearance === 'dark'
    ? CODEX_DARK_TOKEN_OVERRIDES
    : CODEX_LIGHT_TOKEN_OVERRIDES;

  return {
    ...themeConfig,
    components: {
      ...(themeConfig.components ?? {}),
      Button: {
        ...(themeConfig.components?.Button ?? {}),
        primaryColor: primarySolidTextColor,
      },
      Switch: {
        ...(themeConfig.components?.Switch ?? {}),
        ...(darkSwitchOverrides ?? {}),
      },
    },
    token: {
      ...(themeConfig.token ?? {}),
      ...codexTokenOverrides,
      ...getTypographyTokenOverrides(fontSize),
      fontFamily: themeConfig.token?.fontFamily ?? themeSystemBaseToken.fontFamily,
      fontFamilyCode: themeConfig.token?.fontFamilyCode ?? themeSystemBaseToken.fontFamilyCode,
    },
  };
}
