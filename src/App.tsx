/**
 * Root Application Component
 * Handles routing and global providers
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Component, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Toaster } from "sonner";
import { ModalHost } from "@lobehub/ui";
import i18n from "./i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSettingsStore } from "./stores/settings";
import { invokeIpc } from "./lib/api-client";
import { ThemeWrapper } from "./components/theme/ThemeWrapper";
import { UpdateBootstrap } from "@/components/update/UpdateBootstrap";
import { AppRoutes } from "./router/generate-routes";

// ---------------------------------------------------------------------------
// Route classification helpers
// ---------------------------------------------------------------------------

/** Standalone Electron window routes — exempt from auth gates & UpdateBootstrap */
function isStandaloneWindowRoute(pathname: string): boolean {
	if (pathname === "/pet" || pathname.startsWith("/pet/")) return true;
	if (pathname.startsWith("/pet-bubble")) return true;
	if (pathname.startsWith("/pet-companion")) return true;
	if (pathname.startsWith("/voice-dialog")) return true;
	if (pathname.startsWith("/tray-runtime")) return true;
	if (pathname.startsWith("/mini-chat")) return true;
	if (pathname.startsWith("/quick-chat")) return true;
	return false;
}

/** Routes where the pet should NOT be sent to idle */
function shouldSkipIdleActivity(pathname: string): boolean {
	if (pathname === "/" || pathname.startsWith("/chat")) return true;
	if (pathname === "/pet" || pathname.startsWith("/pet/")) return true;
	if (pathname.startsWith("/pet-bubble")) return true;
	if (pathname.startsWith("/pet-companion")) return true;
	if (pathname.startsWith("/voice-dialog")) return true;
	if (pathname.startsWith("/tray-runtime")) return true;
	if (pathname.startsWith("/quick-chat")) return true;
	return false;
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
	const cloudBootstrapped = useSettingsStore((state) => state.cloudBootstrapped);
	const hydrateCloudAuth = useSettingsStore((state) => state.hydrateCloudAuth);
	const bootstrapCloudDefaults = useSettingsStore((state) => state.bootstrapCloudDefaults);

	const isStandalone = isStandaloneWindowRoute(location.pathname);

	useEffect(() => {
		// Restore cloud session from localStorage before any redirect checks.
		hydrateCloudAuth();
		initSettings();
	}, [hydrateCloudAuth, initSettings]);

	// Bootstrap default API keys from env vars after login
	useEffect(() => {
		if (cloudLoggedIn && !cloudBootstrapped) {
			void bootstrapCloudDefaults();
		}
	}, [cloudLoggedIn, cloudBootstrapped, bootstrapCloudDefaults]);

	// Sync i18n language with persisted settings on mount
	useEffect(() => {
		if (language && language !== i18n.language) {
			i18n.changeLanguage(language);
		}
	}, [language]);

	// Gate 1: Must be logged in first in all environments.
	useEffect(() => {
		if (
			!cloudLoggedIn &&
			!isStandalone &&
			!location.pathname.startsWith("/login")
		) {
			navigate("/login", { replace: true });
		}
	}, [cloudLoggedIn, isStandalone, location.pathname, navigate]);

	// Gate 2: After login, redirect to setup wizard if onboarding not complete.
	useEffect(() => {
		if (
			cloudLoggedIn &&
			!setupComplete &&
			!isStandalone &&
			!location.pathname.startsWith("/setup") &&
			!location.pathname.startsWith("/login")
		) {
			navigate("/setup", { replace: true });
		}
	}, [cloudLoggedIn, setupComplete, isStandalone, location.pathname, navigate]);

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

	// Notify pet of idle UI activity on non-active routes
	useEffect(() => {
		if (shouldSkipIdleActivity(location.pathname)) return;
		void invokeIpc("pet:setUiActivity", { activity: "idle" }).catch(
			() => {},
		);
	}, [location.pathname]);

	return (
		<ErrorBoundary>
			<ThemeWrapper>
				<TooltipProvider>
					{!isStandalone ? <UpdateBootstrap /> : null}
					<AppRoutes />
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
