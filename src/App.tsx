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
import { JizhiChat } from "./pages/JizhiChat";
import { XiaojiuChat } from "./pages/XiaojiuChat";
import { Agents } from "./pages/Agents";
import { Channels } from "./pages/Channels";
import { Skills } from "./pages/Skills";
import { Cron } from "./pages/Cron";
import { Settings } from "./pages/Settings";
import { CodeAgent } from "./pages/CodeAgent";
import { PetFloating } from "./pages/PetFloating";
import { PetBubble } from "./pages/PetBubble";
import { PetCompanion } from "./pages/PetCompanion";
import { MiniChat } from "./pages/MiniChat";
import { VoiceDialog } from "./pages/VoiceDialog";
import { VoiceChatHistory } from "./pages/VoiceChatHistory";
import { Setup } from "./pages/Setup";
import { Login } from "./pages/Login";
import { useSettingsStore } from "./stores/settings";
import { useGatewayStore } from "./stores/gateway";
import { useChatStore } from "./stores/chat";
import { applyGatewayTransportPreference, invokeIpc } from "./lib/api-client";
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
	const isPetBubbleRoute = location.pathname.startsWith("/pet-bubble");
	const isPetRoute =
		location.pathname === "/pet" || location.pathname.startsWith("/pet/");
	const isMiniChatRoute = location.pathname.startsWith("/mini-chat");
	const isPetCompanionRoute = location.pathname.startsWith("/pet-companion");
	const isVoiceDialogRoute = location.pathname.startsWith("/voice-dialog");
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
		if (
			!isPetRoute &&
			!isPetBubbleRoute &&
			!isMiniChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute
		) {
			initGateway();
		}
	}, [
		initGateway,
		isMiniChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isVoiceDialogRoute,
	]);

	// Gate 1: Must be logged in first in all environments.
	useEffect(() => {
		if (
			!cloudLoggedIn &&
			!location.pathname.startsWith("/login") &&
			!isPetRoute &&
			!isPetBubbleRoute &&
			!isMiniChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute
		) {
			navigate("/login", { replace: true });
		}
	}, [
		cloudLoggedIn,
		isMiniChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isVoiceDialogRoute,
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
			!isMiniChatRoute &&
			!isPetCompanionRoute &&
			!isVoiceDialogRoute
		) {
			navigate("/setup", { replace: true });
		}
	}, [
		cloudLoggedIn,
		isMiniChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isVoiceDialogRoute,
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
			isMiniChatRoute ||
			isPetCompanionRoute ||
			isVoiceDialogRoute ||
			isMainChatRoute
		)
			return;
		void invokeIpc("pet:setUiActivity", { activity: petUiActivity }).catch(
			() => {},
		);
	}, [
		isMainChatRoute,
		isMiniChatRoute,
		isPetCompanionRoute,
		isPetBubbleRoute,
		isPetRoute,
		isVoiceDialogRoute,
		petUiActivity,
	]);

	return (
		<ErrorBoundary>
			<ThemeWrapper>
				<TooltipProvider delayDuration={300}>
					{!isPetRoute &&
					!isPetBubbleRoute &&
					!isMiniChatRoute &&
					!isPetCompanionRoute &&
					!isVoiceDialogRoute ? (
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

						{/* Mini chat popup (opened by clicking the floating pet) */}
						<Route path="/mini-chat" element={<MiniChat />} />
						<Route path="/pet-companion" element={<PetCompanion />} />
						<Route path="/voice-dialog" element={<VoiceDialog />} />

						{/* Main application routes */}
						<Route element={<MainLayout />}>
							<Route path="/" element={<Chat />} />
							<Route path="/xiaojiu-chat" element={<XiaojiuChat />} />
							<Route path="/jizhi-chat" element={<JizhiChat />} />
							<Route path="/voice-chat" element={<VoiceChatHistory />} />
							<Route path="/models" element={<Models />} />
							<Route path="/agents" element={<Agents />} />
							<Route path="/channels" element={<Channels />} />
							<Route path="/skills" element={<Skills />} />
							<Route path="/cron" element={<Cron />} />
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
				</TooltipProvider>
			</ThemeWrapper>
		</ErrorBoundary>
	);
}

export default App;
