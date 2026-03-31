/**
 * Root Application Component
 * Handles routing and global providers
 */
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Toaster } from "sonner";
import i18n from "./i18n";
import { MainLayout } from "./components/layout/MainLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Models } from "./pages/Models";
import { Chat } from "./pages/Chat";
import { RemoteJizhiChat } from "./pages/RemoteJizhiChat";
import { Agents } from "./pages/Agents";
import { Channels } from "./pages/Channels";
import { Skills } from "./pages/Skills";
import { Cron } from "./pages/Cron";
import { Settings } from "./pages/Settings";
import { PetFloating } from "./pages/PetFloating";
import { MiniChat } from "./pages/MiniChat";
import { Setup } from "./pages/Setup";
import { Login } from "./pages/Login";
import { useSettingsStore } from "./stores/settings";
import { useGatewayStore } from "./stores/gateway";
import { useChatStore } from "./stores/chat";
import { applyGatewayTransportPreference } from "./lib/api-client";
import { ThemeWrapper } from "./components/theme/ThemeWrapper";
import { UpdateBootstrap } from "@/components/update/UpdateBootstrap";

/**
 * Error Boundary to catch and display React rendering errors
 */
class ErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("React Error Boundary caught error:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					style={{
						padding: "40px",
						color: "#f87171",
						background: "#0f172a",
						minHeight: "100vh",
						fontFamily: "monospace",
					}}
				>
					<h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
						Something went wrong
					</h1>
					<pre
						style={{
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							background: "#1e293b",
							padding: "16px",
							borderRadius: "8px",
							fontSize: "14px",
						}}
					>
						{this.state.error?.message}
						{"\n\n"}
						{this.state.error?.stack}
					</pre>
					<button
						type="button"
						onClick={() => {
							this.setState({ hasError: false, error: null });
							window.location.reload();
						}}
						style={{
							marginTop: "16px",
							padding: "8px 16px",
							background: "#3b82f6",
							color: "white",
							border: "none",
							borderRadius: "6px",
							cursor: "pointer",
						}}
					>
						Reload
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}

function App() {
	const navigate = useNavigate();
	const location = useLocation();
	const initSettings = useSettingsStore((state) => state.init);
	const theme = useSettingsStore((state) => state.theme);
	const language = useSettingsStore((state) => state.language);
	const setupComplete = useSettingsStore((state) => state.setupComplete);
	const cloudLoggedIn = useSettingsStore((state) => state.cloudLoggedIn);
	const hydrateCloudAuth = useSettingsStore((state) => state.hydrateCloudAuth);
	const initGateway = useGatewayStore((state) => state.init);
	const chatSending = useChatStore((state) => state.sending);
	const chatStreamingMessage = useChatStore((state) => state.streamingMessage);
	const chatStreamingTools = useChatStore((state) => state.streamingTools);
	const chatPendingFinal = useChatStore((state) => state.pendingFinal);
	const isPetRoute = location.pathname.startsWith("/pet");
	const isMiniChatRoute = location.pathname.startsWith("/mini-chat");
	const isMainChatRoute = location.pathname === "/";

	const petUiActivity = !chatSending
		? "idle"
		: chatPendingFinal || chatStreamingMessage || chatStreamingTools.length > 0
			? "working"
			: "listening";

	useEffect(() => {
		// Restore cloud session from localStorage before any redirect checks.
		hydrateCloudAuth();
		initSettings();
	}, [hydrateCloudAuth, initSettings]);

	// Sync i18n language with persisted settings on mount
	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	// Initialize Gateway connection on mount
	useEffect(() => {
		if (!isPetRoute && !isMiniChatRoute) {
			initGateway();
		}
	}, [initGateway, isPetRoute, isMiniChatRoute]);

	// Gate 1: Must be logged in first in all environments.
	useEffect(() => {
		if (
			!cloudLoggedIn &&
			!location.pathname.startsWith("/login") &&
			!isPetRoute &&
			!isMiniChatRoute
		) {
			navigate("/login", { replace: true });
		}
	}, [cloudLoggedIn, isPetRoute, isMiniChatRoute, location.pathname, navigate]);

	// Gate 2: After login, redirect to setup wizard if onboarding not complete.
	useEffect(() => {
		const passedLoginGate = cloudLoggedIn;
		if (
			passedLoginGate &&
			!setupComplete &&
			!location.pathname.startsWith("/setup") &&
			!location.pathname.startsWith("/login") &&
			!isPetRoute &&
			!isMiniChatRoute
		) {
			navigate("/setup", { replace: true });
		}
	}, [cloudLoggedIn, isPetRoute, isMiniChatRoute, setupComplete, location.pathname, navigate]);

	// Listen for navigation events from main process
	useEffect(() => {
		const handleNavigate = (...args: unknown[]) => {
			const path = args[0];
			if (typeof path === "string") {
				navigate(path);
			}
		};

		const handleScreenshot = () => {
			window.sessionStorage.setItem("clawx:capture-screenshot", "1");
			navigate("/");
		};

		const unsubscribeNavigate = window.electron.ipcRenderer.on(
			"navigate",
			handleNavigate,
		);
		const unsubscribeScreenshot = window.electron.ipcRenderer.on(
			"screenshot:capture",
			handleScreenshot,
		);

		return () => {
			if (typeof unsubscribeNavigate === "function") {
				unsubscribeNavigate();
			}
			if (typeof unsubscribeScreenshot === "function") {
				unsubscribeScreenshot();
			}
		};
	}, [navigate]);

	// Apply theme
	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
				.matches
				? "dark"
				: "light";
			root.classList.add(systemTheme);
		} else {
			root.classList.add(theme);
		}
	}, [theme]);

	useEffect(() => {
		applyGatewayTransportPreference();
	}, []);

	useEffect(() => {
		if (isPetRoute || isMiniChatRoute || isMainChatRoute) return;
		void window.electron.ipcRenderer
			.invoke("pet:setUiActivity", { activity: petUiActivity })
			.catch(() => {});
	}, [isMainChatRoute, isPetRoute, isMiniChatRoute, petUiActivity]);

	return (
		<ErrorBoundary>
			<ThemeWrapper>
				<TooltipProvider delayDuration={300}>
					{!isPetRoute && !isMiniChatRoute ? <UpdateBootstrap /> : null}
					<Routes>
						{/* Cloud login gate */}
						<Route path="/login" element={<Login />} />

						{/* Setup / cloud onboarding wizard */}
						<Route path="/setup/*" element={<Setup />} />

						{/* Floating pet window */}
						<Route path="/pet" element={<PetFloating />} />

						{/* Mini chat popup (opened by clicking the floating pet) */}
						<Route path="/mini-chat" element={<MiniChat />} />

						{/* Main application routes */}
						<Route element={<MainLayout />}>
							<Route path="/" element={<Chat />} />
							<Route path="/jizhi-chat" element={<RemoteJizhiChat />} />
							<Route path="/models" element={<Models />} />
							<Route path="/agents" element={<Agents />} />
							<Route path="/channels" element={<Channels />} />
							<Route path="/skills" element={<Skills />} />
							<Route path="/cron" element={<Cron />} />
							<Route path="/settings/*" element={<Settings />} />
						</Route>
					</Routes>

					{/* Global toast notifications */}
					<Toaster
						position="bottom-right"
						richColors
						closeButton
						style={{ zIndex: 99999 }}
					/>
				</TooltipProvider>
			</ThemeWrapper>
		</ErrorBoundary>
	);
}

export default App;
