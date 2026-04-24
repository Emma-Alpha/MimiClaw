import { Mic } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useVolcengineAsr } from '@/hooks/useVolcengineAsr';
import { labPreferSelectors, useSettingsStore } from '@/stores/settings';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function SttAction() {
  const { editor } = useChatInputContext();
  const isSttEnabled = useSettingsStore(labPreferSelectors.enabled('stt'));

  // Snapshot of the editor content when recording starts. Every partial
  // overwrites the text after this snapshot so we get clean replacement
  // instead of accumulating duplicates.
  const baseContentRef = useRef('');

  const handleTranscriptReady = useCallback((text: string) => {
    const transcript = text.trim();
    const base = baseContentRef.current;
    baseContentRef.current = '';
    if (!transcript) {
      // Restore original content if transcription is empty.
      if (base && editor) editor.setMarkdownContent(base);
      return;
    }
    const separator = base.trim().length > 0 ? '\n' : '';
    editor?.setMarkdownContent(base + separator + transcript);
  }, [editor]);

  const handlePartialTranscript = useCallback((text: string) => {
    if (!editor) return;
    const base = baseContentRef.current;
    const separator = base.trim().length > 0 ? '\n' : '';
    editor.setMarkdownContent(base + separator + text);
  }, [editor]);

  const { cancelRecording, isRecording, isTranscribing, toggleRecording, stopAndTranscribe } = useVolcengineAsr({
    onTranscriptReady: handleTranscriptReady,
    onPartialTranscript: handlePartialTranscript,
  });

  // Snapshot editor content before starting, so partials can overwrite cleanly.
  const editorRef = useRef(editor);
  useEffect(() => { editorRef.current = editor; }, [editor]);

  const snapshotAndToggle = useCallback(async () => {
    if (!isRecording) {
      baseContentRef.current = editorRef.current?.getMarkdownContent() ?? '';
    }
    await toggleRecording();
  }, [isRecording, toggleRecording]);

  const handleCancel = useCallback(() => {
    // Restore original content on cancel.
    const base = baseContentRef.current;
    baseContentRef.current = '';
    if (base !== undefined && editor) {
      editor.setMarkdownContent(base);
    }
    cancelRecording();
  }, [cancelRecording, editor]);

  useEffect(() => {
    if (!isSttEnabled && isRecording) {
      handleCancel();
    }
  }, [handleCancel, isSttEnabled, isRecording]);

  // Forward pet:recording-command IPC events (e.g. from F2 / Fn key) to the ASR hook.
  const isRecordingRef = useRef(false);
  const snapshotAndToggleRef = useRef(snapshotAndToggle);
  const stopAndTranscribeRef = useRef(stopAndTranscribe);
  const handleCancelRef = useRef(handleCancel);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { snapshotAndToggleRef.current = snapshotAndToggle; }, [snapshotAndToggle]);
  useEffect(() => { stopAndTranscribeRef.current = stopAndTranscribe; }, [stopAndTranscribe]);
  useEffect(() => { handleCancelRef.current = handleCancel; }, [handleCancel]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('pet:recording-command', (payload) => {
      const action =
        payload && typeof payload === 'object' && 'action' in payload
          ? (payload as { action?: 'start' | 'cancel' | 'confirm' }).action
          : undefined;
      if (action === 'start') {
        void snapshotAndToggleRef.current();
        return;
      }
      if (action === 'confirm') {
        if (isRecordingRef.current) {
          void stopAndTranscribeRef.current();
        }
        return;
      }
      if (action === 'cancel') {
        if (isRecordingRef.current) {
          handleCancelRef.current();
        }
      }
    });
    return () => { unsubscribe?.(); };
  }, []);

  const handleClick = useCallback(async () => {
    if (!isSttEnabled) {
      toast.error('Speech-to-text is disabled in labs settings');
      return;
    }
    if (isTranscribing) return;
    await snapshotAndToggle();
    toast.success(isRecording ? 'Transcribing speech...' : 'Listening...');
  }, [isRecording, isSttEnabled, isTranscribing, snapshotAndToggle]);

  return (
    <ActionWrapper
      active={isRecording || isTranscribing}
      disabled={!isSttEnabled || isTranscribing}
      icon={Mic}
      loading={isTranscribing}
      onClick={handleClick}
      title="Speech to text"
    />
  );
}
