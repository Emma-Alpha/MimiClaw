/**
 * Chat Input Component
 * Uses @lobehub/ui sub-components directly:
 *   - ChatInputAreaInner  → styled textarea (Enter to send, Chinese IME, borderless)
 *   - ChatInputActionBar  → toolbar with left/right slots
 *   - ChatSendButton      → send / stop button row with keyboard hints
 * Avoids the DraggablePanel wrapper so it sits correctly inside our flex layout.
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { X, FileText, Film, Music, FileArchive, File, Loader2, AtSign } from 'lucide-react';
import { ActionIcon } from '@lobehub/ui';
import { ChatInputActionBar, ChatInputAreaInner, ChatSendButton } from '@lobehub/ui/chat';
import { PaperClipOutlined } from '@ant-design/icons';
import { createStyles } from 'antd-style';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { useGatewayStore } from '@/stores/gateway';
import { useSettingsStore } from '@/stores/settings';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { AgentSummary } from '@/types/agent';
import { useTranslation } from 'react-i18next';

// ── Styles ───────────────────────────────────────────────────────

const useStyles = createStyles(({ token, css }) => ({
  wrapper: css`
    box-sizing: border-box;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 0 24px 24px;
  `,
  attachmentRow: css`
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  `,
  inputBox: css`
    display: flex;
    flex-direction: column;
    gap: 0px;
    border-radius: 16px;
    border: 1px solid transparent;
    background: ${token.colorBgContainer};
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
    overflow: hidden;
    padding-block: 8px 8px;
    transition: border-color 0.2s, box-shadow 0.2s;

    &:focus-within {
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.08);
    }
  `,
  inputBoxDragOver: css`
    border-color: ${token.colorPrimary};
    box-shadow: 0 0 0 2px ${token.colorPrimaryBorder};
  `,
  textareaContainer: css`
    position: relative;
    padding-inline: 8px;
    margin-top: 4px;
  `,
  textarea: css`
    &[class*='ant-input'] {
      min-height: 48px !important;
      max-height: 200px;
      padding-block: 4px;
      padding-inline: 8px;
      line-height: 1.5;
    }
  `,
  targetChip: css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 9999px;
    border: 1px solid ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    padding: 2px 8px 2px 10px;
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorText};
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: ${token.colorPrimaryBgHover}; }
  `,
  agentPickerDropdown: css`
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 100;
    width: 280px;
    overflow: hidden;
    border-radius: ${token.borderRadiusLG}px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 6px;
    box-shadow: ${token.boxShadowSecondary};
  `,
  agentPickerLabel: css`
    padding: 6px 12px 4px;
    font-size: 11px;
    font-weight: 500;
    color: ${token.colorTextQuaternary};
  `,
  agentPickerList: css`
    max-height: 240px;
    overflow-y: auto;
  `,
  agentPickerItem: css`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    border-radius: ${token.borderRadius}px;
    padding: 7px 12px;
    cursor: pointer;
    border: none;
    background: none;
    text-align: left;
    transition: background 0.15s;

    &:hover { background: ${token.colorFillSecondary}; }
  `,
  agentPickerItemActive: css`
    background: ${token.colorPrimaryBg};
  `,
  footer: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11px;
    color: ${token.colorTextQuaternary};
    padding: 4px 8px 0;
  `,
  statusDot: css`
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  statusDotActive: css`
    background: #22c55e;
    opacity: 0.8;
  `,
  statusDotInactive: css`
    background: #ef4444;
    opacity: 0.8;
  `,
}));

// ── Types ────────────────────────────────────────────────────────

export interface FileAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;
  preview: string | null;
  status: 'staging' | 'ready' | 'error';
  error?: string;
}

interface ChatInputProps {
  onSend: (text: string, attachments?: FileAttachment[], targetAgentId?: string | null) => void;
  onStop?: () => void;
  disabled?: boolean;
  sending?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIconComp({ mimeType, style }: { mimeType: string; style?: React.CSSProperties }) {
  if (mimeType.startsWith('video/')) return <Film style={style} />;
  if (mimeType.startsWith('audio/')) return <Music style={style} />;
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') return <FileText style={style} />;
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return <FileArchive style={style} />;
  if (mimeType === 'application/pdf') return <FileText style={style} />;
  return <File style={style} />;
}

function readFileAsBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl?.includes(',')) { reject(new Error(`Invalid data URL for ${file.name}`)); return; }
      const base64 = dataUrl.split(',')[1];
      if (!base64) { reject(new Error(`Empty base64 for ${file.name}`)); return; }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// ── Component ────────────────────────────────────────────────────

export function ChatInput({ onSend, onStop, disabled = false, sending = false }: ChatInputProps) {
  const { t } = useTranslation('chat');
  const { styles, cx } = useStyles();

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [targetAgentId, setTargetAgentId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const pickerRef = useRef<HTMLDivElement>(null);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const remoteGatewayUrl = useSettingsStore((s) => s.remoteGatewayUrl);
  const agents = useAgentsStore((s) => s.agents);
  const currentAgentId = useChatStore((s) => s.currentAgentId);

  const currentAgentName = useMemo(
    () => (agents ?? []).find((a) => a.id === currentAgentId)?.name ?? currentAgentId,
    [agents, currentAgentId],
  );
  const mentionableAgents = useMemo(
    () => (agents ?? []).filter((a) => a.id !== currentAgentId),
    [agents, currentAgentId],
  );
  const selectedTarget = useMemo(
    () => (agents ?? []).find((a) => a.id === targetAgentId) ?? null,
    [agents, targetAgentId],
  );
  const showAgentPicker = mentionableAgents.length > 0;

  useEffect(() => {
    if (!targetAgentId) return;
    if (targetAgentId === currentAgentId) { setTargetAgentId(null); setPickerOpen(false); return; }
    if (!(agents ?? []).some((a) => a.id === targetAgentId)) { setTargetAgentId(null); setPickerOpen(false); }
  }, [agents, currentAgentId, targetAgentId]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  // ── File staging ──────────────────────────────────────────────

  const pickFiles = useCallback(async () => {
    try {
      const result = await invokeIpc('dialog:open', { properties: ['openFile', 'multiSelections'] }) as { canceled: boolean; filePaths?: string[] };
      if (result.canceled || !result.filePaths?.length) return;

      const tempIds: string[] = [];
      for (const fp of result.filePaths) {
        const tempId = crypto.randomUUID();
        tempIds.push(tempId);
        const fileName = fp.split(/[\\/]/).pop() || 'file';
        setAttachments(prev => [...prev, { id: tempId, fileName, mimeType: '', fileSize: 0, stagedPath: '', preview: null, status: 'staging' }]);
      }

      const staged = await hostApiFetch<Array<{ id: string; fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>>('/api/files/stage-paths', {
        method: 'POST',
        body: JSON.stringify({ filePaths: result.filePaths }),
      });

      setAttachments(prev => {
        let updated = [...prev];
        for (let i = 0; i < tempIds.length; i++) {
          const data = staged[i];
          updated = updated.map(a =>
            a.id === tempIds[i]
              ? data ? { ...data, status: 'ready' as const } : { ...a, status: 'error' as const, error: 'Staging failed' }
              : a,
          );
        }
        return updated;
      });
    } catch (err) {
      setAttachments(prev => prev.map(a => a.status === 'staging' ? { ...a, status: 'error' as const, error: String(err) } : a));
    }
  }, []);

  const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
    for (const file of files) {
      const tempId = crypto.randomUUID();
      setAttachments(prev => [...prev, { id: tempId, fileName: file.name, mimeType: file.type || 'application/octet-stream', fileSize: file.size, stagedPath: '', preview: null, status: 'staging' }]);
      try {
        const base64 = await readFileAsBase64(file);
        const staged = await hostApiFetch<{ id: string; fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>('/api/files/stage-buffer', {
          method: 'POST',
          body: JSON.stringify({ base64, fileName: file.name, mimeType: file.type || 'application/octet-stream' }),
        });
        setAttachments(prev => prev.map(a => a.id === tempId ? { ...staged, status: 'ready' as const } : a));
      } catch (err) {
        setAttachments(prev => prev.map(a => a.id === tempId ? { ...a, status: 'error' as const, error: String(err) } : a));
      }
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const allReady = attachments.length === 0 || attachments.every(a => a.status === 'ready');
  const hasFailedAttachments = attachments.some(a => a.status === 'error');
  const canSend = (input.trim() || attachments.length > 0) && allReady && !disabled && !sending;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const readyAttachments = attachments.filter(a => a.status === 'ready');
    const text = input.trim();
    setInput('');
    setAttachments([]);
    onSend(text, readyAttachments.length > 0 ? readyAttachments : undefined, targetAgentId);
    setTargetAgentId(null);
    setPickerOpen(false);
  }, [input, attachments, canSend, onSend, targetAgentId]);

  const handleStop = useCallback(() => {
    if (sending && onStop) onStop();
  }, [sending, onStop]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: globalThis.File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === 'file') { const f = item.getAsFile(); if (f) files.push(f); }
    }
    if (files.length > 0) { e.preventDefault(); stageBufferFiles(files); }
  }, [stageBufferFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (e.dataTransfer?.files?.length) stageBufferFiles(Array.from(e.dataTransfer.files));
  }, [stageBufferFiles]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-and-drop
    <div
      className={styles.wrapper}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className={styles.attachmentRow}>
          {attachments.map(att => (
            <AttachmentPreview key={att.id} attachment={att} onRemove={() => removeAttachment(att.id)} />
          ))}
        </div>
      )}

      {/* ── Main input box ── */}
      <div className={cx(styles.inputBox, dragOver && styles.inputBoxDragOver)}>

        {/* Action bar (top) */}
        <ChatInputActionBar
          leftAddons={
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {selectedTarget && (
                <button type="button" onClick={() => setTargetAgentId(null)} className={styles.targetChip} title={t('composer.clearTarget')}>
                  <span>{t('composer.targetChip', { agent: selectedTarget.name })}</span>
                  <X style={{ width: 11, height: 11, opacity: 0.5 }} />
                </button>
              )}

              <ActionIcon
                icon={PaperClipOutlined}
                onClick={pickFiles}
                disabled={disabled || sending}
                title={t('composer.attachFiles')}
                size="small"
              />

              {showAgentPicker && (
                <div ref={pickerRef} style={{ position: 'relative' }}>
                  <ActionIcon
                    icon={AtSign}
                    onClick={() => setPickerOpen(o => !o)}
                    disabled={disabled || sending}
                    title={t('composer.pickAgent')}
                    size="small"
                    active={pickerOpen || !!selectedTarget}
                  />
                  {pickerOpen && (
                    <div className={styles.agentPickerDropdown}>
                      <div className={styles.agentPickerLabel}>
                        {t('composer.agentPickerTitle', { currentAgent: currentAgentName })}
                      </div>
                      <div className={styles.agentPickerList}>
                        {mentionableAgents.map(agent => (
                          <AgentPickerItem
                            key={agent.id}
                            agent={agent}
                            selected={agent.id === targetAgentId}
                            onSelect={() => { setTargetAgentId(agent.id); setPickerOpen(false); }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
        />

        {/* Textarea */}
        <div className={styles.textareaContainer}>
          <ChatInputAreaInner
            className={styles.textarea}
            value={input}
            onInput={setInput}
            onSend={handleSend}
            loading={sending}
            disabled={disabled}
            placeholder={disabled ? t('composer.gatewayDisconnectedPlaceholder') : ''}
            onPaste={handlePaste}
          />
        </div>

        {/* Send button row (bottom) */}
        <ChatSendButton
          loading={sending}
          onSend={handleSend}
          onStop={handleStop}
          texts={{ send: t('composer.send'), stop: t('composer.stop'), warp: 'Shift + Enter' }}
        />
      </div>

      {/* Footer status */}
      <div className={styles.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={cx(styles.statusDot, gatewayStatus.state === 'running' ? styles.statusDotActive : styles.statusDotInactive)} />
          <span>
            {remoteGatewayUrl?.trim()
              ? `🌐 ${gatewayStatus.state === 'running' ? t('composer.gatewayConnected') : gatewayStatus.state} (${t('composer.remoteMode', '远程')}) | ${remoteGatewayUrl.trim()}`
              : t('composer.gatewayStatus', {
                  state: gatewayStatus.state === 'running' ? t('composer.gatewayConnected') : gatewayStatus.state,
                  port: gatewayStatus.port,
                  pid: gatewayStatus.pid ? `| pid: ${gatewayStatus.pid}` : '',
                })
            }
          </span>
        </div>
        {hasFailedAttachments && (
          <button
            type="button"
            style={{ fontSize: 11, cursor: 'pointer', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, color: 'inherit' }}
            onClick={() => { setAttachments(prev => prev.filter(a => a.status !== 'error')); void pickFiles(); }}
          >
            {t('composer.retryFailedAttachments')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Attachment Preview ───────────────────────────────────────────

function AttachmentPreview({ attachment, onRemove }: { attachment: FileAttachment; onRemove: () => void }) {
  const isImage = attachment.mimeType.startsWith('image/') && attachment.preview;
  return (
    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
      {isImage ? (
        <div style={{ width: 52, height: 52 }}>
          {/* biome-ignore lint/style/noNonNullAssertion: isImage guarantees preview */}
          <img src={attachment.preview!} alt={attachment.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'rgba(0,0,0,0.04)', maxWidth: 180 }}>
          <FileIconComp mimeType={attachment.mimeType} style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.6 }} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: 11, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.fileName}</p>
            <p style={{ fontSize: 10, margin: 0, opacity: 0.6 }}>{attachment.fileSize > 0 ? formatFileSize(attachment.fileSize) : '...'}</p>
          </div>
        </div>
      )}
      {attachment.status === 'staging' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 style={{ width: 13, height: 13, color: 'white', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      {attachment.status === 'error' && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 500 }}>Error</span>
        </div>
      )}
      <button type="button" onClick={onRemove} style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
        <X style={{ width: 8, height: 8 }} />
      </button>
    </div>
  );
}

// ── Agent Picker Item ────────────────────────────────────────────

function AgentPickerItem({ agent, selected, onSelect }: { agent: AgentSummary; selected: boolean; onSelect: () => void }) {
  const { styles, cx } = useStyles();
  return (
    <button type="button" onClick={onSelect} className={cx(styles.agentPickerItem, selected && styles.agentPickerItemActive)}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</span>
      <span style={{ fontSize: 11, opacity: 0.5 }}>{agent.modelDisplay}</span>
    </button>
  );
}
