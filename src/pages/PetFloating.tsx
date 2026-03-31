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

export function PetFloating() {
	const { i18n } = useTranslation("settings");
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const initSettings = useSettingsStore((state) => state.init);
	const petAnimation = useSettingsStore((state) => state.petAnimation);
	const [runtimeState, setRuntimeState] = useState<PetRuntimeState>(
		FALLBACK_RUNTIME_STATE,
	);
	const [hasPlayedIntro, setHasPlayedIntro] = useState(false);

	// ── Toggle debounce ──────────────────────────────────────────
	const lastToggleAt = useRef(0);

	// ── Custom drag state ─────────────────────────────────────────
	const dragRef = useRef<{
		mouseScreenX: number;
		mouseScreenY: number;
		winX: number;
		winY: number;
		dragging: boolean;
		lastMoveAt: number;
	} | null>(null);

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

	useEffect(() => {
		void initSettings();
	}, [initSettings]);

	useEffect(() => {
		const syncFromStorage = (event: StorageEvent) => {
			if (event.key === "clawx-settings") {
				void initSettings();
			}
		};
		window.addEventListener("storage", syncFromStorage);
		return () => window.removeEventListener("storage", syncFromStorage);
	}, [initSettings]);

	useEffect(() => {
		const htmlStyle = document.documentElement.style;
		const bodyStyle = document.body.style;
		const rootStyle = document.getElementById("root")?.style;
		const previous = {
			htmlBackground: htmlStyle.background,
			bodyBackground: bodyStyle.background,
			rootBackground: rootStyle?.background ?? "",
			bodyOverflow: bodyStyle.overflow,
			bodyMargin: bodyStyle.margin,
		};

		htmlStyle.background = "transparent";
		bodyStyle.background = "transparent";
		bodyStyle.overflow = "hidden";
		bodyStyle.margin = "0";
		if (rootStyle) rootStyle.background = "transparent";

		return () => {
			htmlStyle.background = previous.htmlBackground;
			bodyStyle.background = previous.bodyBackground;
			bodyStyle.overflow = previous.bodyOverflow;
			bodyStyle.margin = previous.bodyMargin;
			if (rootStyle) rootStyle.background = previous.rootBackground;
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

	// ── Drag + click handlers ─────────────────────────────────────
	// Note: We do NOT use -webkit-app-region:drag here because that CSS property
	// intercepts all left-button mouse events at the OS level, preventing
	// onMouseDown/onMouseUp from firing in React. Instead, we implement dragging
	// via IPC (pet:move → BrowserWindow.setPosition) so we can distinguish
	// a click (< DRAG_THRESHOLD_PX movement) from a real drag.

	const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		dragRef.current = {
			mouseScreenX: e.screenX,
			mouseScreenY: e.screenY,
			winX: window.screenX,
			winY: window.screenY,
			dragging: false,
			lastMoveAt: 0,
		};
	}, []);

	const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (!drag) return;

		const dx = e.screenX - drag.mouseScreenX;
		const dy = e.screenY - drag.mouseScreenY;

		if (!drag.dragging && Math.sqrt(dx * dx + dy * dy) >= DRAG_THRESHOLD_PX) {
			drag.dragging = true;
		}

		if (drag.dragging) {
			const now = Date.now();
			if (now - drag.lastMoveAt >= MOVE_THROTTLE_MS) {
				drag.lastMoveAt = now;
				void invokeIpc("pet:move", {
					x: drag.winX + dx,
					y: drag.winY + dy,
				});
			}
		}
	}, []);

	const handleMouseUp = useCallback(() => {
		const drag = dragRef.current;
		dragRef.current = null;
		if (!drag) return;
		if (!drag.dragging) {
			const now = Date.now();
			if (now - lastToggleAt.current >= TOGGLE_DEBOUNCE_MS) {
				lastToggleAt.current = now;
				void invokeIpc("pet:toggleMiniChat");
			}
		}
	}, []);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pet surface — custom drag + click detection; context menu via right-click
		<div
			className="relative flex h-screen w-screen cursor-pointer items-end justify-center overflow-visible bg-transparent select-none"
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onContextMenu={(event: MouseEvent<HTMLDivElement>) => {
				event.preventDefault();
				void invokeIpc("pet:showContextMenu", {
					x: event.clientX,
					y: event.clientY,
					language: i18n.resolvedLanguage || i18n.language,
				});
			}}
		>
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

			<video
				key={displayAnimation}
				ref={videoRef}
				className="relative z-10 h-[200px] w-[200px] object-contain pointer-events-none"
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
		</div>
	);
}
