import { CodeChat } from "@/features/mainChat";

export function MiniChat() {
	return (
		<div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
			<CodeChat embeddedCodeAssistant />
		</div>
	);
}
