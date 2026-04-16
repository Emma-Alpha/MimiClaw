import {
	type Dispatch,
	type SetStateAction,
	useCallback,
} from "react";
import {
	readFileAsBase64,
	type FileAttachment,
} from "@/features/mainChat/lib/composer-helpers";
import { invokeIpc } from "@/lib/api-client";
import { hostApiFetch } from "@/lib/host-api";
import {
	mergeUnifiedComposerPaths,
	type UnifiedComposerPath,
} from "@/lib/unified-composer";
import { toast } from "sonner";

type Params = {
	setAttachments: Dispatch<SetStateAction<FileAttachment[]>>;
	setDroppedPaths: Dispatch<SetStateAction<UnifiedComposerPath[]>>;
};

export function useMiniChatAttachmentActions({
	setAttachments,
	setDroppedPaths,
}: Params) {
	const applyDroppedPaths = useCallback((dropped: UnifiedComposerPath[]) => {
		if (!Array.isArray(dropped) || dropped.length === 0) return;
		setDroppedPaths((current) => {
			const merged = mergeUnifiedComposerPaths(current, dropped);
			if (merged.length <= 20) return merged;
			queueMicrotask(() => {
				toast.warning("最多可附加 20 个文件/文件夹");
			});
			return merged.slice(0, 20);
		});
	}, [setDroppedPaths]);

	const handleUploadFile = useCallback(async () => {
		try {
			const result = (await invokeIpc("dialog:open", {
				properties: ["openFile", "multiSelections"],
			})) as { canceled: boolean; filePaths?: string[] };
			if (result.canceled || !result.filePaths?.length) return;

			const tempIds: string[] = [];
			for (const filePath of result.filePaths) {
				const tempId = crypto.randomUUID();
				tempIds.push(tempId);
				const fileName = filePath.split(/[\\/]/).pop() || "file";
				setAttachments((previous) => [
					...previous,
					{
						id: tempId,
						fileName,
						mimeType: "",
						fileSize: 0,
						stagedPath: "",
						preview: null,
						status: "staging",
					},
				]);
			}

			const staged = await hostApiFetch<
				Array<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>
			>("/api/files/stage-paths", {
				method: "POST",
				body: JSON.stringify({ filePaths: result.filePaths }),
			});

			setAttachments((previous) => {
				let updated = [...previous];
				for (let index = 0; index < tempIds.length; index += 1) {
					const data = staged[index];
					updated = updated.map((attachment) =>
						attachment.id === tempIds[index]
							? data
								? { ...data, status: "ready" as const }
								: {
										...attachment,
										status: "error" as const,
										error: "Staging failed",
									}
							: attachment,
					);
				}
				return updated;
			});
		} catch (error) {
			setAttachments((previous) =>
				previous.map((attachment) =>
					attachment.status === "staging"
						? { ...attachment, status: "error" as const, error: String(error) }
						: attachment,
				),
			);
		}
	}, [setAttachments]);

	const handleUploadFolder = useCallback(async () => {
		const result = (await invokeIpc("dialog:open", {
			properties: ["openDirectory", "multiSelections"],
		})) as { canceled: boolean; filePaths?: string[] };
		if (result.canceled || !result.filePaths?.length) return;

		const folderPaths: UnifiedComposerPath[] = result.filePaths.map(
			(absolutePath) => ({
				absolutePath,
				name: absolutePath.split(/[\\/]/).pop() || absolutePath,
				isDirectory: true,
			}),
		);
		applyDroppedPaths(folderPaths);
	}, [applyDroppedPaths]);

	const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
		for (const file of files) {
			const tempId = crypto.randomUUID();
			setAttachments((previous) => [
				...previous,
				{
					id: tempId,
					fileName: file.name,
					mimeType: file.type || "application/octet-stream",
					fileSize: file.size,
					stagedPath: "",
					preview: null,
					status: "staging",
				},
			]);
			try {
				const base64 = await readFileAsBase64(file);
				const staged = await hostApiFetch<{
					id: string;
					fileName: string;
					mimeType: string;
					fileSize: number;
					stagedPath: string;
					preview: string | null;
				}>("/api/files/stage-buffer", {
					method: "POST",
					body: JSON.stringify({
						base64,
						fileName: file.name,
						mimeType: file.type || "application/octet-stream",
					}),
				});
				setAttachments((previous) =>
					previous.map((attachment) =>
						attachment.id === tempId
							? { ...staged, status: "ready" as const }
							: attachment,
					),
				);
			} catch (error) {
				setAttachments((previous) =>
					previous.map((attachment) =>
						attachment.id === tempId
							? {
									...attachment,
									status: "error" as const,
									error: String(error),
								}
							: attachment,
					),
				);
			}
		}
	}, [setAttachments]);

	const handleScreenshot = useCallback(async () => {
		let tempId: string | null = null;

		try {
			await invokeIpc("pet:pushTerminalLine", "› 启动截图工具...");
			const screenshot = await window.electron.captureScreenshot();

			const nextTempId = crypto.randomUUID();
			tempId = nextTempId;
			setAttachments((previous) => [
				...previous,
				{
					id: nextTempId,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
					fileSize: screenshot.fileSize,
					stagedPath: "",
					preview: screenshot.preview,
					status: "staging",
				},
			]);

			await invokeIpc("pet:pushTerminalLine", "› 正在上传截图...");

			const staged = await hostApiFetch<{
				id: string;
				fileName: string;
				mimeType: string;
				fileSize: number;
				stagedPath: string;
				preview: string | null;
			}>("/api/files/stage-buffer", {
				method: "POST",
				body: JSON.stringify({
					base64: screenshot.base64,
					fileName: screenshot.fileName,
					mimeType: screenshot.mimeType,
				}),
			});

			setAttachments((previous) =>
				previous.map((attachment) =>
					attachment.id === nextTempId
						? { ...staged, status: "ready" as const }
						: attachment,
				),
			);

			await invokeIpc(
				"pet:pushTerminalLine",
				`› 截图上传成功: ${staged.fileName}`,
			);
		} catch (error) {
			if (
				typeof error === "string"
				&& error.includes("timed out or was cancelled")
			) {
				await invokeIpc("pet:pushTerminalLine", "› 截图已取消");
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((previous) =>
						previous.filter((attachment) => attachment.id !== idToRemove),
					);
				}
			} else {
				console.error("Screenshot failed:", error);
				await invokeIpc("pet:pushTerminalLine", "› 截图失败");
				if (tempId) {
					const idToRemove = tempId;
					setAttachments((previous) =>
						previous.map((attachment) =>
							attachment.id === idToRemove
								? {
										...attachment,
										status: "error" as const,
										error: String(error),
									}
								: attachment,
						),
					);
				}
			}
		}
	}, [setAttachments]);

	return {
		applyDroppedPaths,
		handleUploadFile,
		handleUploadFolder,
		stageBufferFiles,
		handleScreenshot,
	};
}
