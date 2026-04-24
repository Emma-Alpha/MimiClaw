import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { ChatItem, LoadingDots } from "@lobehub/ui/chat";
import { cssVar } from "antd-style";

import { useCodeChatStyles } from "../styles";

type TypingIndicatorProps = {
	codeMode?: boolean;
};

export function TypingIndicator({
	codeMode = false,
}: TypingIndicatorProps) {
	const { styles } = useCodeChatStyles();

	return (
		<ChatItem
			avatar={
				codeMode
					? {
							avatar: (
								<span className={styles.codeAvatar}>
									<ClaudeCode.Color size={16} />
								</span>
							),
							backgroundColor: "transparent",
							title: "CLI 编程",
						}
					: {
							avatar: (
								<span className={styles.assistantAvatar}>
									<OpenClaw.Color size={16} />
								</span>
							),
							backgroundColor: "rgba(59,130,246,0.1)",
							title: "极智",
						}
			}
			className={styles.chatItem}
			message=""
			placement="left"
			renderMessage={() => (
				<LoadingDots
					color={cssVar.colorTextSecondary}
					size={12}
					variant={"pulse"}
				/>
			)}
			showTitle={false}
			variant="bubble"
		/>
	);
}
