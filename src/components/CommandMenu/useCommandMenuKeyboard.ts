import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback } from "react";
import type { CommandMenuItem, CommandMenuGroup } from "./index";
import { getCommandMenuItemCount } from "./index";

/**
 * Resolve a flat activeIndex to the corresponding CommandMenuItem.
 */
function getItemAtIndex(
	groups: CommandMenuGroup[],
	flatIndex: number,
): CommandMenuItem | null {
	let offset = 0;
	for (const g of groups) {
		if (flatIndex < offset + g.items.length) {
			return g.items[flatIndex - offset];
		}
		offset += g.items.length;
	}
	return null;
}

export interface UseCommandMenuKeyboardOptions {
	open: boolean;
	groups: CommandMenuGroup[];
	activeIndex: number;
	onActiveIndexChange: (index: number) => void;
	onSelect: (item: CommandMenuItem) => void;
}

/**
 * Returns an onKeyDown handler that intercepts ArrowUp / ArrowDown / Enter / Escape
 * when the command menu is open. Attach this to the input element.
 *
 * - ArrowUp/ArrowDown: cycle through items (wrapping)
 * - Enter: select the active item
 * - Escape: handled by the caller (close the menu)
 *
 * The handler calls `event.preventDefault()` for consumed keys so that
 * the parent input does not move the cursor or submit.
 */
export function useCommandMenuKeyboard({
	open,
	groups,
	activeIndex,
	onActiveIndexChange,
	onSelect,
}: UseCommandMenuKeyboardOptions) {
	const handleKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLElement>) => {
			if (!open) return;

			const total = getCommandMenuItemCount(groups);
			if (total === 0) return;

			switch (event.key) {
				case "ArrowDown": {
					event.preventDefault();
					const next = activeIndex < total - 1 ? activeIndex + 1 : 0;
					onActiveIndexChange(next);
					break;
				}
				case "ArrowUp": {
					event.preventDefault();
					const prev = activeIndex > 0 ? activeIndex - 1 : total - 1;
					onActiveIndexChange(prev);
					break;
				}
				case "Enter": {
					const item = getItemAtIndex(groups, activeIndex);
					if (item) {
						event.preventDefault();
						onSelect(item);
					}
					break;
				}
				case "Tab": {
					// Tab also selects in command menus (like Codex)
					const item = getItemAtIndex(groups, activeIndex);
					if (item) {
						event.preventDefault();
						onSelect(item);
					}
					break;
				}
				default:
					break;
			}
		},
		[open, groups, activeIndex, onActiveIndexChange, onSelect],
	);

	return handleKeyDown;
}
