import { createPortal } from "react-dom";
import {
	useEffect,
	useMemo,
	useState,
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
} from "react";
import { createStyles } from "antd-style";
import { Button } from "antd";
import { Loader2, Send, Square, X, FileText, Film, Music, FileArchive, File as FileIcon } from "lucide-react";
import type { UnifiedComposerPath } from "@/lib/unified-composer";
import { UnifiedComposerInput } from "./unified-composer-input";
import { formatFileSize, type FileAttachment } from "./composer-helpers";

export type { FileAttachment } from "./composer-helpers";

export type ComposerVariant = "desktop" | "compact";

type SendTexts = {
	send?: string;
	stop?: string;
	warp?: string;
};

type TextareaExtraProps = {
	onPaste?: React.ClipboardEventHandler<HTMLDivElement>;
	onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
};

interface ComposerBaseProps {
	variant: ComposerVariant;
	value: string;
	onInput: (value: string) => void;
	onSend: () => void;
	onStop?: () => void;
	loading?: boolean;
	disabled?: boolean;
	sendDisabled?: boolean;
	placeholder?: string;
	className?: string;
	leftActions?: ReactNode;
	rightActions?: ReactNode;
	topActions?: ReactNode;
	overlay?: ReactNode;
	attachments?: FileAttachment[];
	paths?: UnifiedComposerPath[];
	onPathsChange?: (paths: UnifiedComposerPath[]) => void;
	onRemoveAttachment?: (id: string) => void;
	textareaProps?: TextareaExtraProps;
	sendTexts?: SendTexts;
	submitOnEnter?: boolean;
	dragOver?: boolean;
	onDragOver?: React.DragEventHandler<HTMLDivElement>;
	onDragLeave?: React.DragEventHandler<HTMLDivElement>;
	onDrop?: React.DragEventHandler<HTMLDivElement>;
}

interface ComposerIconButtonProps {
	variant: ComposerVariant;
	icon: ReactNode;
	title?: string;
	onClick?: () => void;
	active?: boolean;
	disabled?: boolean;
	danger?: boolean;
}

interface ComposerChipProps {
	variant: ComposerVariant;
	children: ReactNode;
	icon?: ReactNode;
	title?: string;
	onClick?: () => void;
	onRemove?: () => void;
	removableTitle?: string;
}

const useStyles = createStyles(({ token, css }) => ({
	shell: css`
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		border-radius: 20px;
		overflow: visible;
		transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
	`,
	shellDesktop: css`
		padding: 8px 10px 8px;
		background: ${token.colorBgContainer};
		border: 0.5px solid ${token.colorBorderSecondary};
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.08);
		backdrop-filter: blur(16px);

		@supports (color: color-mix(in srgb, white 50%, black)) {
			background: color-mix(in srgb, ${token.colorBgContainer} 90%, transparent);
		}

		&:focus-within {
			border-color: ${token.colorBorderSecondary};
			box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.12);
		}
	`,
	shellCompact: css`
		border-radius: 16px;
		padding: 8px 10px 8px;
		background: ${token.colorBgContainer};
		border: 1px solid ${token.colorBorderSecondary};
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);

		&:focus-within {
			border-color: ${token.colorBorder};
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
		}
	`,
	shellDragOver: css`
		border-color: ${token.colorPrimary};
		box-shadow: 0 0 0 2px ${token.colorPrimaryBorder};
		background: ${token.colorPrimaryBg};
	`,
	attachmentRow: css`
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 6px;
	`,
	inputWrap: css`
		position: relative;
		width: 100%;
		padding: 0 4px;
	`,
	inputEditor: css`
		width: 100%;
		padding: 0;
		line-height: 1.5;
		font-size: 13px;
		box-shadow: none !important;
		background: transparent;
		white-space: pre-wrap;
		word-break: break-word;
		outline: none;
		color: ${token.colorText};
		caret-color: ${token.colorText};
		overflow: auto;
	`,
	inputEditorDesktop: css`
		min-height: 24px;
		max-height: 200px;
		font-size: 13px;
		line-height: 1.5;
	`,
	inputEditorCompact: css`
		min-height: 24px;
		max-height: 112px;
	`,
	inputPlaceholder: css`
		color: ${token.colorTextQuaternary};
		pointer-events: none;
		user-select: none;
	`,
	pathChip: css`
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 6px 3px 8px;
		border-radius: 999px;
		background: ${token.colorFillQuaternary};
		border: 1px solid ${token.colorBorderSecondary};
		font-size: 12px;
		color: ${token.colorText};
		max-width: 260px;
		cursor: text;
		vertical-align: middle;
	`,
	pathChipIcon: css`
		color: ${token.colorTextTertiary};
		flex-shrink: 0;
	`,
	pathChipName: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		color: ${token.colorText};
		font-size: 12px;
		font-weight: 500;
	`,
	pathChipRemove: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 999px;
		border: none;
		background: transparent;
		color: ${token.colorTextQuaternary};
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;

		&:hover {
			background: ${token.colorFillSecondary};
			color: ${token.colorTextSecondary};
		}
	`,
	bottomRow: css`
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
		margin-top: 5px;
		padding: 0 2px;
	`,
	topActionsRow: css`
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 4px;
		&:empty {
			display: none;
		}
	`,
	leftActions: css`
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-items: center;
		gap: 5px;
		min-width: 0;
	`,
	rightActions: css`
		display: flex;
		flex-shrink: 0;
		align-items: center;
		gap: 5px;

		& > * {
			margin: 0 !important;
		}
	`,
	iconButton: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 1px solid transparent;
		background: transparent;
		color: ${token.colorTextSecondary};
		cursor: pointer;
		transition: all 0.18s ease;

		&:hover:not(:disabled) {
			background: ${token.colorFillTertiary};
			@supports (color: color-mix(in srgb, white 50%, black)) {
				background: color-mix(in srgb, ${token.colorText} 6%, transparent);
			}
			color: ${token.colorText};
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.45;
		}
	`,
	iconButtonDesktop: css`
		width: 28px;
		height: 28px;
	`,
	iconButtonCompact: css`
		width: 28px;
		height: 28px;
	`,
	iconButtonActive: css`
		border-color: ${token.colorPrimaryBorder};
		background: ${token.colorPrimaryBg};
		color: ${token.colorPrimary};
	`,
	iconButtonDanger: css`
		border-color: rgba(239, 68, 68, 0.22);
		background: rgba(239, 68, 68, 0.08);
		color: #ef4444;
	`,
	chip: css`
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		max-width: 100%;
		border-radius: 999px;
		border: 1px solid ${token.colorBorderSecondary};
		background: ${token.colorFillQuaternary};
		color: ${token.colorTextSecondary};
		transition: all 0.18s ease;
	`,
	chipButton: css`
		cursor: pointer;

		&:hover {
			background: ${token.colorFillTertiary};
			color: ${token.colorText};
		}
	`,
	chipDesktop: css`
		padding: 6px 10px;
		font-size: 12px;
	`,
	chipCompact: css`
		padding: 4px 8px;
		font-size: 11px;
	`,
	chipLabel: css`
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	chipRemove: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		padding: 0;
		opacity: 0.7;

		&:hover {
			background: ${token.colorFillSecondary};
			opacity: 1;
		}
	`,
	compactSendButton: css`
		&& {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		min-width: 28px;
		height: 28px;
		padding: 0 !important;
		border: none !important;
		border-radius: 999px;
		background: ${token.colorText} !important;
		color: ${token.colorBgContainer} !important;
		cursor: pointer;
		transition: background 0.16s ease, opacity 0.16s ease;
		line-height: 1;
		box-shadow: none;
		}

		& .ant-btn-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			margin-inline-end: 0;
			line-height: 0;
		}

		&:hover:not(:disabled) {
			opacity: 0.92;
		}

		&:focus-visible {
			outline: 2px solid ${token.colorText};
			outline-offset: 2px;
		}

		&:disabled {
			opacity: 0.5 !important;
			cursor: not-allowed;
			background: ${token.colorText} !important;
			color: ${token.colorBgContainer} !important;
		}
	`,
	sendButtonSending: css`
		&& {
			background: ${token.colorTextSecondary} !important;
			color: ${token.colorBgContainer} !important;
		}
	`,
	previewCard: css`
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		border: 1px solid ${token.colorBorder};
		background: ${token.colorFillQuaternary};
		transition: all 0.2s ease;
	`,
	previewFile: css`
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 6px 10px;
		background: rgba(0, 0, 0, 0.04);
		max-width: 180px;
	`,
	previewMeta: css`
		min-width: 0;
		overflow: hidden;
	`,
	previewName: css`
		font-size: 11px;
		font-weight: 500;
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
	previewSize: css`
		font-size: 10px;
		margin: 0;
		opacity: 0.6;
	`,
	previewOverlay: css`
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	`,
	previewError: css`
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
		font-size: 10px;
		font-weight: 500;
	`,
	previewLoading: css`
		background: rgba(0, 0, 0, 0.4);
		color: white;
	`,
	previewRemove: css`
		position: absolute;
		top: -6px;
		right: -6px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: ${token.colorError};
		color: #fff;
		border: 2px solid ${token.colorBgContainer};
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		padding: 0;
		transition: transform 0.18s ease, background 0.18s ease;

		&:hover {
			transform: scale(1.08);
			background: ${token.colorErrorHover};
		}
	`,
	lightboxBackdrop: css`
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(4px);
	`,
	lightboxPanel: css`
		position: relative;
		max-width: 90vw;
		max-height: 88vh;
	`,
	lightboxImage: css`
		display: block;
		max-width: 100%;
		max-height: 88vh;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
	`,
	lightboxClose: css`
		position: absolute;
		top: -16px;
		right: -16px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: white;
		cursor: pointer;
		padding: 0;
	`,
	iconNode: css`
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	`,
	truncate: css`
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	`,
}));

function FileIconComp({
	mimeType,
	style,
}: {
	mimeType: string;
	style?: CSSProperties;
}) {
	if (mimeType.startsWith("video/")) return <Film style={style} />;
	if (mimeType.startsWith("audio/")) return <Music style={style} />;
	if (
		mimeType.startsWith("text/")
		|| mimeType === "application/json"
		|| mimeType === "application/xml"
	) {
		return <FileText style={style} />;
	}
	if (
		mimeType.includes("zip")
		|| mimeType.includes("compressed")
		|| mimeType.includes("archive")
		|| mimeType.includes("tar")
		|| mimeType.includes("rar")
		|| mimeType.includes("7z")
	) {
		return <FileArchive style={style} />;
	}
	if (mimeType === "application/pdf") return <FileText style={style} />;
	return <FileIcon style={style} />;
}

export function ImageLightbox({
	src,
	fileName,
	onClose,
}: {
	src: string;
	fileName: string;
	onClose: () => void;
}) {
	const { styles } = useStyles();

	useEffect(() => {
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [onClose]);

	return createPortal(
		// biome-ignore lint/a11y/noStaticElementInteractions: lightbox backdrop
		// biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handles keyboard close
		<div className={styles.lightboxBackdrop} onClick={onClose}>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop propagation */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation */}
			<div className={styles.lightboxPanel} onClick={(event) => event.stopPropagation()}>
				<img className={styles.lightboxImage} src={src} alt={fileName} />
				<button
					type="button"
					className={styles.lightboxClose}
					onClick={onClose}
					title="Close preview"
				>
					<X style={{ width: 16, height: 16 }} />
				</button>
			</div>
		</div>,
		document.body,
	);
}

export function ComposerAttachmentPreview({
	attachment,
	onRemove,
	onPreview,
}: {
	attachment: FileAttachment;
	onRemove: () => void;
	onPreview: (src: string, fileName: string) => void;
}) {
	const { styles } = useStyles();
	const isImage = attachment.mimeType.startsWith("image/") && attachment.preview;

	return (
		<div className={styles.previewCard}>
			{isImage ? (
				<button
					type="button"
					onClick={() => onPreview(attachment.preview!, attachment.fileName)}
					style={{
						width: 52,
						height: 52,
						padding: 0,
						border: "none",
						background: "transparent",
						cursor: "zoom-in",
						display: "block",
					}}
					title={attachment.fileName}
				>
					{/* biome-ignore lint/style/noNonNullAssertion: guarded by isImage */}
					<img
						src={attachment.preview!}
						alt={attachment.fileName}
						style={{ width: "100%", height: "100%", objectFit: "cover" }}
					/>
				</button>
			) : (
				<div className={styles.previewFile}>
					<FileIconComp
						mimeType={attachment.mimeType}
						style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.6 }}
					/>
					<div className={styles.previewMeta}>
						<p className={styles.previewName}>{attachment.fileName}</p>
						<p className={styles.previewSize}>
							{attachment.fileSize > 0 ? formatFileSize(attachment.fileSize) : "..."}
						</p>
					</div>
				</div>
			)}

			{attachment.status === "staging" ? (
				<div className={`${styles.previewOverlay} ${styles.previewLoading}`}>
					<Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
				</div>
			) : null}

			{attachment.status === "error" ? (
				<div className={`${styles.previewOverlay} ${styles.previewError}`}>Error</div>
			) : null}

			<button
				type="button"
				className={styles.previewRemove}
				onClick={onRemove}
				title={`Remove ${attachment.fileName}`}
			>
				<X style={{ width: 10, height: 10 }} />
			</button>
		</div>
	);
}

export function ComposerIconButton({
	variant,
	icon,
	title,
	onClick,
	active = false,
	disabled = false,
	danger = false,
}: ComposerIconButtonProps) {
	const { styles, cx } = useStyles();

	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			disabled={disabled}
			className={cx(
				styles.iconButton,
				variant === "compact" ? styles.iconButtonCompact : styles.iconButtonDesktop,
				active && styles.iconButtonActive,
				danger && styles.iconButtonDanger,
			)}
		>
			<span className={styles.iconNode}>{icon}</span>
		</button>
	);
}

export function ComposerChip({
	variant,
	children,
	icon,
	title,
	onClick,
	onRemove,
	removableTitle,
}: ComposerChipProps) {
	const { styles, cx } = useStyles();
	const body = (
		<>
			{icon ? <span className={styles.iconNode}>{icon}</span> : null}
			<span className={styles.chipLabel}>{children}</span>
		</>
	);

	return (
		<div
			className={cx(
				styles.chip,
				variant === "compact" ? styles.chipCompact : styles.chipDesktop,
				onClick && styles.chipButton,
			)}
			title={title}
			onClick={onClick}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onKeyDown={
				onClick
					? (event) => {
						if (event.key === "Enter" || event.key === " ") {
							event.preventDefault();
							onClick();
						}
					}
					: undefined
			}
		>
			{body}
			{onRemove ? (
				<button
					type="button"
					className={styles.chipRemove}
					onClick={(event) => {
						event.stopPropagation();
						onRemove();
					}}
					title={removableTitle}
				>
					<X style={{ width: 10, height: 10 }} />
				</button>
			) : null}
		</div>
	);
}

export function ComposerBase({
	variant,
	value,
	onInput,
	onSend,
	onStop,
	loading = false,
	disabled = false,
	sendDisabled = false,
	placeholder,
	className,
	leftActions,
	rightActions,
	topActions,
	overlay,
	attachments = [],
	paths = [],
	onPathsChange,
	onRemoveAttachment,
	textareaProps,
	sendTexts,
	submitOnEnter = true,
	dragOver = false,
	onDragOver,
	onDragLeave,
	onDrop,
}: ComposerBaseProps) {
	const { styles, cx } = useStyles();
	const [previewImage, setPreviewImage] = useState<{ src: string; fileName: string } | null>(null);

	const compact = variant === "compact";
	const canStop = loading && Boolean(onStop);
	const composerValue = useMemo(
		() => ({ text: value, paths }),
		[value, paths],
	);

	const compactSendDisabled = loading ? !onStop : sendDisabled;
	const sendButtonTitle = canStop ? sendTexts?.stop ?? "停止" : sendTexts?.send ?? "发送";
	const handleComposerChange = (next: { text: string; paths: UnifiedComposerPath[] }) => {
		if (next.text !== value) {
			onInput(next.text);
		}
		if (onPathsChange) {
			const samePaths =
				next.paths.length === paths.length
				&& next.paths.every((item, index) => {
					const current = paths[index];
					return (
						current?.absolutePath === item.absolutePath
						&& current?.name === item.name
						&& current?.isDirectory === item.isDirectory
					);
				});
			if (!samePaths) {
				onPathsChange(next.paths);
			}
		}
	};
	const handlePressEnter = (event: ReactKeyboardEvent<HTMLElement>) => {
		if (!submitOnEnter) return;
		if (event.shiftKey || (event.nativeEvent as KeyboardEvent).isComposing) {
			return;
		}
		event.preventDefault();
		if (loading && onStop) {
			onStop();
			return;
		}
		if (!disabled && !sendDisabled) {
			onSend();
		}
	};

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop */}
			<div
				className={cx(
					styles.shell,
					compact ? styles.shellCompact : styles.shellDesktop,
					dragOver && styles.shellDragOver,
					className,
				)}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				{overlay}

				{attachments.length > 0 ? (
					<div className={styles.attachmentRow}>
						{attachments.map((attachment) => (
							<ComposerAttachmentPreview
								key={attachment.id}
								attachment={attachment}
								onRemove={() => onRemoveAttachment?.(attachment.id)}
								onPreview={(src, fileName) => setPreviewImage({ src, fileName })}
							/>
						))}
					</div>
				) : null}

				{topActions ? (
					<div className={styles.topActionsRow}>{topActions}</div>
				) : null}

				<div className={styles.inputWrap}>
					<UnifiedComposerInput
						value={composerValue}
						onChange={handleComposerChange}
						placeholder={placeholder}
						disabled={disabled}
						className={cx(
							styles.inputEditor,
							compact ? styles.inputEditorCompact : styles.inputEditorDesktop,
						)}
						placeholderClassName={styles.inputPlaceholder}
						pathChipClassName={styles.pathChip}
						pathChipIconClassName={styles.pathChipIcon}
						pathChipNameClassName={styles.pathChipName}
						pathChipRemoveClassName={styles.pathChipRemove}
						onKeyDown={
							textareaProps?.onKeyDown
								? (event) => {
									textareaProps.onKeyDown?.(
										event as unknown as ReactKeyboardEvent<HTMLDivElement>,
									);
								}
								: undefined
						}
						onPaste={textareaProps?.onPaste}
						onPressEnter={handlePressEnter}
					/>
				</div>

				<div className={styles.bottomRow}>
					<div className={styles.leftActions}>{leftActions}</div>
					<div className={styles.rightActions}>
						{rightActions}
						<Button
							htmlType="button"
							className={cx(
								styles.compactSendButton,
								loading && styles.sendButtonSending,
							)}
							onClick={canStop ? onStop : onSend}
							disabled={compactSendDisabled}
							title={sendButtonTitle}
							icon={
								canStop ? (
									<Square style={{ width: 12, height: 12 }} fill="currentColor" />
								) : loading ? (
									<Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
								) : (
									<Send
										style={{
											width: compact ? 14 : 15,
											height: compact ? 14 : 15,
											transform: "translateX(-0.4px) translateY(0.35px)",
										}}
									/>
								)
							}
						/>
					</div>
				</div>
			</div>

			{previewImage ? (
				<ImageLightbox
					src={previewImage.src}
					fileName={previewImage.fileName}
					onClose={() => setPreviewImage(null)}
				/>
			) : null}
		</>
	);
}
