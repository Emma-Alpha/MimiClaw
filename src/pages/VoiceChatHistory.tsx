import { useEffect, useMemo, useState } from 'react';
import { Mic, Bot, Clock3 } from 'lucide-react';
import { fetchVoiceChatMessages } from '@/lib/voice-chat';
import { useVoiceChatSessionsStore } from '@/stores/voice-chat-sessions';
import { useStyles } from './VoiceChatHistory.styles';
import type { VoiceChatHistoryMessage } from '../../shared/voice-chat';

function formatDateTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestampMs);
}

export function VoiceChatHistory() {
  const { styles } = useStyles();
  const sessions = useVoiceChatSessionsStore((state) => state.sessions);
  const activeSessionId = useVoiceChatSessionsStore((state) => state.activeSessionId);
  const [messages, setMessages] = useState<VoiceChatHistoryMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    let disposed = false;
    setLoading(true);
    setError(null);
    void fetchVoiceChatMessages(activeSessionId)
      .then((nextMessages) => {
        if (disposed) return;
        setMessages(nextMessages);
      })
      .catch((nextError) => {
        if (disposed) return;
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      })
      .finally(() => {
        if (disposed) return;
        setLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [activeSessionId]);

  const groupedMessages = useMemo(() => {
    const groups = new Map<string, VoiceChatHistoryMessage[]>();
    for (const message of messages) {
      const bucket = groups.get(message.groupId) ?? [];
      bucket.push(message);
      groups.set(message.groupId, bucket);
    }
    return Array.from(groups.values());
  }, [messages]);

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        <div className={styles.headerSection}>
          <div className={styles.headerRow}>
            <div className={styles.headerIcon}>
              <Mic style={{ width: 20, height: 20 }} />
            </div>
            <div className={styles.headerContent}>
              <h1 className={styles.headerTitle}>
                {activeSession?.title ?? 'Voice Chat'}
              </h1>
              <p className={styles.headerDesc}>
                只读语音归档会话，按轮次展示稳定句子与最终回复。
              </p>
            </div>
          </div>

          {activeSession ? (
            <div className={styles.metaRow}>
              <span className={styles.metaBadge}>来源: 语音</span>
              <span className={styles.metaBadge}>
                开始于 {formatDateTime(activeSession.startedAt)}
              </span>
              <span className={styles.metaBadge}>
                状态: {activeSession.status === 'failed' ? '失败' : activeSession.status === 'active' ? '进行中' : '已结束'}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.body}>
          {!activeSession ? (
            <div className={styles.emptyBox}>
              暂无语音会话，先从小黑猫右键菜单里打开"语音对话"。
            </div>
          ) : null}

          {activeSession && loading ? (
            <div className={styles.loadingBox}>
              正在加���语音历史…
            </div>
          ) : null}

          {activeSession && error ? (
            <div className={styles.errorBox}>
              语音历史加载失败：{error}
            </div>
          ) : null}

          {activeSession && !loading && !error && groupedMessages.length === 0 ? (
            <div className={styles.loadingBox}>
              这个语音会话还没有写入稳定句子。
            </div>
          ) : null}

          <div className={styles.groupList}>
            {groupedMessages.map((group, index) => (
              <section
                key={group[0]?.groupId ?? index}
                className={styles.groupSection}
              >
                <div className={styles.groupLabel}>
                  <Clock3 style={{ width: 14, height: 14 }} />
                  第 {index + 1} 轮
                </div>
                <div className={styles.messageList}>
                  {group.map((message) => (
                    <article
                      key={message.id}
                      className={message.role === 'user' ? styles.messageUser : styles.messageAssistant}
                    >
                      <div className={styles.messageMeta}>
                        <span className={message.role === 'user' ? styles.roleChipUser : styles.roleChipAssistant}>
                          {message.role === 'user' ? <Mic style={{ width: 12, height: 12 }} /> : <Bot style={{ width: 12, height: 12 }} />}
                          {message.role === 'user' ? '[语音]' : message.interrupted ? '[已中断]' : '[语音]'}
                        </span>
                        <span className={message.role === 'user' ? styles.timeUser : styles.timeAssistant}>
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      <p className={styles.messageText}>
                        {message.text}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
