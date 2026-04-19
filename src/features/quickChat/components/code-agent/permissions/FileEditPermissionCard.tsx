import { useMemo } from "react";
import { createStyles } from "antd-style";
import { LobePatchDiff } from "@/components/common/LobePatchDiff";
import { buildUnifiedPatch } from "@/lib/diff-utils";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css, token }) => ({
	path: css`
		font-size: calc(${token.fontSizeSM}px - 1px);
		font-family: ${token.fontFamilyCode};
		color: ${token.colorTextSecondary};
		margin-bottom: 6px;
	`,
	diff: css`
		margin-top: 4px;
	`,
}));

export function FileEditPermissionCard({ rawInput, onDecision }: Props) {
	const { styles } = useStyles();
	const filePath = String(rawInput.file_path || rawInput.path || "");
	const oldContent = String(rawInput.old_content || rawInput.old_string || "");
	const newContent = String(rawInput.new_content || rawInput.new_string || rawInput.content || "");
	const patch = useMemo(() => {
		if (!filePath || !(oldContent || newContent)) return "";
		return buildUnifiedPatch(filePath, oldContent, newContent).patch;
	}, [filePath, newContent, oldContent]);

	return (
		<PermissionCardShell toolDisplayName="FileEdit" onDecision={onDecision}>
			{filePath && <div className={styles.path}>✏️ {filePath}</div>}
			{patch && (
				<div className={styles.diff}>
					<LobePatchDiff
						maxBodyHeight={180}
						patch={patch}
						showHeader={false}
					/>
				</div>
			)}
		</PermissionCardShell>
	);
}
