/**
 * TitleBar Component
 * macOS: drag region with sidebar restore + management menu.
 * Windows: drag region with custom controls + management menu.
 * Linux: keep native frame, but still expose overlay controls for consistency.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
	Minus,
	Square,
	X,
	Copy,
	Ellipsis,
	Cpu,
	Blocks,
	Puzzle,
	Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { createStyles } from "antd-style";
import { invokeIpc } from "@/lib/api-client";
import { SidebarToggleButton } from "@/components/layout/SidebarToggleButton";
import {
	CHAT_HEADER_HEIGHT,
	DEFAULT_HEADER_SIDE_PADDING,
	getCollapsedSidebarToggleReserve,
	useTitlebarSafeInsets,
} from "@/lib/titlebar-safe-area";
import { useSettingsStore } from "@/stores/settings";
void Ellipsis;

const TITLEBAR_CONTROL_SIZE = 28;
const TITLEBAR_CONTROL_TOP = Math.max(
	0,
	Math.round((CHAT_HEADER_HEIGHT - TITLEBAR_CONTROL_SIZE) / 2),
);

const useStyles = createStyles(({ token, css }) => ({
	managementMenuWrap: css`
		position: relative;
	`,
	managementMenuDropdown: css`
		position: absolute;
		right: 0;
		top: calc(100% + 8px);
		z-index: 140;
		width: 192px;
		border-radius: ${token.borderRadiusLG}px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorBgElevated};
		padding: 4px;
		box-shadow: ${token.boxShadowSecondary};
	`,
	managementMenuItem: css`
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		border-radius: ${token.borderRadius}px;
		padding: 8px 10px;
		font-size: 13px;
		text-align: left;
		border: none;
		background: transparent;
		cursor: pointer;
		color: ${token.colorTextSecondary};
		transition: background 0.12s ease, color 0.12s ease;

		&:hover {
			background: ${token.colorFillSecondary};
			color: ${token.colorText};
		}
	`,
	managementMenuItemActive: css`
		background: ${token.colorFillTertiary};
		color: ${token.colorText};
	`,
	managementMenuIcon: css`
		color: ${token.colorTextTertiary};
	`,
	// macOS title bar
	macTitleBar: css`
		height: ${CHAT_HEADER_HEIGHT}px;
		width: 100%;
		flex-shrink: 0;
		background: transparent;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
	`,
	macSidebarToggleArea: css`
		position: absolute;
		pointer-events: auto;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	`,
	macFloatingSidebarToggle: css`
		position: absolute;
		pointer-events: auto;
		z-index: 120;
		display: flex;
		align-items: center;
		justify-content: center;
	`,
	macRightArea: css`
		pointer-events: auto;
		position: absolute;
		display: flex;
		align-items: center;
		gap: 4px;
		z-index: 1;
	`,
	// Linux title bar
	linuxTitleBar: css`
		height: 40px;
		width: 100%;
		flex-shrink: 0;
		background: transparent;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
	`,
	linuxSidebarToggleArea: css`
		pointer-events: auto;
		position: absolute;
		left: 12px;
		top: 10px;
	`,
	linuxRightArea: css`
		pointer-events: auto;
		position: absolute;
		right: 12px;
		top: 10px;
		display: flex;
		align-items: center;
		gap: 4px;
	`,
	// Windows title bar
	winTitleBar: css`
		display: flex;
		height: 40px;
		width: 100%;
		flex-shrink: 0;
		align-items: center;
		justify-content: space-between;
		background: transparent;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 100;
		pointer-events: none;
	`,
	winLeft: css`
		display: flex;
		height: 100%;
		align-items: center;
		padding-left: 8px;
		pointer-events: auto;
	`,
	winRight: css`
		display: flex;
		height: 100%;
		align-items: center;
		gap: 4px;
		padding-right: 4px;
		pointer-events: auto;
	`,
	winControlBtn: css`
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		width: 44px;
		border: none;
		background: transparent;
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease;

		&:hover {
			background: ${token.colorFillSecondary};
			color: ${token.colorText};
		}
	`,
	winCloseBtn: css`
		&:hover {
			background: #ef4444;
			color: #fff;
		}
	`,
}));

type TitleBarProps = {
	className?: string;
	style?: React.CSSProperties;
	hideManagementMenu?: boolean;
	hideSidebarToggle?: boolean;
	rightContent?: ReactNode;
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

function ManagementMenu({
	className = "",
}: {
	className?: string;
}) {
	void className;
	const { styles, cx } = useStyles();
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
				icon: <Cpu style={{ width: 15, height: 15 }} strokeWidth={2} />,
			},
			{
				to: "/plugins",
				label: t("sidebar.plugins"),
				icon: <Blocks style={{ width: 15, height: 15 }} strokeWidth={2} />,
			},
			{
				to: "/skills",
				label: t("sidebar.skills"),
				icon: <Puzzle style={{ width: 15, height: 15 }} strokeWidth={2} />,
			},
			{
				to: "/cron",
				label: t("sidebar.cronTasks"),
				icon: <Clock style={{ width: 15, height: 15 }} strokeWidth={2} />,
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
		<div ref={menuRef} className={styles.managementMenuWrap}>
			{open ? (
				<div className={styles.managementMenuDropdown}>
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
								className={cx(
									styles.managementMenuItem,
									isActive && styles.managementMenuItemActive,
								)}
							>
								<span className={styles.managementMenuIcon}>{item.icon}</span>
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
	style,
	hideManagementMenu = false,
	hideSidebarToggle = false,
	rightContent,
}: TitleBarProps) {
	const { styles, cx } = useStyles();
	const platform = window.electron?.platform;
	const { t } = useTranslation("common");
	const safeInsets = useTitlebarSafeInsets();
	const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
	const setSidebarCollapsed = useSettingsStore(
		(state) => state.setSidebarCollapsed,
	);
	const sidebarToggleReserve = getCollapsedSidebarToggleReserve(platform);
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
		/>
	);

	const macSidebarToggleAreaStyle = {
		WebkitAppRegion: "no-drag",
		height: TITLEBAR_CONTROL_SIZE,
		left: `${safeInsets.left}px`,
		top: `${TITLEBAR_CONTROL_TOP}px`,
		width: `${sidebarToggleReserve}px`,
	} as const;
	const macRightAreaStyle = {
		WebkitAppRegion: "no-drag",
		right: `${Math.max(DEFAULT_HEADER_SIDE_PADDING, safeInsets.right + DEFAULT_HEADER_SIDE_PADDING)}px`,
		top: `${TITLEBAR_CONTROL_TOP}px`,
	} as const;

	if (platform === "darwin") {
		return (
			<>
				<div
					className={cx(styles.macTitleBar, className)}
					style={{ WebkitAppRegion: 'drag', ...style } as any}
				>
					{hideSidebarToggle || sidebarCollapsed ? null : (
						<div
							className={styles.macSidebarToggleArea}
							style={macSidebarToggleAreaStyle as React.CSSProperties}
						>
							{sidebarToggleControl}
						</div>
					)}
					<div
						className={styles.macRightArea}
						style={macRightAreaStyle as React.CSSProperties}
					>
						{rightContent}
						{hideManagementMenu ? null : <ManagementMenu />}
					</div>
				</div>
				{hideSidebarToggle || !sidebarCollapsed ? null : (
					<div
						className={styles.macFloatingSidebarToggle}
						style={macSidebarToggleAreaStyle as React.CSSProperties}
					>
						{sidebarToggleControl}
					</div>
				)}
			</>
		);
	}

	if (platform !== "win32") {
		return (
			<div className={cx(styles.linuxTitleBar, className)} style={style}>
				{hideSidebarToggle ? null : (
					<div
						className={styles.linuxSidebarToggleArea}
						style={{ WebkitAppRegion: 'no-drag' } as any}
					>
						{sidebarToggleControl}
					</div>
				)}
				<div
					className={styles.linuxRightArea}
					style={{ WebkitAppRegion: 'no-drag' } as any}
				>
					{rightContent}
					{hideManagementMenu ? null : <ManagementMenu />}
				</div>
			</div>
		);
	}

	return (
		<WindowsTitleBar
			className={className}
			sidebarCollapsed={sidebarCollapsed}
			onToggleSidebar={toggleSidebar}
			sidebarToggleAriaLabel={sidebarToggleAriaLabel}
			hideManagementMenu={hideManagementMenu}
			hideSidebarToggle={hideSidebarToggle}
			rightContent={rightContent}
		/>
	);
}

function WindowsTitleBar({
	className = "",
	sidebarCollapsed,
	onToggleSidebar,
	sidebarToggleAriaLabel,
	hideManagementMenu,
	hideSidebarToggle,
	rightContent,
}: TitleBarProps & {
	sidebarCollapsed: boolean;
	onToggleSidebar: () => void;
	sidebarToggleAriaLabel: string;
	hideManagementMenu: boolean;
	hideSidebarToggle?: boolean;
}) {
	const { styles, cx } = useStyles();
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
			className={cx(styles.winTitleBar, className)}
			style={{ WebkitAppRegion: 'drag' } as any}
		>
			<div className={styles.winLeft} style={{ WebkitAppRegion: 'no-drag' } as any}>
				{hideSidebarToggle ? null : (
					<SidebarToggleButton
						sidebarCollapsed={sidebarCollapsed}
						onToggle={onToggleSidebar}
						ariaLabel={sidebarToggleAriaLabel}
					/>
				)}
			</div>

			<div className={styles.winRight} style={{ WebkitAppRegion: 'no-drag' } as any}>
				{hideManagementMenu ? null : <ManagementMenu />}
				{rightContent}
				<button
					onClick={handleMinimize}
					className={styles.winControlBtn}
					title="Minimize"
					type="button"
				>
					<Minus style={{ width: 16, height: 16 }} />
				</button>
				<button
					onClick={handleMaximize}
					className={styles.winControlBtn}
					title={maximized ? "Restore" : "Maximize"}
					type="button"
				>
					{maximized ? (
						<Copy style={{ width: 14, height: 14 }} />
					) : (
						<Square style={{ width: 14, height: 14 }} />
					)}
				</button>
				<button
					onClick={handleClose}
					className={cx(styles.winControlBtn, styles.winCloseBtn)}
					title="Close"
					type="button"
				>
					<X style={{ width: 16, height: 16 }} />
				</button>
			</div>
		</div>
	);
}
