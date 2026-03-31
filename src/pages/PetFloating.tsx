import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type MouseEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
	DEFAULT_PET_ANIMATION,
	PET_IDLE_ANIMATIONS,
	PET_LOOPING_ANIMATIONS,
	PET_ANIMATION_SOURCES,
	PET_ANIMATIONS,
	type PetAnimation,
} from "@/lib/pet-floating";
import { invokeIpc } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings";
import type { PetRuntimeState } from "../../shared/pet";

const FALLBACK_RUNTIME_STATE: PetRuntimeState = {
	animation: DEFAULT_PET_ANIMATION,
	activity: "idle",
	showTerminal: false,
	terminalLines: [],
	updatedAt: 0,
};

/** Pixels the mouse must travel before a press-and-release is treated as a drag. */
const DRAG_THRESHOLD_PX = 6;
/** Minimum ms between IPC window-move calls (~60 fps). */
const MOVE_THROTTLE_MS = 16;
/** Minimum ms between two toggleMiniChat calls to prevent double-click ghost windows. */
const TOGGLE_DEBOUNCE_MS = 400;

/** Auto-dismiss delay for the translate bubble (ms). */
const TRANSLATE_BUBBLE_TTL_MS = 10_000;

export function PetFloating() {
	const { i18n } = useTranslation("settings");
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const initSettings = useSettingsStore((state) => state.init);
	const petAnimation = useSettingsStore((state) => state.petAnimation);
	const [runtimeState, setRuntimeState] = useState<PetRuntimeState>(
		FALLBACK_RUNTIME_STATE,
	);
	const [hasPlayedIntro, setHasPlayedIntro] = useState(false);
	const [translateBubble, setTranslateBubble] = useState<{ text: string } | null>(null);
	const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const lastToggleAt = useRef(0);
	const isDragging = useRef(false);

	const currentAnimation = useMemo<PetAnimation>(() => {
		const preferredIdleAnimation = PET_IDLE_ANIMATIONS.includes(
			petAnimation as (typeof PET_IDLE_ANIMATIONS)[number],
		)
			? petAnimation
			: DEFAULT_PET_ANIMATION;
		const preferred =
			runtimeState.activity === "idle"
				? preferredIdleAnimation
				: runtimeState.animation;
		return PET_ANIMATIONS.includes(preferred)
			? preferred
			: DEFAULT_PET_ANIMATION;
	}, [petAnimation, runtimeState.activity, runtimeState.animation]);

	const displayAnimation = hasPlayedIntro ? currentAnimation : "begin";
	const shouldLoop = PET_LOOPING_ANIMATIONS.includes(
		displayAnimation as (typeof PET_LOOPING_ANIMATIONS)[number],
	);

	// ── Settings & runtime state sync ────────────────────────────

	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		const syncFromStorage = (event: StorageEvent) => {
			if (event.key === "clawx-settings") void initSettings();
		};
		window.addEventListener("storage", syncFromStorage);
		return () => window.removeEventListener("storage", syncFromStorage);
	}, [initSettings]);

	useEffect(() => {
		const htmlStyle = document.documentElement.style;
		const bodyStyle = document.body.style;
		const rootStyle = document.getElementById("root")?.style;
		const prev = {
			htmlBg: htmlStyle.background,
			bodyBg: bodyStyle.background,
			rootBg: rootStyle?.background ?? "",
			bodyOverflow: bodyStyle.overflow,
			bodyMargin: bodyStyle.margin,
		};
		htmlStyle.background = "transparent";
		bodyStyle.background = "transparent";
		bodyStyle.overflow = "hidden";
		bodyStyle.margin = "0";
		if (rootStyle) rootStyle.background = "transparent";
		return () => {
			htmlStyle.background = prev.htmlBg;
			bodyStyle.background = prev.bodyBg;
			bodyStyle.overflow = prev.bodyOverflow;
			bodyStyle.margin = prev.bodyMargin;
			if (rootStyle) rootStyle.background = prev.rootBg;
		};
	}, []);

	useEffect(() => {
		void invokeIpc<PetRuntimeState>("pet:getRuntimeState")
			.then((state) => {
				if (state && typeof state === "object") setRuntimeState(state);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:settings-updated",
			() => { void initSettings(); },
		);
		return () => { unsubscribe?.(); };
	}, [initSettings]);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:runtime-state",
			(payload) => {
				if (payload && typeof payload === "object") {
					setRuntimeState(payload as PetRuntimeState);
				}
			},
		);
		return () => { unsubscribe?.(); };
	}, []);

	// ── Translate bubble ─────────────────────────────────────────

	const dismissBubble = useCallback(() => {
		setTranslateBubble(null);
		if (dismissTimerRef.current) {
			clearTimeout(dismissTimerRef.current);
			dismissTimerRef.current = null;
		}
	}, []);

	useEffect(() => {
		const unsubscribe = window.electron.ipcRenderer.on(
			"pet:clipboard-changed",
			(payload) => {
				const { text } = payload as { text: string };
				if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
				setTranslateBubble({ text });
				dismissTimerRef.current = setTimeout(dismissBubble, TRANSLATE_BUBBLE_TTL_MS);
			},
		);
		return () => {
			unsubscribe?.();
			if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
		};
	}, [dismissBubble]);

	// ── Mouse pass-through setup ──────────────────────────────────
	// By default the entire window ignores mouse events (they fall through to
	// whatever is behind). When the cursor enters the pet's video area we
	// temporarily capture events so drag/click works. `forward: true` ensures
	// the renderer still receives forwarded events in pass-through mode so
	// onMouseEnter/onMouseLeave fire correctly.

	useEffect(() => {
		void invokeIpc("pet:setIgnoreMouseEvents", true, { forward: true });
		return () => {
			// Restore normal behaviour when the component unmounts
			void invokeIpc("pet:setIgnoreMouseEvents", false);
		};
	}, []);

	// ── Drag & click handlers (attached to document during drag) ─

	const handleVideoMouseDown = useCallback((e: MouseEvent<HTMLButtonElement>) => {
		if (e.button !== 0) return;

		const startScreenX = e.screenX;
		const startScreenY = e.screenY;
		const startWinX = window.screenX;
		const startWinY = window.screenY;
		let lastMoveAt = 0;
		isDragging.current = false;

		const onMove = (ev: globalThis.MouseEvent) => {
			const dx = ev.screenX - startScreenX;
			const dy = ev.screenY - startScreenY;

			if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX) {
				isDragging.current = true;
			}

			if (isDragging.current) {
				const now = Date.now();
				if (now - lastMoveAt >= MOVE_THROTTLE_MS) {
					lastMoveAt = now;
					void invokeIpc("pet:move", {
						x: startWinX + dx,
						y: startWinY + dy,
					});
				}
			}
		};

		const onUp = () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);

			if (!isDragging.current) {
				const now = Date.now();
				if (now - lastToggleAt.current >= TOGGLE_DEBOUNCE_MS) {
					lastToggleAt.current = now;
					void invokeIpc("pet:toggleMiniChat");
				}
			}
			isDragging.current = false;
		};

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
	}, []);

	const handleVideoMouseEnter = useCallback(() => {
		void invokeIpc("pet:setIgnoreMouseEvents", false);
	}, []);

	const handleVideoMouseLeave = useCallback(() => {
		// Don't pass through while dragging — the drag tracks the mouse globally
		if (!isDragging.current) {
			void invokeIpc("pet:setIgnoreMouseEvents", true, { forward: true });
		}
	}, []);

	return (
		<div className="relative flex h-screen w-screen items-end justify-center overflow-visible bg-transparent">
			{/* Translate bubble — appears when clipboard text changes */}
			{translateBubble && (
				<div className="pointer-events-none absolute top-2 left-1/2 z-30 w-[290px] -translate-x-1/2">
					{/* biome-ignore lint/a11y/noStaticElementInteractions: hover handlers toggle Electron setIgnoreMouseEvents, not DOM interactivity */}
					<div
						className="pointer-events-auto flex items-center gap-2 rounded-[12px] border border-white/10 bg-black/75 px-3 py-2 shadow-[0_4px_18px_rgba(0,0,0,0.35)] backdrop-blur-[6px]"
						onMouseEnter={handleVideoMouseEnter}
						onMouseLeave={handleVideoMouseLeave}
					>
						<span className="shrink-0 text-base" aria-hidden="true">🌐</span>
						<span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-white/80">
							{translateBubble.text.length > 24
								? `${translateBubble.text.slice(0, 24)}…`
								: translateBubble.text}
						</span>
						<button
							type="button"
							className="shrink-0 rounded-[6px] bg-blue-500/90 px-2 py-0.5 text-[11px] font-semibold text-white transition-all hover:bg-blue-400 active:scale-95"
							onClick={() => {
								const prompt = `请帮我翻译以下内容：\n\n${translateBubble.text}`;
								void invokeIpc("pet:openMiniChatWithMessage", prompt);
								dismissBubble();
							}}
						>
							翻译
						</button>
						<button
							type="button"
							className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[13px] leading-none text-white/45 transition-colors hover:text-white/80"
							onClick={dismissBubble}
							aria-label="关闭"
						>
							×
						</button>
					</div>
				</div>
			)}

			{runtimeState.showTerminal && (
				<div className="pointer-events-none absolute bottom-[150px] left-1/2 z-20 w-[85%] max-w-[260px] -translate-x-1/2 rounded-[14px] border border-white/10 bg-black/72 px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-[4px]">
					<div className="mb-1.5 flex items-center gap-1.5">
						<span className="h-2 w-2 rounded-full bg-rose-400/75" />
						<span className="h-2 w-2 rounded-full bg-amber-300/75" />
						<span className="h-2 w-2 rounded-full bg-emerald-400/75" />
						<span className="ml-auto h-1 w-1 animate-pulse rounded-full bg-emerald-400/80" />
					</div>
					<div className="space-y-[3px] font-mono">
						{runtimeState.terminalLines.length > 0 ? (
							runtimeState.terminalLines.map((line, i) => (
								<div
									key={`${i}-${line.slice(0, 8)}`}
									className="truncate text-[10px] leading-tight"
									style={{
										color: `rgba(${i === runtimeState.terminalLines.length - 1 ? "110,231,183" : "134,239,172"}, ${i === runtimeState.terminalLines.length - 1 ? 0.9 : 0.45})`,
									}}
								>
									{line}
								</div>
							))
						) : (
							<>
								<div className="h-[9px] w-[82%] animate-pulse rounded-full bg-emerald-300/50" />
								<div className="h-[9px] w-[60%] animate-pulse rounded-full bg-emerald-200/35 [animation-delay:180ms]" />
								<div className="h-[9px] w-[70%] animate-pulse rounded-full bg-emerald-100/25 [animation-delay:320ms]" />
							</>
						)}
					</div>
				</div>
			)}

			{/* Interactive area: only the pet character itself captures mouse events */}
			<button
				type="button"
				className="relative z-10 cursor-pointer border-0 bg-transparent p-0 select-none"
				onMouseEnter={handleVideoMouseEnter}
				onMouseLeave={handleVideoMouseLeave}
				onMouseDown={handleVideoMouseDown}
				onContextMenu={(event: MouseEvent<HTMLButtonElement>) => {
					event.preventDefault();
					void invokeIpc("pet:showContextMenu", {
						x: event.clientX,
						y: event.clientY,
						language: i18n.resolvedLanguage || i18n.language,
					});
				}}
				title="点击打开快捷聊天 · 拖动移位"
			>
				<video
					key={displayAnimation}
					ref={videoRef}
					className="h-[200px] w-[200px] object-contain pointer-events-none"
					src={PET_ANIMATION_SOURCES[displayAnimation]}
					autoPlay
					loop={shouldLoop}
					muted
					playsInline
					onLoadedData={(e) => {
						const video = e.currentTarget;
						video.currentTime = 0;
						void video.play().catch(() => {});
					}}
					onEnded={() => {
						if (!hasPlayedIntro && displayAnimation === "begin") {
							setHasPlayedIntro(true);
						}
					}}
				/>
			</button>
		</div>
	);
}
