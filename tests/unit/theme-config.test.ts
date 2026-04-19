import { describe, expect, it } from 'vitest';
import { createMimiThemeConfig } from '@/styles/typography-tokens';

describe('createMimiThemeConfig', () => {
  it('uses dark text for bright default primary buttons in dark mode', () => {
    const themeConfig = createMimiThemeConfig({
      appearance: 'dark',
      neutralColor: 'slate',
    });

    expect(themeConfig.components?.Button).toMatchObject({
      primaryColor: '#111111',
    });
  });

  it('keeps light text for darker geekblue primary buttons', () => {
    const themeConfig = createMimiThemeConfig({
      appearance: 'dark',
      neutralColor: 'slate',
      primaryColor: 'geekblue',
    });

    expect(themeConfig.components?.Button).toMatchObject({
      primaryColor: '#ffffff',
    });
  });

  it('uses dark text for bright custom primary colors in light mode', () => {
    const themeConfig = createMimiThemeConfig({
      appearance: 'light',
      neutralColor: 'slate',
      primaryColor: 'blue',
    });

    expect(themeConfig.components?.Button).toMatchObject({
      primaryColor: '#111111',
    });
  });
});
