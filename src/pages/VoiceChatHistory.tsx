import { useEffect, useMemo, useState } from 'react';
import { Mic, Bot, Clock3 } from 'lucide-react';
import { fetchVoiceChatMessages } from '@/lib/voice-chat';
import { useVoiceChatSessionsStore } from '@/stores/voice-chat-sessions';
import { cn } from '@/lib/utils';
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
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(40,72,110,0.16),_transparent_42%),linear-gradient(180deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.94))] p-8">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="border-b border-slate-200/80 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Mic className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-900">
                {activeSession?.title ?? 'Voice Chat'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                只读语音归档会话，按轮次展示稳定句子与最终回复。
              </p>
            </div>
          </div>

          {activeSession ? (
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                来源: 语音
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                开始于 {formatDateTime(activeSession.startedAt)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                状态: {activeSession.status === 'failed' ? '失败' : activeSession.status === 'active' ? '进行中' : '已结束'}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!activeSession ? (
            <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 text-sm text-slate-500">
              暂无语音会话，先从小黑猫右键菜单里打开“语音对话”。
            </div>
          ) : null}

          {activeSession && loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/70 px-6 py-5 text-sm text-slate-500">
              正在加载语音历史…
            </div>
          ) : null}

          {activeSession && error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
              语音历史加载失败：{error}
            </div>
          ) : null}

          {activeSession && !loading && !error && groupedMessages.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white/70 px-6 py-5 text-sm text-slate-500">
              这个语音会话还没有写入稳定句子。
            </div>
          ) : null}

          <div className="space-y-6">
            {groupedMessages.map((group, index) => (
              <section
                key={group[0]?.groupId ?? index}
                className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]"
              >
                <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" />
                  第 {index + 1} 轮
                </div>
                <div className="space-y-4">
                  {group.map((message) => (
                    <article
                      key={message.id}
                      className={cn(
                        'rounded-[24px] px-4 py-3',
                        message.role === 'user'
                          ? 'bg-slate-950 text-white'
                          : 'bg-slate-100 text-slate-900',
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1',
                          message.role === 'user'
                            ? 'bg-white/12 text-white/88'
                            : 'bg-white text-slate-600',
                        )}>
                          {message.role === 'user' ? <Mic className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                          {message.role === 'user' ? '[语音]' : message.interrupted ? '[已中断]' : '[语音]'}
                        </span>
                        <span className={message.role === 'user' ? 'text-white/60' : 'text-slate-400'}>
                          {formatDateTime(message.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-[14px] leading-7">
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
