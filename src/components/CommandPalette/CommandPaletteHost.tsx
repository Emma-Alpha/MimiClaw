import { memo, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { CommandPalette } from "./CommandPalette";
import { useCommandPaletteStore } from "./store";
import { useCommandPaletteData } from "./useCommandPaletteData";

export const CommandPaletteHost = memo(function CommandPaletteHost() {
	const { t } = useTranslation();
	const open = useCommandPaletteStore((s) => s.open);
	const setOpen = useCommandPaletteStore((s) => s.setOpen);
	const toggle = useCommandPaletteStore((s) => s.toggle);
	const groups = useCommandPaletteData(open);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isCmdK =
				(event.metaKey || event.ctrlKey) &&
				!event.altKey &&
				!event.shiftKey &&
				event.key.toLowerCase() === "k";
			if (!isCmdK) return;
			event.preventDefault();
			toggle();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [toggle]);

	return (
		<CommandPalette
			open={open}
			onOpenChange={setOpen}
			placeholder={t("commandPalette.placeholder", {
				defaultValue: "搜索命令、对话、项目…",
			})}
			emptyText={t("commandPalette.empty", { defaultValue: "无匹配结果" })}
			dialogLabel={t("commandPalette.dialogLabel", {
				defaultValue: "命令面板",
			})}
			groups={groups}
		/>
	);
});
