import { useMemo } from "react";
import { createStyles } from "antd-style";
import { LobePatchDiff } from "@/components/common/LobePatchDiff";
import { buildUnifiedPatch } from "@/lib/diff-utils";
import { PermissionCardShell } from "./PermissionCardShell";
import type { PermissionDecision } from "./PermissionCardShell";
import { usePermissionContentStyles } from "./shared";

interface Props {
	rawInput: Record<string, unknown>;
	onDecision: (decision: PermissionDecision, feedback?: string) => void;
}

const useStyles = createStyles(({ css }) => ({
	pathValue: css`
		max-width: 100%;
	`,
	diff: css`
		border-radius: 14px;
		overflow: hidden;
	`,
}));

export function FileEditPermissionCard({ rawInput, onDecision }: Props) {
	const { styles, cx } = useStyles();
	const { styles: contentStyles } = usePermissionContentStyles();
	const filePath = String(rawInput.file_path || rawInput.path || "");
	const oldContent = String(rawInput.old_content || rawInput.old_string || "");
	const newContent = String(rawInput.new_content || rawInput.new_string || rawInput.content || "");
	const patch = useMemo(() => {
		if (!filePath || !(oldContent || newContent)) return "";
		return buildUnifiedPatch(filePath, oldContent, newContent).patch;
	}, [filePath, newContent, oldContent]);

	return (
		<PermissionCardShell toolDisplayName="FileEdit" onDecision={onDecision}>
			<div className={contentStyles.stack}>
				{filePath && (
					<div className={contentStyles.metaStack}>
						<div className={contentStyles.metaLine}>
							<span className={contentStyles.metaLabel}>文件: </span>
							<span className={cx(contentStyles.metaValue, contentStyles.codeValue, styles.pathValue)}>
								{filePath}
							</span>
						</div>
					</div>
				)}
				{patch && (
					<div className={styles.diff}>
						<LobePatchDiff
							maxBodyHeight={180}
							patch={patch}
							showHeader={false}
						/>
					</div>
				)}
			</div>
		</PermissionCardShell>
	);
}
