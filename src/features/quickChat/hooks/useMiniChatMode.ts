import { useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Quick chat popup route (`/quick-chat`) should use the compact UI.
 * Any embedded/full-window route should use the full composer controls.
 */
export function useMiniChatMode() {
	const location = useLocation();

	return useMemo(() => {
		return location.pathname.startsWith("/quick-chat");
	}, [location.pathname]);
}
