import { OpenClaw, ClaudeCode } from "@lobehub/icons";
import { ChatItem } from "@lobehub/ui/chat";
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
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "4px",
						height: "22px",
					}}
				>
					<span
						style={{
							height: "6px",
							width: "6px",
							borderRadius: "50%",
							backgroundColor: "var(--color-text-tertiary, #999)",
							opacity: 0.6,
							animation: "bounce 1.4s infinite ease-in-out both",
							animationDelay: "-0.32s",
						}}
					/>
					<span
						style={{
							height: "6px",
							width: "6px",
							borderRadius: "50%",
							backgroundColor: "var(--color-text-tertiary, #999)",
							opacity: 0.6,
							animation: "bounce 1.4s infinite ease-in-out both",
							animationDelay: "-0.16s",
						}}
					/>
					<span
						style={{
							height: "6px",
							width: "6px",
							borderRadius: "50%",
							backgroundColor: "var(--color-text-tertiary, #999)",
							opacity: 0.6,
							animation: "bounce 1.4s infinite ease-in-out both",
						}}
					/>
					<style>{`
						@keyframes bounce {
							0%, 80%, 100% { transform: scale(0); }
							40% { transform: scale(1); }
						}
					`}</style>
				</div>
			)}
			showTitle={false}
			variant="bubble"
		/>
	);
}
