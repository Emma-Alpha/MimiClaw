import { useEffect } from "react";
import { Eye, FileText, Loader2 } from "lucide-react";
import { Highlighter } from "@lobehub/ui";
import { useSidePanelStore } from "@/stores/sidePanel";
import { useCodeChatStyles } from "../../styles";

type PreviewTabProps = {
	workspaceRoot: string;
};

const IMAGE_MIME_PREFIXES = ["image/"];
const HOST_API_BASE = "http://127.0.0.1:3210";

function isImageMime(mime: string): boolean {
	return IMAGE_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

function guessLanguage(name: string): string {
	const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
	const map: Record<string, string> = {
		ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
		json: "json", md: "markdown", css: "css", scss: "scss",
		html: "html", xml: "xml", yaml: "yaml", yml: "yaml",
		toml: "toml", py: "python", rs: "rust", go: "go",
		java: "java", kt: "kotlin", swift: "swift", rb: "ruby",
		sh: "bash", bash: "bash", zsh: "bash", sql: "sql",
		graphql: "graphql", vue: "vue", svelte: "svelte",
		c: "c", cpp: "cpp", h: "c", hpp: "cpp",
		txt: "plaintext", diff: "diff", patch: "diff",
	};
	return map[ext] || "plaintext";
}

function getFileName(path: string): string {
	const parts = path.split(/[\\/]/);
	return parts[parts.length - 1] || path;
}

export function PreviewTab(_props: PreviewTabProps) {
	const { styles } = useCodeChatStyles();
	const previewTarget = useSidePanelStore((s) => s.previewTarget);
	const previewContent = useSidePanelStore((s) => s.previewContent);
	const previewLoading = useSidePanelStore((s) => s.previewLoading);
	const loadPreviewContent = useSidePanelStore((s) => s.loadPreviewContent);

	// Auto-load content when preview target changes
	useEffect(() => {
		if (!previewTarget) return;
		if (previewTarget.diffPatch) return; // diff already has content
		if (isImageMime(previewTarget.mimeType)) return; // images don't need text content
		void loadPreviewContent(previewTarget.absolutePath);
	}, [previewTarget?.absolutePath]); // eslint-disable-line react-hooks/exhaustive-deps

	if (!previewTarget) {
		return (
			<div className={styles.previewEmpty}>
				<Eye size={24} />
				<span>点击文件即可预览</span>
			</div>
		);
	}

	const fileName = getFileName(previewTarget.relativePath || previewTarget.absolutePath);

	// Diff patch preview
	if (previewTarget.diffPatch) {
		return (
			<div className={styles.previewContainer}>
				<div className={styles.previewHeader}>
					<FileText size={12} />
					<span className={styles.previewHeaderPath}>{previewTarget.relativePath}</span>
				</div>
				<div className={styles.previewBody}>
					<div className={styles.previewCodeWrap}>
						<Highlighter language="diff" showLanguage={false}>
							{previewTarget.diffPatch}
						</Highlighter>
					</div>
				</div>
			</div>
		);
	}

	// Image preview
	if (isImageMime(previewTarget.mimeType)) {
		const imageSrc = `${HOST_API_BASE}/api/files/local?path=${encodeURIComponent(previewTarget.absolutePath)}`;
		return (
			<div className={styles.previewContainer}>
				<div className={styles.previewHeader}>
					<FileText size={12} />
					<span className={styles.previewHeaderPath}>{previewTarget.relativePath}</span>
				</div>
				<div className={styles.previewBody}>
					<img
						src={imageSrc}
						alt={fileName}
						className={styles.previewImage}
					/>
				</div>
			</div>
		);
	}

	// Code / text preview
	return (
		<div className={styles.previewContainer}>
			<div className={styles.previewHeader}>
				<FileText size={12} />
				<span className={styles.previewHeaderPath}>{previewTarget.relativePath}</span>
			</div>
			<div className={styles.previewBody}>
				{previewLoading ? (
					<div className={styles.previewLoading}>
						<Loader2 size={14} className="animate-spin" />
						<span>加载中...</span>
					</div>
				) : previewContent ? (
					<div className={styles.previewCodeWrap}>
						<Highlighter language={guessLanguage(fileName)} showLanguage={false}>
							{previewContent}
						</Highlighter>
					</div>
				) : (
					<div className={styles.previewEmpty}>
						<span>无法预览此文件</span>
					</div>
				)}
			</div>
		</div>
	);
}
