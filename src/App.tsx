/**
 * Root Application Component
 * Handles routing and global providers
 */
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Toaster } from "sonner";
import { ModalHost } from "@lobehub/ui";
import i18n from "./i18n";
import { MainLayout } from "./components/layout/MainLayout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Models } from "./pages/Models";
import { UnifiedChatPage } from "./features/chat/pages/UnifiedChatPage";
import { Plugins } from "./pages/Plugins";
import { Skills } from "./pages/Skills";
import { SkillsStorePage } from "./pages/Skills/store";
import { Cron } from "./pages/Cron";
import { Settings } from "./pages/Settings";
import { CodeAgent } from "./pages/CodeAgent";
import { PetFloating } from "./pages/PetFloating";
import { PetBubble } from "./pages/PetBubble";
import { PetCompanion } from "./pages/PetCompanion";
import { VoiceDialog } from "./pages/VoiceDialog";
import { TrayRuntime } from "./pages/TrayRuntime";
import { MiniChat } from "./pages/MiniChat";
import { Setup } from "./pages/Setup";
import { Login } from "./pages/Login";
import { useSettingsStore } from "./stores/settings";
import { useGatewayStore } from "./stores/gateway";
import { applyGatewayTransportPreference, invokeIpc } from "./lib/api-client";
import { ThemeWrapper } from "./components/theme/ThemeWrapper";
import { UpdateBootstrap } from "@/components/update/UpdateBootstrap";

function LegacyCodeQuickChatRedirect() {
	const location = useLocation();

	return <Navigate to={`/chat/code${location.search}`} replace />;
}

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
					<h1 style={{ fontSize: "14px", marginBottom: "16px" }}>
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
	const isPetBubbleRoute = location.pathname.startsWith("/pet-bubble");
	const isPetRoute =
		location.pathname === "/pet" || location.pathname.startsWith("/pet/");
	const isCodeChatRoute = location.pathname.startsWith("/quick-chat");
	const isPetCompanionRoute = location.pathname.startsWith("/pet-companion");
	const isVoiceDialogRoute = location.pathname.startsWith("/voice-dialog");
	const isTrayRuntimeRoute = location.pathname.startsWith("/tray-runtime");
	const isMiniChatRoute = location.pathname.startsWith("/mini-chat");
	const isMainChatRoute =
		location.pathname === "/" || location.pathname.startsWith("/chat");

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
		if (
			!isPetRoute &&
			!isPetBubbleRoute &&
			!isCodeChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute &&
			!isTrayRuntimeRoute
		) {
			initGateway();
		}
	}, [
		initGateway,
		isCodeChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isTrayRuntimeRoute,
		isVoiceDialogRoute,
	]);

	// Gate 1: Must be logged in first in all environments.
	useEffect(() => {
		if (
			!cloudLoggedIn &&
			!location.pathname.startsWith("/login") &&
			!isPetRoute &&
			!isPetBubbleRoute &&
			!isCodeChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute &&
			!isTrayRuntimeRoute &&
			!isMiniChatRoute
		) {
			navigate("/login", { replace: true });
		}
	}, [
		cloudLoggedIn,
		isCodeChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isTrayRuntimeRoute,
		isVoiceDialogRoute,
		isMiniChatRoute,
		location.pathname,
		navigate,
	]);

	// Gate 2: After login, redirect to setup wizard if onboarding not complete.
	useEffect(() => {
		const passedLoginGate = cloudLoggedIn;
		if (
			passedLoginGate &&
			!setupComplete &&
			!location.pathname.startsWith("/setup") &&
			!location.pathname.startsWith("/login") &&
			!isPetRoute &&
			!isPetBubbleRoute &&
			!isCodeChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute &&
			!isTrayRuntimeRoute &&
			!isMiniChatRoute
		) {
			navigate("/setup", { replace: true });
		}
	}, [
		cloudLoggedIn,
		isCodeChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isTrayRuntimeRoute,
		isVoiceDialogRoute,
		isMiniChatRoute,
		setupComplete,
		location.pathname,
		navigate,
	]);

	// Listen for navigation events from main process
	useEffect(() => {
		const handleNavigate = (...args: unknown[]) => {
			const path = args[0];
			if (typeof path === "string") {
				navigate(path);
			}
		};

		const handleScreenshot = () => {
			window.sessionStorage.setItem("mimiclaw:capture-screenshot", "1");
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
		if (
			isPetRoute ||
			isPetBubbleRoute ||
			isCodeChatRoute ||
			isPetCompanionRoute ||
			isVoiceDialogRoute ||
			isTrayRuntimeRoute ||
			isMainChatRoute
		)
			return;
		void invokeIpc("pet:setUiActivity", { activity: "idle" }).catch(
			() => {},
		);
	}, [
		isMainChatRoute,
		isCodeChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isTrayRuntimeRoute,
		isVoiceDialogRoute,
	]);

	return (
		<ErrorBoundary>
			<ThemeWrapper>
				<TooltipProvider>
					{!isPetRoute &&
					!isPetBubbleRoute &&
					!isCodeChatRoute &&
					!isPetCompanionRoute &&
					!isVoiceDialogRoute &&
					!isTrayRuntimeRoute &&
					!isMiniChatRoute ? (
						<UpdateBootstrap />
					) : null}
					<Routes>
						{/* Cloud login gate */}
						<Route path="/login" element={<Login />} />

						{/* Setup / cloud onboarding wizard */}
						<Route path="/setup/*" element={<Setup />} />

						{/* Floating pet window */}
						<Route path="/pet" element={<PetFloating />} />
						<Route path="/pet-bubble" element={<PetBubble />} />

						{/* Legacy quick chat entry now redirects to chat/code */}
						<Route path="/quick-chat" element={<Navigate to="/chat/code" replace />} />
						<Route path="/pet-companion" element={<PetCompanion />} />
						<Route path="/voice-dialog" element={<VoiceDialog />} />
						<Route path="/tray-runtime" element={<TrayRuntime />} />
						<Route path="/mini-chat" element={<MiniChat />} />

						{/* Main application routes */}
						<Route element={<MainLayout />}>
							<Route path="/" element={<Navigate to="/chat/code" replace />} />
							<Route path="/chat" element={<Navigate to="/chat/code" replace />} />
							<Route path="/chat/:kind" element={<UnifiedChatPage />} />
							<Route path="/models" element={<Models />} />
							<Route path="/plugins" element={<Plugins />} />
							<Route path="/agents" element={<Navigate to="/plugins" replace />} />
							<Route path="/channels" element={<Navigate to="/plugins" replace />} />
							<Route path="/skills" element={<Skills />} />
							<Route path="/skills/store" element={<SkillsStorePage />} />
							<Route path="/cron" element={<Cron />} />
							<Route path="/code-agent/quick-chat" element={<LegacyCodeQuickChatRedirect />} />
							<Route path="/code-agent" element={<CodeAgent />} />
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
					<ModalHost />
				</TooltipProvider>
			</ThemeWrapper>
		</ErrorBoundary>
	);
}

export default App;
