import { createStyles } from "antd-style";

export const usePermissionContentStyles = createStyles(({ css, token }) => ({
	stack: css`
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
	`,
	metaStack: css`
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	`,
	metaRow: css`
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
		font-size: calc(${token.fontSizeSM}px - 1px);
		line-height: 1.4;
		color: ${token.colorTextTertiary};
	`,
	metaBadge: css`
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
	`,
	metaLabel: css`
		color: ${token.colorTextQuaternary};
	`,
	metaValue: css`
		color: ${token.colorTextSecondary};
		min-width: 0;
		word-break: break-word;
	`,
	metaLine: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		line-height: 1.45;
		color: ${token.colorTextTertiary};
		word-break: break-word;
	`,
	codeValue: css`
		font-family: ${token.fontFamilyCode};
	`,
	block: css`
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorFillTertiary};
	`,
	blockStrong: css`
		background: ${token.colorFillSecondary};
	`,
	blockCode: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		line-height: 1.55;
		color: ${token.colorTextSecondary};
		font-family: ${token.fontFamilyCode};
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 188px;
		overflow: auto;
	`,
	blockText: css`
		font-size: ${token.fontSizeSM}px;
		line-height: 1.55;
		color: ${token.colorTextSecondary};
		word-break: break-word;
	`,
}));

export function truncateText(value: string, maxLength = 320) {
	const normalized = value.trim();
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function formatPreviewJson(rawInput: Record<string, unknown>, maxLength = 420) {
	try {
		return truncateText(JSON.stringify(rawInput, null, 2), maxLength);
	} catch {
		return "";
	}
}
