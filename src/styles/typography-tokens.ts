import type { ThemeConfig } from "antd";
import {
	baseToken as themeSystemBaseToken,
	createThemeConfig,
	type CreateThemeConfigParams,
	type NeutralColors,
	type PrimaryColors,
} from "@4399ywkf/theme-system";

type MimiThemeConfigParams = CreateThemeConfigParams & {
	neutralColor?: NeutralColors;
	primaryColor?: PrimaryColors;
};

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


export function createMimiThemeConfig(params: MimiThemeConfigParams): ThemeConfig {
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
