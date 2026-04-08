import type { PendingPermission } from "@/stores/code-agent";
import type { PermissionDecision } from "./PermissionCardShell";
import { BashPermissionCard } from "./BashPermissionCard";
import { FileEditPermissionCard } from "./FileEditPermissionCard";
import { FileWritePermissionCard } from "./FileWritePermissionCard";
import { WebFetchPermissionCard } from "./WebFetchPermissionCard";
import { FilesystemPermissionCard } from "./FilesystemPermissionCard";
import { AgentPermissionCard } from "./AgentPermissionCard";
import { McpToolPermissionCard } from "./McpToolPermissionCard";
import { NotebookEditPermissionCard } from "./NotebookEditPermissionCard";
import { FallbackPermissionCard } from "./FallbackPermissionCard";

interface Props {
	permission: PendingPermission;
	onDecision: (requestId: string, decision: PermissionDecision, feedback?: string) => void;
}

const FILESYSTEM_TOOLS = new Set(["grep", "glob", "fileread", "read", "ls", "listfiles"]);
const BASH_TOOLS = new Set(["bash", "bashtool"]);
const FILE_EDIT_TOOLS = new Set(["edit", "fileedit", "strreplacebasededitattempt", "multiedit"]);
const FILE_WRITE_TOOLS = new Set(["write", "filewrite"]);
const WEB_FETCH_TOOLS = new Set(["webfetch"]);
const NOTEBOOK_TOOLS = new Set(["notebookedit"]);
const AGENT_TOOLS = new Set(["agent", "task"]);

export function PermissionDispatcher({ permission, onDecision }: Props) {
	const { requestId, toolName, rawInput, title, description } = permission;
	const name = toolName.toLowerCase();

	const handleCardDecision = (decision: PermissionDecision, feedback?: string) => {
		onDecision(requestId, decision, feedback);
	};

	if (BASH_TOOLS.has(name)) {
		return <BashPermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (FILE_EDIT_TOOLS.has(name)) {
		return <FileEditPermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (FILE_WRITE_TOOLS.has(name)) {
		return <FileWritePermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (WEB_FETCH_TOOLS.has(name)) {
		return <WebFetchPermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (FILESYSTEM_TOOLS.has(name)) {
		return <FilesystemPermissionCard toolName={toolName} rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (NOTEBOOK_TOOLS.has(name)) {
		return <NotebookEditPermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	if (AGENT_TOOLS.has(name)) {
		return <AgentPermissionCard rawInput={rawInput} onDecision={handleCardDecision} />;
	}
	// MCP tools: contain "__" separator (server__tool convention)
	if (name.includes("__") || name.includes("mcp")) {
		return (
			<McpToolPermissionCard
				toolName={toolName}
				rawInput={rawInput}
				title={title}
				description={description}
				onDecision={handleCardDecision}
			/>
		);
	}
	return (
		<FallbackPermissionCard toolName={toolName} rawInput={rawInput} onDecision={handleCardDecision} />
	);
}
