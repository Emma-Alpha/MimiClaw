import { Navigate, useParams } from "react-router-dom";

import { useStyles } from "./RemoteWebviewPage.styles";

interface WebviewSiteConfig {
	partition: string;
	url: string;
}

const WEBVIEW_SITE_CONFIG = {
	jizhi: {
		partition: "persist:webview-jizhi",
		url: "https://jizhi.gz4399.com/",
	},
	zhihui: {
		partition: "persist:webview-zhihui",
		url: "https://artflow.gz4399.com/",
	},
} as const satisfies Record<string, WebviewSiteConfig>;

type WebviewSite = keyof typeof WEBVIEW_SITE_CONFIG;

function isWebviewSite(value: string): value is WebviewSite {
	return value in WEBVIEW_SITE_CONFIG;
}

export function RemoteWebviewPage() {
	const { styles } = useStyles();
	const { site } = useParams<{ site?: string }>();
	const config = site && isWebviewSite(site) ? WEBVIEW_SITE_CONFIG[site] : undefined;

	if (!config) {
		return <Navigate to="/chat/openclaw" replace />;
	}

	return (
		<div className={styles.root}>
			<webview
				key={site}
				className={styles.webview}
				src={config.url}
				allowpopups
				partition={config.partition}
			/>
		</div>
	);
}
