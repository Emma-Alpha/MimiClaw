import { createStyles } from 'antd-style';
import { useEffect, useMemo, useState } from 'react';
import { PatchDiff } from '@lobehub/ui';
import type { PatchDiffProps } from '@lobehub/ui';
import { useSettingsStore } from '@/stores/settings';

type ResolvedAppearance = 'light' | 'dark';

interface LobePatchDiffProps extends Pick<PatchDiffProps, 'fileName' | 'patch' | 'showHeader' | 'variant'> {
	maxBodyHeight?: number;
	onHeaderClick?: () => void;
}

const useStyles = createStyles(({ css, token }) => ({
	clickableHeader: css`
		cursor: pointer;
		user-select: none;
		transition: background-color 0.15s ease;

		&:hover {
			background: ${token.colorFillSecondary};
		}
	`,
}));

function usePrefersDarkMode(): boolean {
	const [prefersDark, setPrefersDark] = useState(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

		const query = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
		if (typeof query.addEventListener === 'function') {
			query.addEventListener('change', onChange);
			return () => query.removeEventListener('change', onChange);
		}

		query.addListener(onChange);
		return () => query.removeListener(onChange);
	}, []);

	return prefersDark;
}

function resolveAppearance(theme: string, prefersDarkMode: boolean): ResolvedAppearance {
	if (theme === 'dark') return 'dark';
	if (theme === 'light') return 'light';
	return prefersDarkMode ? 'dark' : 'light';
}

function resolveDiffTheme(
	highlighterTheme: string,
	resolvedAppearance: ResolvedAppearance,
): NonNullable<NonNullable<PatchDiffProps['diffOptions']>['theme']> {
	if (highlighterTheme && highlighterTheme !== 'lobe-theme') return highlighterTheme;
	return resolvedAppearance === 'dark' ? 'github-dark-default' : 'github-light-default';
}

export function LobePatchDiff({
	fileName,
	maxBodyHeight,
	onHeaderClick,
	patch,
	showHeader = true,
	variant = 'filled',
}: LobePatchDiffProps) {
	const { styles: componentStyles } = useStyles();
	const theme = useSettingsStore((state) => state.theme);
	const highlighterTheme = useSettingsStore((state) => state.highlighterTheme);
	const prefersDarkMode = usePrefersDarkMode();

	const resolvedAppearance = resolveAppearance(theme, prefersDarkMode);
	const diffTheme = useMemo(
		() => resolveDiffTheme(highlighterTheme, resolvedAppearance),
		[highlighterTheme, resolvedAppearance],
	);
	const styles = useMemo<Pick<PatchDiffProps, 'styles'>['styles']>(
		() => (maxBodyHeight ? { body: { maxHeight: maxBodyHeight } } : undefined),
		[maxBodyHeight],
	);
	const clickableHeaderClassName = onHeaderClick ? componentStyles.clickableHeader : undefined;

	return (
		<PatchDiff
			classNames={clickableHeaderClassName ? { header: clickableHeaderClassName } : undefined}
			diffOptions={{
				diffStyle: 'unified',
				disableVirtualizationBuffers: true,
				overflow: 'scroll',
				theme: diffTheme,
				themeType: resolvedAppearance,
			}}
			fileName={fileName}
			onClickCapture={
				clickableHeaderClassName
					? (event) => {
						if (!(event.target instanceof Element)) return;
						if (!event.target.closest(`.${clickableHeaderClassName}`)) return;
						onHeaderClick?.();
					}
					: undefined
			}
			patch={patch}
			showHeader={showHeader}
			styles={styles}
			variant={variant}
		/>
	);
}
