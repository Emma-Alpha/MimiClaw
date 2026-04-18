import { useEffect, useMemo, useState } from 'react';
import type { HighlighterProps, MarkdownProps, MermaidProps } from '@lobehub/ui';
import { useSettingsStore } from '@/stores/settings';

type MdastNode = {
	type?: string;
	lang?: string;
	value?: string;
	children?: MdastNode[];
};

const PLAIN_LANGUAGE_IDS = new Set(['', 'text', 'txt', 'plain', 'plaintext']);

function includesAny(content: string, snippets: string[]): boolean {
	return snippets.some((snippet) => content.includes(snippet));
}

function detectCodeLanguage(content: string): string {
	const trimmed = content.trim();
	if (!trimmed) return 'plaintext';

	if (
		(trimmed.startsWith('{') || trimmed.startsWith('['))
		&& (trimmed.endsWith('}') || trimmed.endsWith(']'))
	) {
		try {
			JSON.parse(trimmed);
			return 'json';
		} catch {
			// Continue with heuristic detection.
		}
	}

	const lower = trimmed.toLowerCase();

	if (includesAny(lower, ['#!/bin/bash', '#!/usr/bin/env bash', '$ ', '&&', '||'])) return 'bash';
	if (includesAny(lower, ['def ', 'import ', 'from ', 'if __name__ == "__main__":'])) return 'python';
	if (includesAny(lower, ['select ', ' from ', ' where ', ' group by ', ' order by '])) return 'sql';
	if (includesAny(lower, ['<html', '</html>', '<div', '</div>', '<span', '<script'])) return 'html';
	if (includesAny(lower, ['interface ', 'type ', ': string', ': number', ': boolean', ' as const'])) return 'ts';
	if (includesAny(lower, ['import ', 'export ', 'const ', 'let ', 'var ', 'function '])) return 'js';
	if (includesAny(lower, ['{', '}', ';'])) return 'ts';
	if (includesAny(lower, ['apiVersion:', 'kind:', 'metadata:', '---\n'])) return 'yaml';

	return 'plaintext';
}

function applyAutoCodeLanguage(node: MdastNode | null | undefined): void {
	if (!node || typeof node !== 'object') return;

	if (node.type === 'code' && typeof node.value === 'string') {
		const currentLanguage = typeof node.lang === 'string' ? node.lang.trim().toLowerCase() : '';
		if (PLAIN_LANGUAGE_IDS.has(currentLanguage)) {
			node.lang = detectCodeLanguage(node.value);
		}
	}

	const children = Array.isArray(node.children) ? node.children : [];
	for (const child of children) {
		applyAutoCodeLanguage(child);
	}
}

export function remarkAutoCodeLanguage() {
	return (tree: MdastNode) => {
		applyAutoCodeLanguage(tree);
	};
}

type MarkdownComponentProps = NonNullable<MarkdownProps['componentProps']>;

function mergeMarkdownComponentProps(
	base: MarkdownComponentProps | undefined,
	extra: MarkdownComponentProps | undefined,
): MarkdownComponentProps | undefined {
	if (!base && !extra) return undefined;
	return {
		...base,
		...extra,
		a: { ...(base?.a ?? {}), ...(extra?.a ?? {}) },
		highlight: { ...(base?.highlight ?? {}), ...(extra?.highlight ?? {}) },
		img: { ...(base?.img ?? {}), ...(extra?.img ?? {}) },
		mermaid: { ...(base?.mermaid ?? {}), ...(extra?.mermaid ?? {}) },
		pre: { ...(base?.pre ?? {}), ...(extra?.pre ?? {}) },
		video: { ...(base?.video ?? {}), ...(extra?.video ?? {}) },
	};
}

export type EnhancedMarkdownProps = Pick<
	MarkdownProps,
	| 'remarkPlugins'
	| 'componentProps'
	| 'fullFeaturedCodeBlock'
	| 'enableCustomFootnotes'
	| 'enableGithubAlert'
	| 'fontSize'
	| 'streamSmoothingPreset'
>;

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

export function useEnhancedMarkdownProps(
	extra?: Pick<MarkdownProps, 'remarkPlugins' | 'componentProps'>,
): EnhancedMarkdownProps {
	const theme = useSettingsStore((state) => state.theme);
	const fontSize = useSettingsStore((state) => state.fontSize);
	const highlighterTheme = useSettingsStore((state) => state.highlighterTheme);
	const mermaidTheme = useSettingsStore((state) => state.mermaidTheme);
	const prefersDarkMode = usePrefersDarkMode();

	const resolvedTheme = theme === 'system'
		? (prefersDarkMode ? 'dark' : 'light')
		: theme;

	return useMemo(() => {
		const fallbackHighlightTheme: NonNullable<HighlighterProps['theme']> =
			resolvedTheme === 'dark' ? 'github-dark-default' : 'github-light-default';
		const highlightTheme = (
			highlighterTheme || fallbackHighlightTheme
		) as NonNullable<HighlighterProps['theme']>;
		const resolvedMermaidTheme: NonNullable<MermaidProps['theme']> =
			(mermaidTheme || 'lobe-theme') as NonNullable<MermaidProps['theme']>;

		const baseComponentProps: MarkdownComponentProps = {
			highlight: {
				allowChangeLanguage: true,
				copyable: true,
				showLanguage: true,
				theme: highlightTheme,
				variant: 'filled',
				wrap: true,
			},
			mermaid: {
				fullFeatured: false,
				theme: resolvedMermaidTheme,
			},
			pre: {
				allowChangeLanguage: true,
				variant: 'filled',
				wrap: true,
			},
		};

		const baseRemarkPlugins: NonNullable<MarkdownProps['remarkPlugins']> = [remarkAutoCodeLanguage];

		return {
			componentProps: mergeMarkdownComponentProps(baseComponentProps, extra?.componentProps),
			enableCustomFootnotes: true,
			enableGithubAlert: true,
			fontSize,
			fullFeaturedCodeBlock: true,
			remarkPlugins: [...baseRemarkPlugins, ...(extra?.remarkPlugins ?? [])],
			streamSmoothingPreset: 'balanced',
		};
	}, [extra?.componentProps, extra?.remarkPlugins, fontSize, highlighterTheme, mermaidTheme, resolvedTheme]);
}
