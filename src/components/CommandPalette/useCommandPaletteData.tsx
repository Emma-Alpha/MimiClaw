import {
	FolderOpen,
	MessageSquare,
	Moon,
	Plus,
	Puzzle,
	Settings as SettingsIcon,
	Sun,
	Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import {
	fetchCodeAgentSessions,
	fetchDefaultWorkspaceRoot,
} from "@/lib/code-agent";
import { useSettingsStore } from "@/stores/settings";

import type { CommandPaletteGroup } from "./types";

type SessionEntry = {
	sessionId: string;
	title: string;
	workspaceName: string;
	workspaceRoot: string;
	updatedAt: number;
};

const SESSIONS_PER_WORKSPACE = 15;
const MAX_SESSIONS_IN_PALETTE = 30;

/**
 * Aggregates command palette data from settings, navigation, theme, and
 * session APIs. Sessions are fetched lazily once when `open` becomes true.
 */
export function useCommandPaletteData(open: boolean): CommandPaletteGroup[] {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const sidebarThreadWorkspaces = useSettingsStore(
		(s) => s.sidebarThreadWorkspaces,
	);
	const theme = useSettingsStore((s) => s.theme);
	const setTheme = useSettingsStore((s) => s.setTheme);

	const [sessions, setSessions] = useState<SessionEntry[]>([]);
	const didFetchRef = useRef(false);

	useEffect(() => {
		if (!open) {
			didFetchRef.current = false;
			return;
		}
		if (didFetchRef.current) return;
		didFetchRef.current = true;
		let cancelled = false;

		const load = async () => {
			const defaultRoot = await fetchDefaultWorkspaceRoot().catch(() => "");
			const fetchTargets: Array<{ root: string; name: string }> = [];
			if (defaultRoot) {
				fetchTargets.push({
					root: defaultRoot,
					name: t("sidebar.folder.chats", { defaultValue: "对话" }),
				});
			}
			for (const w of sidebarThreadWorkspaces) {
				fetchTargets.push({ root: w.rootPath, name: w.name });
			}

			const results = await Promise.all(
				fetchTargets.map(async (target) => {
					try {
						const list = await fetchCodeAgentSessions(
							target.root,
							SESSIONS_PER_WORKSPACE,
						);
						return list.map<SessionEntry>((s) => ({
							sessionId: s.sessionId,
							title: s.title?.trim() || s.sessionId,
							workspaceName: target.name,
							workspaceRoot: target.root,
							updatedAt: s.updatedAt,
						}));
					} catch {
						return [];
					}
				}),
			);

			if (cancelled) return;
			const flat = results.flat().sort((a, b) => b.updatedAt - a.updatedAt);
			setSessions(flat.slice(0, MAX_SESSIONS_IN_PALETTE));
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [open, sidebarThreadWorkspaces, t]);

	return useMemo<CommandPaletteGroup[]>(() => {
		const navGroup: CommandPaletteGroup = {
			id: "nav",
			heading: t("commandPalette.group.navigation", {
				defaultValue: "导航",
			}),
			items: [
				{
					id: "new-thread",
					label: t("sidebar.newThread", { defaultValue: "新对话" }),
					icon: <Plus size={16} />,
					keywords: ["new", "chat", "thread", "新对话", "对话"],
					onSelect: () => navigate("/"),
				},
				{
					id: "plugins",
					label: t("sidebar.plugins", { defaultValue: "插件" }),
					icon: <Puzzle size={16} />,
					keywords: ["plugin", "extension", "插件"],
					onSelect: () => navigate("/plugins"),
				},
				{
					id: "cron",
					label: t("sidebar.cronTasks", { defaultValue: "自动化" }),
					icon: <Timer size={16} />,
					keywords: ["cron", "automation", "schedule", "自动化", "定时"],
					onSelect: () => navigate("/cron"),
				},
				{
					id: "settings",
					label: t("sidebar.settings", { defaultValue: "设置" }),
					icon: <SettingsIcon size={16} />,
					keywords: ["settings", "preferences", "设置"],
					onSelect: () => navigate("/settings"),
				},
			],
		};

		const projectsGroup: CommandPaletteGroup = {
			id: "projects",
			heading: t("commandPalette.group.projects", {
				defaultValue: "切换项目",
			}),
			items: sidebarThreadWorkspaces.map((w) => ({
				id: w.id,
				label: w.name,
				description: w.rootPath,
				icon: <FolderOpen size={16} />,
				keywords: [w.name, w.rootPath],
				onSelect: () => {
					const params = new URLSearchParams();
					params.set("workspaceRoot", w.rootPath);
					navigate(`/chat/code?${params.toString()}`);
				},
			})),
		};

		const sessionsGroup: CommandPaletteGroup = {
			id: "sessions",
			heading: t("commandPalette.group.recentChats", {
				defaultValue: "最近对话",
			}),
			items: sessions.map((s) => ({
				id: `${s.workspaceRoot}::${s.sessionId}`,
				label: s.title,
				description: s.workspaceName,
				icon: <MessageSquare size={16} />,
				keywords: [s.title, s.workspaceName],
				onSelect: () => {
					const params = new URLSearchParams();
					params.set("workspaceRoot", s.workspaceRoot);
					params.set("sessionId", s.sessionId);
					navigate(`/chat/code?${params.toString()}`);
				},
			})),
		};

		const themeGroup: CommandPaletteGroup = {
			id: "theme",
			heading: t("commandPalette.group.theme", {
				defaultValue: "主题",
			}),
			items: [
				{
					id: "theme-light",
					label: t("commandPalette.theme.light", {
						defaultValue: "切换到浅色主题",
					}),
					icon: <Sun size={16} />,
					keywords: ["theme", "light", "浅色", "主题"],
					onSelect: () => setTheme("light"),
				},
				{
					id: "theme-dark",
					label: t("commandPalette.theme.dark", {
						defaultValue: "切换到深色主题",
					}),
					icon: <Moon size={16} />,
					keywords: ["theme", "dark", "深色", "主题"],
					onSelect: () => setTheme("dark"),
				},
				{
					id: "theme-system",
					label: t("commandPalette.theme.system", {
						defaultValue: "跟随系统主题",
					}),
					icon: <SettingsIcon size={16} />,
					keywords: ["theme", "system", "auto", "系统", "主题"],
					onSelect: () => setTheme("system"),
				},
			].filter((item) => {
				if (item.id === "theme-light") return theme !== "light";
				if (item.id === "theme-dark") return theme !== "dark";
				if (item.id === "theme-system") return theme !== "system";
				return true;
			}),
		};

		return [navGroup, sessionsGroup, projectsGroup, themeGroup];
	}, [navigate, sessions, setTheme, sidebarThreadWorkspaces, t, theme]);
}
