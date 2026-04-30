import type { ReactNode } from "react";

export interface CommandPaletteItem {
	id: string;
	label: ReactNode;
	description?: string;
	keywords?: string[];
	shortcut?: string[];
	icon?: ReactNode;
	onSelect: () => void;
}

export interface CommandPaletteGroup {
	id: string;
	heading: string;
	items: CommandPaletteItem[];
}
