/**
 * ThemeWrapper
 * Provides antd v6 + antd-style theme context using @4399ywkf/theme-system color algorithms.
 * Bridges the existing useSettingsStore theme ('light' | 'dark' | 'system') to antd-style.
 */
import { type CSSProperties, type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ConfigProvider as AntdConfigProvider } from 'antd';
import { ConfigProvider as LobeConfigProvider, ThemeProvider as LobeThemeProvider } from '@lobehub/ui';
import type { NeutralColors, PrimaryColors } from '@4399ywkf/theme-system';
// @ts-expect-error – internal path, not in public types
import AppElementContext from '@lobehub/ui/es/ThemeProvider/AppElementContext';
import {
  StyleProvider,
  createGlobalStyle,
  type GetAntdTheme,
} from 'antd-style';
import { motion } from 'motion/react';
import { useSettingsStore } from '@/stores/settings';
import {
  createMimiThemeConfig,
  getChatTypographyVars,
} from '@/styles/typography-tokens';
import { GlobalStyle } from '@/styles';
import {
  DEFAULT_NEUTRAL_COLOR,
} from '../../../shared/appearance';

type ResolvedAppearance = 'light' | 'dark';

function resolveAppearance(theme: string): ResolvedAppearance {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  // system
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

interface ThemeWrapperProps {
  children: ReactNode;
}

const LobeUiCompatGlobalStyle = createGlobalStyle`
  @layer base {
    :where(.lobe-flex) {
      --lobe-flex: 0 1 auto;
      --lobe-flex-direction: column;
      --lobe-flex-wrap: nowrap;
      --lobe-flex-justify: flex-start;
      --lobe-flex-align: stretch;
      --lobe-flex-width: auto;
      --lobe-flex-height: auto;
      --lobe-flex-padding: 0;
      --lobe-flex-padding-inline: var(--lobe-flex-padding);
      --lobe-flex-padding-block: var(--lobe-flex-padding);
      --lobe-flex-gap: 0;

      display: flex;
      flex: var(--lobe-flex);
      flex-flow: var(--lobe-flex-direction) var(--lobe-flex-wrap);
      gap: var(--lobe-flex-gap);
      align-items: var(--lobe-flex-align);
      justify-content: var(--lobe-flex-justify);
      width: var(--lobe-flex-width);
      height: var(--lobe-flex-height);
      padding: var(--lobe-flex-padding);
      padding-block: var(--lobe-flex-padding-block);
      padding-inline: var(--lobe-flex-padding-inline);
    }

    .lobe-flex-hidden,
    .lobe-flex--hidden {
      display: none;
    }
  }
`;


export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const theme = useSettingsStore((s) => s.theme);
  const primaryColor = useSettingsStore((s) => s.primaryColor);
  const neutralColor = useSettingsStore((s) => s.neutralColor);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const animationMode = useSettingsStore((s) => s.animationMode);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [appElement, setAppElement] = useState<HTMLDivElement | null>(null);

  const resolvedAppearance: ResolvedAppearance = resolveAppearance(theme);
  const typographyVars = useMemo(
    () => getChatTypographyVars(fontSize),
    [fontSize],
  );

  // Sync data-theme attribute for antd CSS variable mode
  // and the .dark class for Tailwind CSS variables (darkMode: ['class'])
  // useLayoutEffect fires synchronously before the browser paints, preventing
  // a flash of wrong text colors on first render in dark mode.
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedAppearance;
    document.documentElement.classList.toggle('dark', resolvedAppearance === 'dark');
  }, [resolvedAppearance]);

  const getAntdTheme = useCallback<GetAntdTheme>(
    (appearance) => {
      const baseTheme = createMimiThemeConfig({
        appearance: appearance as ResolvedAppearance,
        fontSize,
        neutralColor: (neutralColor || DEFAULT_NEUTRAL_COLOR) as NeutralColors,
        primaryColor: primaryColor as PrimaryColors | undefined,
      });

      return {
        ...baseTheme,
        token: {
          ...(baseTheme.token ?? {}),
          motion: animationMode !== 'disabled',
          motionUnit: animationMode === 'agile' ? 0.05 : 0.1,
        },
        // Enable antd CSS variable mode so --ant-* vars are injected at :root,
        // making them accessible to @lobehub/ui portals that render outside the tree.
        cssVar: { prefix: 'ant', key: 'lobe-vars' },
      };
    },
    [animationMode, fontSize, neutralColor, primaryColor],
  );

  const getPopupContainer = useCallback(
    (): HTMLElement => popupContainerRef.current ?? document.body,
    [],
  );

  return (
    <div
      ref={popupContainerRef}
      data-ywkf-root
      style={{
        position: 'relative',
        height: '100%',
        ...(typographyVars as CSSProperties),
      }}
    >
      <LobeThemeProvider
        appearance={resolvedAppearance}
        customTheme={{
          neutralColor: (neutralColor || DEFAULT_NEUTRAL_COLOR) as NeutralColors,
          primaryColor: primaryColor as PrimaryColors | undefined,
        }}
        defaultAppearance={resolvedAppearance}
        defaultThemeMode={resolvedAppearance}
        enableCustomFonts={false}
        enableGlobalStyle={false}
        themeMode={theme === 'system' ? 'auto' : theme}
        theme={getAntdTheme}
      >
        <LobeConfigProvider motion={motion}>
          <LobeUiCompatGlobalStyle />
          <GlobalStyle />
          <AntdConfigProvider getPopupContainer={getPopupContainer}>
            {/* Provide AppElementContext so @lobehub/ui DropdownMenu portals
                render inside the theme container rather than document.body */}
            <div
              ref={setAppElement}
              style={{ display: 'contents' }}
            >
              <StyleProvider>
                <AppElementContext.Provider value={appElement}>
                  {children}
                </AppElementContext.Provider>
              </StyleProvider>
            </div>
          </AntdConfigProvider>
        </LobeConfigProvider>
      </LobeThemeProvider>
    </div>
  );
}

export default ThemeWrapper;
