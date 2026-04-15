import type { ThemeConfig } from "antd";
import {
	baseToken as themeSystemBaseToken,
	createThemeConfig,
	type CreateThemeConfigParams,
} from "@4399ywkf/theme-system";

export const typographyTokenOverrides: Record<string, number> = {
	fontSize: 14,
	fontSizeSM: 12,
	fontSizeLG: 16,
	fontSizeXL: 18,
	lineHeight: 1.5,
	lineHeightSM: 1.35,
	lineHeightLG: 1.6,
	fontWeightStrong: 500,
};

export const typographyCssVarDeclarations = `
--mimi-font-size-2xs: calc(var(--ant-font-size-sm, 12px) - 2px);
--mimi-font-size-xs: calc(var(--ant-font-size-sm, 12px) - 1px);
--mimi-font-size-sm: var(--ant-font-size-sm, 12px);
--mimi-font-size-md: calc(var(--ant-font-size, 14px) - 1px);
--mimi-font-size-base: var(--ant-font-size, 14px);
--mimi-font-size-lg: var(--ant-font-size-lg, 16px);
--mimi-font-size-xl: var(--ant-font-size-xl, 18px);
--mimi-font-weight-regular: 400;
--mimi-font-weight-medium: 500;
--mimi-font-weight-semibold: var(--ant-font-weight-strong, 600);
--mimi-font-weight-bold: 700;
--mimi-line-height-tight: var(--ant-line-height-sm, 1.35);
--mimi-line-height-base: var(--ant-line-height, 1.5);
--mimi-line-height-relaxed: var(--ant-line-height-lg, 1.6);
`.trim();

export function createMimiThemeConfig(params: CreateThemeConfigParams): ThemeConfig {
	const themeConfig = createThemeConfig(params);
	return {
		...themeConfig,
		token: {
			...(themeConfig.token ?? {}),
			...typographyTokenOverrides,
			fontFamily: themeConfig.token?.fontFamily ?? themeSystemBaseToken.fontFamily,
			fontFamilyCode:
				themeConfig.token?.fontFamilyCode ?? themeSystemBaseToken.fontFamilyCode,
		},
	};
}
