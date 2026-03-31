/**
 * ThemeWrapper
 * Provides antd v6 + antd-style theme context using @4399ywkf/theme-system color algorithms.
 * Bridges the existing useSettingsStore theme ('light' | 'dark' | 'system') to antd-style.
 */
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { ConfigProvider } from 'antd';
import {
  StyleProvider,
  ThemeProvider as AntdThemeProvider,
  createGlobalStyle,
  type GetAntdTheme,
} from 'antd-style';
import { createThemeConfig } from '@4399ywkf/theme-system';
import { useSettingsStore } from '@/stores/settings';

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
  const popupContainerRef = useRef<HTMLDivElement>(null);

  const resolvedAppearance = useMemo(
    () => resolveAppearance(theme),
    [theme],
  );

  // Sync data-theme attribute for antd CSS variable mode
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedAppearance;
  }, [resolvedAppearance]);

  const getAntdTheme = useCallback<GetAntdTheme>(
    (appearance) =>
      createThemeConfig({
        appearance: appearance as ResolvedAppearance,
        primaryColor: 'blue',
        neutralColor: 'slate',
      }),
    [],
  );

  const getPopupContainer = useCallback(
    (): HTMLElement => popupContainerRef.current ?? document.body,
    [],
  );

  return (
    <div ref={popupContainerRef} data-ywkf-root style={{ position: 'relative', height: '100%' }}>
      <StyleProvider>
        <AntdThemeProvider
          appearance={resolvedAppearance}
          themeMode={theme === 'system' ? 'auto' : theme}
          theme={getAntdTheme}
          customToken={{ cssVar: true }}
        >
          <LobeUiCompatGlobalStyle />
          <ConfigProvider getPopupContainer={getPopupContainer}>
            {children}
          </ConfigProvider>
        </AntdThemeProvider>
      </StyleProvider>
    </div>
  );
}

export default ThemeWrapper;
