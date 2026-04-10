import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Mini chat popup route (`/mini-chat`) should use the compact UI.
 * Any embedded/full-window route should use the full composer controls.
 */
export function useMiniChatMode() {
	const location = useLocation();

	return useMemo(() => {
		return location.pathname.startsWith("/mini-chat");
	}, [location.pathname]);
}
