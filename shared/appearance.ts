export type AppThemeMode = 'light' | 'dark' | 'system';

export const DEFAULT_APP_THEME_MODE: AppThemeMode = 'dark';
export const DEFAULT_NEUTRAL_COLOR = 'sand';

export const MIN_CHAT_FONT_SIZE = 12;
export const MAX_CHAT_FONT_SIZE = 18;
export const DEFAULT_CHAT_FONT_SIZE = 14;

export function clampChatFontSize(value: number): number {
  return Math.max(MIN_CHAT_FONT_SIZE, Math.min(MAX_CHAT_FONT_SIZE, Math.round(value)));
}
