import { useEffect } from 'react';
import { fetchVoiceChatSessions } from '@/lib/voice-chat';
import { useVoiceChatSessionsStore } from '@/stores/voice-chat-sessions';

const VOICE_CHAT_SYNC_INTERVAL_MS = 15_000;

export function VoiceChatSessionBridge() {
  const setLoading = useVoiceChatSessionsStore((state) => state.setLoading);
  const setSessions = useVoiceChatSessionsStore((state) => state.setSessions);
  const setSyncError = useVoiceChatSessionsStore((state) => state.setSyncError);

  useEffect(() => {
    let disposed = false;

    const syncSessions = async () => {
      if (disposed) return;
      setLoading(true);

      try {
        const syncedAt = Date.now();
        const sessions = await fetchVoiceChatSessions();
        if (disposed) return;
        setSessions(sessions, syncedAt);
      } catch (error) {
        if (disposed) return;
        setSyncError(error instanceof Error ? error.message : String(error));
      }
    };

    void syncSessions();
    const intervalId = window.setInterval(() => {
      void syncSessions();
    }, VOICE_CHAT_SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [setLoading, setSessions, setSyncError]);

  return null;
}
