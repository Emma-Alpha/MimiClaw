/**
 * TitleBar Component
 * macOS: drag region with sidebar restore + management menu.
 * Windows: drag region with custom controls + management menu.
 * Linux: keep native frame, but still expose overlay controls for consistency.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Minus,
	Square,
	X,
	Copy,
	PanelLeft,
	PanelLeftClose,
	Ellipsis,
	Cpu,
	Bot,
	Network,
	Puzzle,
	Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { invokeIpc } from "@/lib/api-client";
import { useSettingsStore } from "@/stores/settings";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type TitleBarProps = {
	className?: string;
	hideManagementMenu?: boolean;
	hideSidebarToggle?: boolean;
};

type SidebarToggleButtonProps = {
	sidebarCollapsed: boolean;
	onToggle: () => void;
	ariaLabel: string;
	tooltipLabel: string;
	shortcutLabel: string;
};

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	if (target.isContentEditable) {
		return true;
	}
	const tagName = target.tagName;
	if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
		return true;
	}
	return target.getAttribute("role") === "textbox";
}

function TooltipLabel({
	label,
	shortcut,
}: {
	label: string;
	shortcut?: string;
}) {
	return (
		<div className="flex items-center gap-2 whitespace-nowrap">
			<span>{label}</span>
			{shortcut ? (
				<span className="rounded-[4px] bg-white/18 px-1.5 py-[1px] text-[11px] font-medium tracking-wide text-white/95">
					{shortcut}
				</span>
			) : null}
		</div>
	);
}

function SidebarToggleButton({
	sidebarCollapsed,
	onToggle,
	ariaLabel,
}: SidebarToggleButtonProps) {
	return (
		<button
			type="button"
			onClick={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onToggle();
			}}
			style={{ WebkitAppRegion: 'no-drag' } as any}
			className="no-drag pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md text-foreground/75 transition-all duration-150 hover:bg-black/[0.07] hover:text-foreground dark:hover:bg-white/[0.12]"
			aria-label={ariaLabel}
			title={ariaLabel}
		>
			{sidebarCollapsed ? (
				<PanelLeft className="h-[16px] w-[16px]" />
			) : (
				<PanelLeftClose className="h-[16px] w-[16px]" />
			)}
		</button>
	);
}

function ManagementMenu({
	className = "",
}: {
	className?: string;
}) {
	const { t } = useTranslation("common");
	const navigate = useNavigate();
	const location = useLocation();
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	const items = useMemo(
		() => [
			{
				to: "/models",
				label: t("sidebar.models"),
				icon: <Cpu className="h-[15px] w-[15px]" strokeWidth={2} />,
			},
			{
				to: "/agents",
				label: t("sidebar.agents"),
				icon: <Bot className="h-[15px] w-[15px]" strokeWidth={2} />,
			},
			{
				to: "/channels",
				label: t("sidebar.channels"),
				icon: <Network className="h-[15px] w-[15px]" strokeWidth={2} />,
			},
			{
				to: "/skills",
				label: t("sidebar.skills"),
				icon: <Puzzle className="h-[15px] w-[15px]" strokeWidth={2} />,
			},
			{
				to: "/cron",
				label: t("sidebar.cronTasks"),
				icon: <Clock className="h-[15px] w-[15px]" strokeWidth={2} />,
			},
		],
		[t],
	);

	useEffect(() => {
		if (!open) return;
		const handlePointerDown = (event: MouseEvent) => {
			if (!menuRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		window.addEventListener("mousedown", handlePointerDown);
		return () => {
			window.removeEventListener("mousedown", handlePointerDown);
		};
	}, [open]);

	return (
		<div ref={menuRef} className={cn("relative", className)}>
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						onClick={() => setOpen((state) => !state)}
						className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
						aria-label={t("sidebar.management", { defaultValue: "管理入口" })}
					>
						<Ellipsis className="h-4.5 w-4.5" />
					</button>
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					align="end"
					className="border-none bg-black/90 px-2.5 py-1.5 text-[12px] text-white shadow-lg dark:bg-black/90"
				>
					<TooltipLabel
						label={t("sidebar.management", { defaultValue: "管理入口" })}
					/>
				</TooltipContent>
			</Tooltip>
			{open ? (
				<div className="absolute right-0 top-full z-[140] mt-2 w-48 rounded-xl border border-black/[0.08] bg-white/95 p-1 shadow-xl backdrop-blur dark:border-white/[0.1] dark:bg-[#202329]/95">
					{items.map((item) => {
						const isActive = location.pathname === item.to
							|| location.pathname.startsWith(`${item.to}/`);
						return (
							<button
								key={item.to}
								type="button"
								onClick={() => {
									navigate(item.to);
									setOpen(false);
								}}
								className={cn(
									"flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors",
									isActive
										? "bg-black/[0.07] text-foreground dark:bg-white/[0.14]"
										: "text-foreground/80 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]",
								)}
							>
								<span className="text-muted-foreground">{item.icon}</span>
								<span>{item.label}</span>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

export function TitleBar({
	className = "",
	hideManagementMenu = false,
	hideSidebarToggle = false,
}: TitleBarProps) {
	const platform = window.electron?.platform;
	const { t } = useTranslation("common");
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const setSidebarCollapsed = useSettingsStore(
		(state) => state.setSidebarCollapsed,
	);
	const sidebarShortcutLabel = platform === "darwin" ? "⌘B" : "Ctrl+B";
	const sidebarToggleTooltipLabel = t("sidebar.toggleSidebar", {
		defaultValue: "切换边栏",
	});
	const sidebarToggleAriaLabel = sidebarCollapsed
		? t("sidebar.expandSidebar", { defaultValue: "展开侧边栏" })
		: t("sidebar.collapseSidebar", { defaultValue: "收起侧边栏" });

	const toggleSidebar = useCallback(() => {
		const nextCollapsed = !useSettingsStore.getState().sidebarCollapsed;
		setSidebarCollapsed(nextCollapsed);
	}, [setSidebarCollapsed]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.repeat) return;
			const normalized = event.key.toLowerCase();
			if (normalized !== "b" || event.altKey || event.shiftKey) return;
			const hasShortcutModifier = platform === "darwin"
				? event.metaKey
				: event.ctrlKey;
			if (!hasShortcutModifier || isEditableTarget(event.target)) return;
			event.preventDefault();
			toggleSidebar();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [platform, toggleSidebar]);

	const sidebarToggleControl = (
		<SidebarToggleButton
			sidebarCollapsed={sidebarCollapsed}
			onToggle={toggleSidebar}
			ariaLabel={sidebarToggleAriaLabel}
			tooltipLabel={sidebarToggleTooltipLabel}
			shortcutLabel={sidebarShortcutLabel}
		/>
	);

	if (platform === "darwin") {
		return (
			<div
				className={`drag-region h-10 w-full shrink-0 bg-transparent absolute top-0 left-0 z-[100] ${className}`.trim()}
			>
				{hideSidebarToggle ? null : (
					<div
						className="absolute left-[80px] top-[10px] pointer-events-auto"
						style={{ WebkitAppRegion: 'no-drag' } as any}
					>
						{sidebarToggleControl}
					</div>
				)}
				{hideManagementMenu ? null : (
					<div className="no-drag pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2">
						<ManagementMenu />
					</div>
				)}
			</div>
		);
	}

	if (platform !== "win32") {
		return (
			<div
				className={`pointer-events-none h-10 w-full shrink-0 bg-transparent absolute top-0 left-0 z-[100] ${className}`.trim()}
			>
				{hideSidebarToggle ? null : (
					<div
						className="pointer-events-auto absolute left-3 top-[10px]"
						style={{ WebkitAppRegion: 'no-drag' } as any}
					>
						{sidebarToggleControl}
					</div>
				)}
				{hideManagementMenu ? null : (
					<div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2">
						<ManagementMenu />
					</div>
				)}
			</div>
		);
	}

	return (
		<WindowsTitleBar
			className={className}
			sidebarCollapsed={sidebarCollapsed}
			onToggleSidebar={toggleSidebar}
			sidebarToggleAriaLabel={sidebarToggleAriaLabel}
			sidebarToggleTooltipLabel={sidebarToggleTooltipLabel}
			sidebarShortcutLabel={sidebarShortcutLabel}
			hideManagementMenu={hideManagementMenu}
			hideSidebarToggle={hideSidebarToggle}
		/>
	);
}

function WindowsTitleBar({
	className = "",
	sidebarCollapsed,
	onToggleSidebar,
	sidebarToggleAriaLabel,
	sidebarToggleTooltipLabel,
	sidebarShortcutLabel,
	hideManagementMenu,
	hideSidebarToggle,
}: TitleBarProps & {
	sidebarCollapsed: boolean;
	onToggleSidebar: () => void;
	sidebarToggleAriaLabel: string;
	sidebarToggleTooltipLabel: string;
	sidebarShortcutLabel: string;
	hideManagementMenu: boolean;
	hideSidebarToggle?: boolean;
}) {
	const [maximized, setMaximized] = useState(false);

	useEffect(() => {
		invokeIpc("window:isMaximized").then((value) => {
			setMaximized(value as boolean);
		});
	}, []);

	const handleMinimize = () => {
		invokeIpc("window:minimize");
	};

	const handleMaximize = () => {
		invokeIpc("window:maximize").then(() => {
			invokeIpc("window:isMaximized").then((value) => {
				setMaximized(value as boolean);
			});
		});
	};

	const handleClose = () => {
		invokeIpc("window:close");
	};

	return (
		<div
			className={`drag-region flex h-10 w-full shrink-0 items-center justify-between bg-transparent absolute top-0 left-0 z-[100] ${className}`.trim()}
		>
			<div className="no-drag flex h-full items-center pl-2">
				{hideSidebarToggle ? null : (
					<SidebarToggleButton
						sidebarCollapsed={sidebarCollapsed}
						onToggle={onToggleSidebar}
						ariaLabel={sidebarToggleAriaLabel}
						tooltipLabel={sidebarToggleTooltipLabel}
						shortcutLabel={sidebarShortcutLabel}
					/>
				)}
			</div>

			<div className="no-drag flex h-full items-center gap-1 pr-1 pointer-events-auto">
				{hideManagementMenu ? null : <ManagementMenu />}
				<button
					onClick={handleMinimize}
					className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent"
					title="Minimize"
					type="button"
				>
					<Minus className="h-4 w-4" />
				</button>
				<button
					onClick={handleMaximize}
					className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-accent"
					title={maximized ? "Restore" : "Maximize"}
					type="button"
				>
					{maximized ? (
						<Copy className="h-3.5 w-3.5" />
					) : (
						<Square className="h-3.5 w-3.5" />
					)}
				</button>
				<button
					onClick={handleClose}
					className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-red-500 hover:text-white"
					title="Close"
					type="button"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
