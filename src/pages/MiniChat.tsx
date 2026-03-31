import {
	useEffect,
	useRef,
	useState,
	useCallback,
	type KeyboardEvent,
} from "react";
import { Expand, X, Send } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { useGatewayStore } from "@/stores/gateway";
import {
	useChatStore,
	type RawMessage,
	type ContentBlock,
} from "@/stores/chat";
import { invokeIpc } from "@/lib/api-client";
import i18n from "@/i18n";
import logoSvg from "@/assets/logo.svg";

// ── Content extraction ────────────────────────────────────────────

function extractText(content: unknown): string {
	if (typeof content === "string") return content.trim();
	if (Array.isArray(content)) {
		const parts: string[] = [];
		for (const block of content as ContentBlock[]) {
			if (!block || typeof block !== "object") continue;
			if (block.type === "text" && typeof block.text === "string") {
				const t = block.text.trim();
				if (t) parts.push(t);
			} else if (block.type === "image") {
				parts.push("[图片]");
			} else if (
				(block.type === "tool_use" || block.type === "toolCall") &&
				block.name
			) {
				parts.push(`[工具: ${block.name}]`);
			}
		}
		return parts.join("\n");
	}
	return "";
}

function isVisibleMessage(msg: RawMessage): boolean {
	if (msg.role === "system" || msg.role === "toolresult") return false;
	return extractText(msg.content).length > 0;
}

// ── Message bubble ────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: RawMessage }) {
	const isUser = msg.role === "user";
	const text = extractText(msg.content);

	if (isUser) {
		return (
			<div className="flex justify-end">
				<div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-muted px-3.5 py-2.5 text-sm text-foreground shadow-sm">
					<span className="whitespace-pre-wrap break-words">{text}</span>
				</div>
			</div>
		);
	}

	return (
		<div className="flex justify-start gap-2">
			<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<img src={logoSvg} alt="AI" className="h-3.5 w-3.5" />
			</div>
			<div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm">
				<span className="whitespace-pre-wrap break-words">{text}</span>
			</div>
		</div>
	);
}

function TypingIndicator() {
	return (
		<div className="flex justify-start gap-2">
			<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<img src={logoSvg} alt="AI" className="h-3.5 w-3.5" />
			</div>
			<div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-3 shadow-sm">
				<div className="flex items-center gap-1">
					<span
						className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
						style={{ animationDelay: "0ms" }}
					/>
					<span
						className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
						style={{ animationDelay: "150ms" }}
					/>
					<span
						className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
						style={{ animationDelay: "300ms" }}
					/>
				</div>
			</div>
		</div>
	);
}

function StreamingBubble({ text }: { text: string }) {
	return (
		<div className="flex justify-start gap-2">
			<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
				<img src={logoSvg} alt="AI" className="h-3.5 w-3.5" />
			</div>
			<div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm">
				<span className="whitespace-pre-wrap break-words">{text}</span>
				<span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-primary align-middle" />
			</div>
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────

export function MiniChat() {
	const initSettings = useSettingsStore((s) => s.init);
	const language = useSettingsStore((s) => s.language);
	const initGateway = useGatewayStore((s) => s.init);
	const gatewayStatus = useGatewayStore((s) => s.status);
	const messages = useChatStore((s) => s.messages);
	const sending = useChatStore((s) => s.sending);
	const streamingText = useChatStore((s) => s.streamingText);
	const streamingTools = useChatStore((s) => s.streamingTools);
	const pendingFinal = useChatStore((s) => s.pendingFinal);
	const newSession = useChatStore((s) => s.newSession);
	const sendMessage = useChatStore((s) => s.sendMessage);

	const [input, setInput] = useState("");
	const [isComposing, setIsComposing] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	/** Text queued for auto-send once the gateway becomes ready. */
	const pendingAutoSend = useRef<string | null>(null);

	// Derived gateway state — must be above any hooks that use these values.
	const gatewayState = gatewayStatus.state;
	const isConnecting = gatewayState === "starting" || gatewayState === "reconnecting";
	const isError = gatewayState === "error";
	const isReady = gatewayState === "running";

	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	// Create a fresh session immediately on mount — BEFORE initGateway() so that
	// any gateway notification that auto-triggers loadHistory() uses this new key
	// instead of the default ":main" session.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
	useEffect(() => {
		newSession();
	}, []);

	useEffect(() => {
		void initGateway();
	}, [initGateway]);

	// On mount: consume any initial message queued by the translate bubble.
	useEffect(() => {
		void invokeIpc<string | null>("pet:consumeInitialMessage").then((text) => {
			if (text) pendingAutoSend.current = text;
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Handle initial messages pushed to an already-open window.
	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"mini-chat:initial-message",
			(payload) => {
				const text = payload as string;
				if (!text) return;
				if (isReady && !sending) {
					void sendMessage(text);
				} else {
					pendingAutoSend.current = text;
				}
			},
		);
		return () => { unsubscribe?.(); };
	}, [isReady, sending, sendMessage]);

	// Auto-send the pending initial message once the gateway is ready.
	useEffect(() => {
		if (isReady && !sending && pendingAutoSend.current) {
			const text = pendingAutoSend.current;
			pendingAutoSend.current = null;
			void sendMessage(text);
		}
	}, [isReady, sending, sendMessage]);

	// Keep pet runtime in sync with the mini chat's sending state.
	useEffect(() => {
		const activity =
			!sending
				? "idle"
				: pendingFinal || streamingText || streamingTools.length > 0
					? "working"
					: "listening";
		void invokeIpc("pet:setUiActivity", { activity }).catch(() => {});
	}, [sending, streamingText, pendingFinal, streamingTools]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, streamingText, sending]);

	const handleClose = useCallback(() => {
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handleOpenFull = useCallback(() => {
		void invokeIpc("pet:openMainWindow");
		void invokeIpc("pet:closeMiniChat");
	}, []);

	const handleSend = useCallback(async () => {
		const text = input.trim();
		if (!text || sending) return;
		setInput("");
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
		await sendMessage(text);
	}, [input, sending, sendMessage]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && !e.shiftKey && !isComposing) {
				e.preventDefault();
				void handleSend();
			}
		},
		[handleSend, isComposing],
	);

	const visibleMessages = messages.filter(isVisibleMessage).slice(-10);

	return (
		<div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
			{/* Title bar / Header */}
			<div className="drag-region flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
				{/* Logo + name */}
				<div className="flex items-center gap-1.5">
					<img src={logoSvg} alt="logo" className="h-4 w-4 shrink-0" />
					<span className="text-[13px] font-semibold text-foreground">
						极智
					</span>
				</div>

				{/* Gateway status dot */}
				<div className="flex flex-1 items-center gap-1.5">
					<span
						className={`ml-0.5 h-1.5 w-1.5 rounded-full ${
							isReady
								? "bg-emerald-500"
								: isError
									? "bg-red-500"
									: "bg-amber-400 animate-pulse"
						}`}
					/>
					{isConnecting && (
						<span className="text-[11px] text-muted-foreground">连接中…</span>
					)}
				</div>

				{/* Expand to full app */}
				<button
					type="button"
					onClick={handleOpenFull}
					className="no-drag flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					title="打开完整界面"
				>
					<Expand className="h-3.5 w-3.5" />
				</button>

				{/* Close */}
				<button
					type="button"
					onClick={handleClose}
					className="no-drag flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					title="关闭"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* Messages area */}
			<div className="flex-1 overflow-y-auto px-3 py-3">
				{visibleMessages.length === 0 && !sending && !isConnecting ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
							<img src={logoSvg} alt="logo" className="h-6 w-6" />
						</div>
						<div>
							<p className="text-sm font-medium text-foreground">
								有什么可以帮你的？
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Enter 发送 · Shift+Enter 换行
							</p>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{visibleMessages.map((msg, i) => (
							<MessageBubble key={`${msg.role}-${i}-${msg.id ?? ""}`} msg={msg} />
						))}
						{sending && !streamingText && <TypingIndicator />}
						{streamingText && <StreamingBubble text={streamingText} />}
						{pendingFinal && !streamingText && !sending && <TypingIndicator />}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Input area */}
			<div className="shrink-0 border-t border-border bg-background px-3 py-2.5">
				<div className="flex items-end gap-2">
					<textarea
						ref={textareaRef}
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							const ta = e.currentTarget;
							ta.style.height = "auto";
							ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`;
						}}
						onKeyDown={handleKeyDown}
						onCompositionStart={() => setIsComposing(true)}
						onCompositionEnd={() => setIsComposing(false)}
						placeholder={
							isConnecting ? "连接中…" : isError ? "连接断开" : "输入消息…"
						}
						disabled={isConnecting || isError}
						rows={1}
						className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
						style={{ minHeight: "36px", maxHeight: "80px" }}
					/>
					<button
						type="button"
						onClick={() => void handleSend()}
						disabled={!input.trim() || sending || isConnecting || isError}
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
