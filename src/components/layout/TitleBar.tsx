/**
 * TitleBar Component
 * macOS: drag region with sidebar restore + management menu.
 * Windows: drag region with custom controls + management menu.
 * Linux: keep native frame, but still expose overlay controls for consistency.
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Minus,
	Square,
	X,
	Copy,
	PanelLeft,
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

type TitleBarProps = {
	className?: string;
};

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
			<button
				type="button"
				onClick={() => setOpen((state) => !state)}
				className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
				aria-label={t("sidebar.management", { defaultValue: "管理入口" })}
			>
				<Ellipsis className="h-4.5 w-4.5" />
			</button>
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

export function TitleBar({ className = "" }: TitleBarProps) {
	const platform = window.electron?.platform;
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const setSidebarCollapsed = useSettingsStore(
		(state) => state.setSidebarCollapsed,
	);

	if (platform === "darwin") {
		return (
			<div
				className={`drag-region h-10 w-full shrink-0 bg-transparent absolute top-0 left-0 z-[100] ${className}`.trim()}
			>
				{sidebarCollapsed ? (
					<div className="no-drag absolute left-[74px] top-1/2 -translate-y-1/2">
						<button
							type="button"
							onClick={() => setSidebarCollapsed(false)}
							className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
							aria-label="Show sidebar"
						>
							<PanelLeft className="h-4.5 w-4.5" />
						</button>
					</div>
				) : null}
				<div className="no-drag absolute right-3 top-1/2 -translate-y-1/2">
					<ManagementMenu />
				</div>
			</div>
		);
	}

	if (platform !== "win32") {
		return (
			<div
				className={`pointer-events-none h-10 w-full shrink-0 bg-transparent absolute top-0 left-0 z-[100] ${className}`.trim()}
			>
				{sidebarCollapsed ? (
					<div className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2">
						<button
							type="button"
							onClick={() => setSidebarCollapsed(false)}
							className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
							aria-label="Show sidebar"
						>
							<PanelLeft className="h-4.5 w-4.5" />
						</button>
					</div>
				) : null}
				<div className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2">
					<ManagementMenu />
				</div>
			</div>
		);
	}

	return (
		<WindowsTitleBar
			className={className}
			sidebarCollapsed={sidebarCollapsed}
			onShowSidebar={() => setSidebarCollapsed(false)}
		/>
	);
}

function WindowsTitleBar({
	className = "",
	sidebarCollapsed,
	onShowSidebar,
}: TitleBarProps & {
	sidebarCollapsed: boolean;
	onShowSidebar: () => void;
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
				{sidebarCollapsed ? (
					<button
						type="button"
						onClick={onShowSidebar}
						className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
						aria-label="Show sidebar"
					>
						<PanelLeft className="h-4.5 w-4.5" />
					</button>
				) : null}
			</div>

			<div className="no-drag flex h-full items-center gap-1 pr-1 pointer-events-auto">
				<ManagementMenu />
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
