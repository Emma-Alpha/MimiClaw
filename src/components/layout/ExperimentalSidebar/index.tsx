import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Filter,
  FolderPlus,
  Loader2,
  PanelLeftClose,
  Pencil,
  Settings as SettingsIcon,
  Trash2,
  SquarePen,
  Hexagon,
  Blocks,
  Clock,
} from 'lucide-react';
import { useSettingsStore, type SidebarProject } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { useJizhiSessionsStore } from '@/stores/jizhi-sessions';
import { useRemoteMessengerStore } from '@/stores/remote-messenger';
import { useVoiceChatSessionsStore } from '@/stores/voice-chat-sessions';
import {
  fetchCodeAgentSessions,
  readStoredCodeAgentWorkspaceRoot,
} from '@/lib/code-agent';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useExperimentalSidebarStyles } from './style';

type ThreadSource = 'chat' | 'cli' | 'jizhi' | 'xiaojiu' | 'voice';
type GroupMode = 'project' | 'connection';
type ShowMode = 'all' | 'relevant';
type SortMode = 'updated' | 'created';
type ConnectionGroup = 'local' | 'remote' | 'cloud';

type OpenClawSessionItem = {
  key: string;
  label: string;
  agentName: string;
  updatedAt: number;
};

type CliSessionItem = {
  sessionId: string;
  title: string;
  updatedAt: number;
};

type NamedSessionItem = {
  id: string;
  label: string;
  updatedAt: number;
  unreadCount?: number;
};

type UnifiedThread = {
  id: string;
  source: ThreadSource;
  connection: ConnectionGroup;
  label: string;
  subtitle?: string;
  updatedAt: number;
  createdAt: number;
  unread: boolean;
  status?: 'running' | 'error';
  projectId: string;
  active: boolean;
  open: () => void;
  deletePayload?: {
    key: string;
    label: string;
  };
};

const SYSTEM_INBOX_PROJECT_ID = 'system-inbox';
const RELEVANT_RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const COLLAPSIBLE_THREAD_LIMIT = 5;

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const [, agentId] = sessionKey.split(':');
  return agentId || 'main';
}

function toConnectionGroup(source: ThreadSource): ConnectionGroup {
  if (source === 'jizhi' || source === 'xiaojiu') return 'remote';
  if (source === 'chat' || source === 'cli' || source === 'voice') return 'local';
  return 'cloud';
}

function isRelevantThread(thread: UnifiedThread, now: number): boolean {
  return thread.unread || thread.status === 'running' || thread.status === 'error' || now - thread.updatedAt <= RELEVANT_RECENT_MS;
}

export function ExperimentalSidebar() {
  const { styles, cx } = useExperimentalSidebarStyles();
  const sidebarCollapsed = useSettingsStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((state) => state.setSidebarCollapsed);
  const sidebarWidth = useSettingsStore((state) => state.sidebarWidth);
  const setSidebarWidth = useSettingsStore((state) => state.setSidebarWidth);
  const sidebarProjects = useSettingsStore((state) => state.sidebarProjects);
  const sidebarProjectExpanded = useSettingsStore((state) => state.sidebarProjectExpanded);
  const sidebarThreadProjectMap = useSettingsStore((state) => state.sidebarThreadProjectMap);
  const sidebarThreadFirstSeenAt = useSettingsStore((state) => state.sidebarThreadFirstSeenAt);
  const addSidebarProject = useSettingsStore((state) => state.addSidebarProject);
  const renameSidebarProject = useSettingsStore((state) => state.renameSidebarProject);
  const removeSidebarProject = useSettingsStore((state) => state.removeSidebarProject);
  const setSidebarProjectExpanded = useSettingsStore((state) => state.setSidebarProjectExpanded);
  const setSidebarThreadProject = useSettingsStore((state) => state.setSidebarThreadProject);
  const rememberSidebarThreadFirstSeen = useSettingsStore((state) => state.rememberSidebarThreadFirstSeen);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessionLabels = useChatStore((s) => s.sessionLabels);
  const sessionLastActivity = useChatStore((s) => s.sessionLastActivity);
  const switchSession = useChatStore((s) => s.switchSession);
  const newSession = useChatStore((s) => s.newSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const chatSending = useChatStore((s) => s.sending);
  const chatError = useChatStore((s) => s.error);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const remoteSessions = useRemoteMessengerStore((s) => s.sessions);
  const remoteLastSyncedAt = useRemoteMessengerStore((s) => s.lastSyncedAt);
  const remoteSyncError = useRemoteMessengerStore((s) => s.syncError);
  const remoteActiveSessionId = useRemoteMessengerStore((s) => s.activeSessionId);
  const setRemoteActiveSessionId = useRemoteMessengerStore((s) => s.setActiveSessionId);

  const jizhiSessions = useJizhiSessionsStore((s) => s.sessions);
  const jizhiSyncError = useJizhiSessionsStore((s) => s.syncError);
  const jizhiActiveSessionId = useJizhiSessionsStore((s) => s.activeSessionId);
  const setJizhiActiveSessionId = useJizhiSessionsStore((s) => s.setActiveSessionId);

  const voiceSessions = useVoiceChatSessionsStore((s) => s.sessions);
  const voiceSyncError = useVoiceChatSessionsStore((s) => s.syncError);
  const voiceActiveSessionId = useVoiceChatSessionsStore((s) => s.activeSessionId);
  const setVoiceActiveSessionId = useVoiceChatSessionsStore((s) => s.setActiveSessionId);

  const xiaojiuEnabled = useSettingsStore((s) => s.xiaojiuEnabled);
  const jizhiEnabled = useSettingsStore((s) => s.jizhiEnabled);

  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useTranslation(['common']);
  const sidebarShortcutLabel = window.electron?.platform === 'darwin' ? '⌘B' : 'Ctrl+B';
  const sidebarCollapseLabel = t('sidebar.collapseSidebar', { defaultValue: '收起侧边栏' });

  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
  const [cliWorkspaceRoot, setCliWorkspaceRoot] = useState(() => readStoredCodeAgentWorkspaceRoot().trim());
  const [cliSessions, setCliSessions] = useState<CliSessionItem[]>([]);
  const [cliLoading, setCliLoading] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);
  const [activeCliSessionId, setActiveCliSessionId] = useState<string | null>(null);

  const [showMode, setShowMode] = useState<ShowMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [groupMode, setGroupMode] = useState<GroupMode>('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [threadMenuId, setThreadMenuId] = useState<string | null>(null);
  const [expandedThreadGroups, setExpandedThreadGroups] = useState<Record<string, boolean>>({});

  const controlsRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (!isGatewayRunning) return;
    let cancelled = false;
    const hasExistingMessages = useChatStore.getState().messages.length > 0;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory(hasExistingMessages);
    })();
    return () => {
      cancelled = true;
    };
  }, [isGatewayRunning, loadHistory, loadSessions]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const syncWorkspaceRoot = () => {
      const next = readStoredCodeAgentWorkspaceRoot().trim();
      setCliWorkspaceRoot((current) => (current === next ? current : next));
    };

    syncWorkspaceRoot();
    window.addEventListener('focus', syncWorkspaceRoot);
    const interval = window.setInterval(syncWorkspaceRoot, 5000);

    return () => {
      window.removeEventListener('focus', syncWorkspaceRoot);
      window.clearInterval(interval);
    };
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (!cliWorkspaceRoot) return;

    void (async () => {
      setCliLoading(true);
      setCliError(null);
      try {
        const sessionsInWorkspace = await fetchCodeAgentSessions(cliWorkspaceRoot, 60);
        if (cancelled) return;
        const sorted = [...sessionsInWorkspace].sort((left, right) => right.updatedAt - left.updatedAt);
        const mapped = sorted.map((session) => ({
          sessionId: session.sessionId,
          title: session.title?.trim() || session.sessionId,
          updatedAt: session.updatedAt,
        }));
        setCliSessions(mapped);
        setActiveCliSessionId((current) => {
          if (current && mapped.some((item) => item.sessionId === current)) {
            return current;
          }
          return mapped[0]?.sessionId ?? null;
        });
      } catch {
        if (cancelled) return;
        setCliSessions([]);
        setCliError(t('sidebar.cliSessionsLoadFailed', { defaultValue: 'CLI 会话加载失败' }));
      } finally {
        if (!cancelled) {
          setCliLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cliWorkspaceRoot, pathname, t]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (controlsRef.current && !controlsRef.current.contains(target)) {
        setControlsOpen(false);
      }
      if (!target.closest('[data-thread-menu-root="true"]')) {
        setThreadMenuId(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const onResizeMove = useCallback((event: MouseEvent) => {
    const state = resizeStateRef.current;
    if (!state) return;
    const delta = event.clientX - state.startX;
    setSidebarWidth(state.startWidth + delta);
  }, [setSidebarWidth]);

  const onResizeEnd = useCallback(() => {
    resizeStateRef.current = null;
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
    window.removeEventListener('mousemove', onResizeMove);
    window.removeEventListener('mouseup', onResizeEnd);
  }, [onResizeMove]);

  const startResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    resizeStateRef.current = { startX: event.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('mouseup', onResizeEnd);
  }, [onResizeEnd, onResizeMove, sidebarWidth]);

  useEffect(() => {
    return () => {
      onResizeEnd();
    };
  }, [onResizeEnd]);

  const agentNameById = useMemo(
    () => Object.fromEntries((agents ?? []).map((agent) => [agent.id, agent.name])),
    [agents],
  );

  const openClawSessions = useMemo<OpenClawSessionItem[]>(() => {
    const getSessionLabel = (
      key: string,
      displayName?: string,
      label?: string,
    ): string => sessionLabels[key] ?? label ?? displayName ?? key;

    return [...sessions]
      .sort((left, right) => {
        const rightUpdated = sessionLastActivity[right.key] ?? right.updatedAt ?? 0;
        const leftUpdated = sessionLastActivity[left.key] ?? left.updatedAt ?? 0;
        return rightUpdated - leftUpdated;
      })
      .map((session) => {
        const agentId = getAgentIdFromSessionKey(session.key);
        return {
          key: session.key,
          label: getSessionLabel(session.key, session.displayName, session.label),
          agentName: agentNameById[agentId] || agentId,
          updatedAt: sessionLastActivity[session.key] ?? session.updatedAt ?? 0,
        };
      });
  }, [agentNameById, sessionLabels, sessionLastActivity, sessions]);

  const xiaojiuSessionItems = useMemo<NamedSessionItem[]>(() => {
    if (!xiaojiuEnabled) return [];
    const syncBase = remoteLastSyncedAt ?? 0;
    return [...remoteSessions]
      .sort((left, right) => {
        const rightUpdated = right.updatedAt ?? syncBase - right.sortIndex * 1000;
        const leftUpdated = left.updatedAt ?? syncBase - left.sortIndex * 1000;
        return rightUpdated - leftUpdated;
      })
      .map((session) => ({
        id: session.id,
        label: session.name,
        updatedAt: session.updatedAt ?? syncBase - session.sortIndex * 1000,
        unreadCount: session.unreadCount ?? 0,
      }));
  }, [remoteLastSyncedAt, remoteSessions, xiaojiuEnabled]);

  const jizhiSessionItems = useMemo<NamedSessionItem[]>(() => {
    if (!jizhiEnabled) return [];
    return [...jizhiSessions]
      .sort((left, right) => {
        const rightUpdated = right.lastMessageCreatedAt ?? right.updatedAt ?? 0;
        const leftUpdated = left.lastMessageCreatedAt ?? left.updatedAt ?? 0;
        return rightUpdated - leftUpdated;
      })
      .map((session) => ({
        id: session.id,
        label: session.name,
        updatedAt: session.lastMessageCreatedAt ?? session.updatedAt ?? 0,
      }));
  }, [jizhiEnabled, jizhiSessions]);

  const voiceSessionItems = useMemo<NamedSessionItem[]>(() => {
    return [...voiceSessions]
      .sort((left, right) => right.lastActivityAt - left.lastActivityAt)
      .map((session) => ({
        id: session.id,
        label: session.title,
        updatedAt: session.lastActivityAt,
      }));
  }, [voiceSessions]);

  const requestedCliSessionId = useMemo(() => {
    if (!pathname.startsWith('/code-agent/chat')) return null;
    const raw = new URLSearchParams(location.search).get('sessionId');
    const normalized = raw?.trim();
    return normalized || null;
  }, [location.search, pathname]);

  const projectCatalog = useMemo<(SidebarProject & { system?: boolean })[]>(() => ([
    {
      id: SYSTEM_INBOX_PROJECT_ID,
      name: t('sidebar.inbox', { defaultValue: '收件箱' }),
      createdAt: 0,
      system: true,
    },
    ...sidebarProjects,
  ]), [sidebarProjects, t]);

  const availableProjectIds = useMemo(() => new Set(projectCatalog.map((project) => project.id)), [projectCatalog]);

  const sourceBadgeLabel = useMemo<Record<ThreadSource, string>>(() => ({
    chat: t('sidebar.folder.chat', { defaultValue: '对话' }),
    cli: t('sidebar.folder.cli', { defaultValue: 'CLI' }),
    jizhi: t('sidebar.folder.jizhi', { defaultValue: '极智' }),
    xiaojiu: t('sidebar.folder.xiaojiu', { defaultValue: '小九' }),
    voice: t('sidebar.folder.voice', { defaultValue: '语音' }),
  }), [t]);

  const openThread = useCallback((thread: UnifiedThread) => {
    thread.open();
  }, []);

  const allThreads = useMemo<UnifiedThread[]>(() => {
    const list: UnifiedThread[] = [];

    for (const session of openClawSessions) {
      const threadId = `chat:${session.key}`;
      const updatedAt = session.updatedAt;
      const createdAt = sidebarThreadFirstSeenAt[threadId] ?? updatedAt;
      const mappedProjectId = sidebarThreadProjectMap[threadId];
      list.push({
        id: threadId,
        source: 'chat',
        connection: toConnectionGroup('chat'),
        label: session.label,
        subtitle: session.agentName,
        updatedAt,
        createdAt,
        unread: false,
        status: pathname === '/' && currentSessionKey === session.key
          ? (chatSending ? 'running' : (chatError ? 'error' : undefined))
          : undefined,
        projectId: mappedProjectId && availableProjectIds.has(mappedProjectId) ? mappedProjectId : SYSTEM_INBOX_PROJECT_ID,
        active: pathname === '/' && currentSessionKey === session.key,
        open: () => {
          switchSession(session.key);
          navigate('/');
        },
        deletePayload: {
          key: session.key,
          label: session.label,
        },
      });
    }

    for (const session of cliSessions) {
      const threadId = `cli:${session.sessionId}`;
      const mappedProjectId = sidebarThreadProjectMap[threadId];
      const createdAt = sidebarThreadFirstSeenAt[threadId] ?? session.updatedAt;
      const effectiveActiveCliSessionId = requestedCliSessionId ?? activeCliSessionId ?? cliSessions[0]?.sessionId ?? null;
      list.push({
        id: threadId,
        source: 'cli',
        connection: toConnectionGroup('cli'),
        label: session.title,
        updatedAt: session.updatedAt,
        createdAt,
        unread: false,
        projectId: mappedProjectId && availableProjectIds.has(mappedProjectId) ? mappedProjectId : SYSTEM_INBOX_PROJECT_ID,
        active: pathname.startsWith('/code-agent/chat') && session.sessionId === effectiveActiveCliSessionId,
        open: () => {
          setActiveCliSessionId(session.sessionId);
          navigate(`/code-agent/chat?sessionId=${encodeURIComponent(session.sessionId)}`);
        },
      });
    }

    for (const session of jizhiSessionItems) {
      const threadId = `jizhi:${session.id}`;
      const mappedProjectId = sidebarThreadProjectMap[threadId];
      const createdAt = sidebarThreadFirstSeenAt[threadId] ?? session.updatedAt;
      list.push({
        id: threadId,
        source: 'jizhi',
        connection: toConnectionGroup('jizhi'),
        label: session.label,
        updatedAt: session.updatedAt,
        createdAt,
        unread: false,
        projectId: mappedProjectId && availableProjectIds.has(mappedProjectId) ? mappedProjectId : SYSTEM_INBOX_PROJECT_ID,
        active: pathname.startsWith('/jizhi-chat') && jizhiActiveSessionId === session.id,
        open: () => {
          setJizhiActiveSessionId(session.id);
          navigate('/jizhi-chat');
        },
      });
    }

    for (const session of xiaojiuSessionItems) {
      const threadId = `xiaojiu:${session.id}`;
      const mappedProjectId = sidebarThreadProjectMap[threadId];
      const createdAt = sidebarThreadFirstSeenAt[threadId] ?? session.updatedAt;
      list.push({
        id: threadId,
        source: 'xiaojiu',
        connection: toConnectionGroup('xiaojiu'),
        label: session.label,
        updatedAt: session.updatedAt,
        createdAt,
        unread: (session.unreadCount ?? 0) > 0,
        projectId: mappedProjectId && availableProjectIds.has(mappedProjectId) ? mappedProjectId : SYSTEM_INBOX_PROJECT_ID,
        active: pathname.startsWith('/xiaojiu-chat') && remoteActiveSessionId === session.id,
        open: () => {
          setRemoteActiveSessionId(session.id);
          navigate('/xiaojiu-chat');
        },
      });
    }

    for (const session of voiceSessionItems) {
      const threadId = `voice:${session.id}`;
      const mappedProjectId = sidebarThreadProjectMap[threadId];
      const createdAt = sidebarThreadFirstSeenAt[threadId] ?? session.updatedAt;
      list.push({
        id: threadId,
        source: 'voice',
        connection: toConnectionGroup('voice'),
        label: session.label,
        updatedAt: session.updatedAt,
        createdAt,
        unread: false,
        projectId: mappedProjectId && availableProjectIds.has(mappedProjectId) ? mappedProjectId : SYSTEM_INBOX_PROJECT_ID,
        active: pathname.startsWith('/voice-chat') && voiceActiveSessionId === session.id,
        open: () => {
          setVoiceActiveSessionId(session.id);
          navigate('/voice-chat');
        },
      });
    }

    return list;
  }, [
    activeCliSessionId,
    availableProjectIds,
    chatError,
    chatSending,
    cliSessions,
    currentSessionKey,
    jizhiActiveSessionId,
    jizhiSessionItems,
    navigate,
    openClawSessions,
    pathname,
    remoteActiveSessionId,
    requestedCliSessionId,
    setJizhiActiveSessionId,
    setRemoteActiveSessionId,
    setVoiceActiveSessionId,
    sidebarThreadFirstSeenAt,
    sidebarThreadProjectMap,
    switchSession,
    voiceActiveSessionId,
    voiceSessionItems,
    xiaojiuSessionItems,
  ]);

  useEffect(() => {
    const missingThreadIds = allThreads
      .map((thread) => thread.id)
      .filter((threadId) => !Object.prototype.hasOwnProperty.call(sidebarThreadFirstSeenAt, threadId));
    if (missingThreadIds.length > 0) {
      rememberSidebarThreadFirstSeen(missingThreadIds);
    }
  }, [allThreads, rememberSidebarThreadFirstSeen, sidebarThreadFirstSeenAt]);

  useEffect(() => {
    if (threadMenuId && !allThreads.some((thread) => thread.id === threadMenuId)) {
      setThreadMenuId(null);
    }
  }, [allThreads, threadMenuId]);

  const sortedVisibleThreads = useMemo(() => {
    const now = Date.now();
    const showFiltered = showMode === 'all'
      ? allThreads
      : allThreads.filter((thread) => isRelevantThread(thread, now));

    return [...showFiltered].sort((left, right) => {
      if (sortMode === 'created') {
        return right.createdAt - left.createdAt;
      }
      return right.updatedAt - left.updatedAt;
    });
  }, [allThreads, showMode, sortMode]);

  const searchQueryNormalized = searchQuery.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    if (!searchQueryNormalized) return [];
    return [...allThreads]
      .filter((thread) => thread.label.toLowerCase().includes(searchQueryNormalized))
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 12);
  }, [allThreads, searchQueryNormalized]);

  const threadsByProject = useMemo(() => {
    const groups = new Map<string, UnifiedThread[]>();
    for (const thread of sortedVisibleThreads) {
      const key = thread.projectId;
      const existing = groups.get(key) ?? [];
      existing.push(thread);
      groups.set(key, existing);
    }
    return groups;
  }, [sortedVisibleThreads]);

  const projectGroups = useMemo(() => projectCatalog.map((project) => ({
    project,
    threads: threadsByProject.get(project.id) ?? [],
  })), [projectCatalog, threadsByProject]);

  const connectionGroups = useMemo(() => {
    const byConnection = new Map<ConnectionGroup, UnifiedThread[]>();
    byConnection.set('local', []);
    byConnection.set('remote', []);
    byConnection.set('cloud', []);
    for (const thread of sortedVisibleThreads) {
      byConnection.get(thread.connection)?.push(thread);
    }
    return byConnection;
  }, [sortedVisibleThreads]);

  const connectionLabel = useMemo<Record<ConnectionGroup, string>>(() => ({
    local: t('sidebar.connection.local', { defaultValue: '本地' }),
    remote: t('sidebar.connection.remote', { defaultValue: '远端' }),
    cloud: t('sidebar.connection.cloud', { defaultValue: '云端' }),
  }), [t]);

  const createProject = useCallback(() => {
    const name = window.prompt(t('sidebar.project.promptName', { defaultValue: '请输入项目名称' }));
    if (!name) return;
    addSidebarProject(name);
  }, [addSidebarProject, t]);

  const promptRenameProject = useCallback((project: SidebarProject) => {
    const nextName = window.prompt(
      t('sidebar.project.renamePrompt', { defaultValue: '重命名项目' }),
      project.name,
    );
    if (!nextName || nextName.trim() === project.name) return;
    renameSidebarProject(project.id, nextName);
  }, [renameSidebarProject, t]);

  const confirmRemoveProject = useCallback((project: SidebarProject) => {
    const confirmed = window.confirm(
      t('sidebar.project.removeConfirm', {
        defaultValue: `删除项目“${project.name}”？其中会话将回收到收件箱。`,
      }),
    );
    if (!confirmed) return;
    removeSidebarProject(project.id);
  }, [removeSidebarProject, t]);

  const isProjectExpanded = useCallback((projectId: string) => sidebarProjectExpanded?.[projectId] !== false, [sidebarProjectExpanded]);

  const toggleProjectExpanded = useCallback((projectId: string) => {
    setSidebarProjectExpanded(projectId, !isProjectExpanded(projectId));
  }, [isProjectExpanded, setSidebarProjectExpanded]);

  const toggleThreadGroupExpanded = useCallback((groupId: string) => {
    setExpandedThreadGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }, []);

  const onStartNewChat = useCallback(() => {
    newSession();
    navigate('/');
  }, [navigate, newSession]);

  const renderThreadRow = useCallback((thread: UnifiedThread) => {
    return (
      <div key={thread.id} className={styles.threadRow} data-thread-menu-root="true">
        <button
          type="button"
          onClick={() => openThread(thread)}
          className={cx(
            styles.threadButton,
            thread.active ? styles.threadButtonActive : styles.threadButtonIdle,
          )}
        >
          <div className={styles.threadMain}>
            {thread.status === 'running' ? (
              <Loader2 className={styles.loader} />
            ) : null}
            <span className={styles.threadLabel}>{thread.label}</span>
            <span className={styles.sourceBadge}>
              {sourceBadgeLabel[thread.source]}
            </span>
            {thread.unread ? (
              <span className={styles.unreadDot} />
            ) : null}
          </div>
          {thread.subtitle ? (
            <div className={styles.threadSubtitle}>{thread.subtitle}</div>
          ) : null}
        </button>

        <button
          type="button"
          aria-label={t('actions.edit', { defaultValue: '操作' })}
          data-thread-menu-button="true"
          onClick={(event) => {
            event.stopPropagation();
            setThreadMenuId((current) => (current === thread.id ? null : thread.id));
          }}
          className={cx(
            styles.threadMenuButton,
            threadMenuId === thread.id && styles.threadMenuButtonVisible,
          )}
        >
          <Ellipsis className={styles.icon14Shrink} />
        </button>

        {threadMenuId === thread.id ? (
          <div className={styles.threadMenu}>
            <div className={styles.threadMenuLabel}>
              {t('sidebar.project.moveTo', { defaultValue: '移动到项目' })}
            </div>
            {projectCatalog.map((project) => {
              const selected = project.id === thread.projectId;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSidebarThreadProject(thread.id, project.id);
                    setThreadMenuId(null);
                  }}
                  className={cx(
                    styles.threadProjectOption,
                    selected && styles.threadProjectOptionSelected,
                  )}
                >
                  <span className={styles.truncate}>{project.name}</span>
                  {selected ? <span className={styles.threadProjectCurrent}>{t('actions.confirm', { defaultValue: '当前' })}</span> : null}
                </button>
              );
            })}
            {thread.deletePayload ? (
              <button
                type="button"
                onClick={() => {
                  setSessionToDelete(thread.deletePayload ?? null);
                  setThreadMenuId(null);
                }}
                className={styles.threadDeleteButton}
              >
                <Trash2 className={styles.icon14Shrink} />
                <span>{t('actions.delete', { defaultValue: '删除' })}</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }, [cx, openThread, projectCatalog, setSidebarThreadProject, sourceBadgeLabel, styles, t, threadMenuId]);

  const visibleCliError = cliWorkspaceRoot.length > 0 ? cliError : null;
  const isSourceLoading = cliLoading;
  const sourceErrorCount = Number(Boolean(visibleCliError)) + Number(Boolean(jizhiSyncError)) + Number(Boolean(remoteSyncError)) + Number(Boolean(voiceSyncError));

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <aside
      className={styles.aside}
      style={{ width: sidebarWidth }}
    >
      <div className={styles.collapseArea}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={() => setSidebarCollapsed(true)}
              aria-label={sidebarCollapseLabel}
            >
              <PanelLeftClose className={styles.icon16} />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="end"
            className={styles.tooltipContent}
          >
            <div className={styles.tooltipLabel}>
              <span>{sidebarCollapseLabel}</span>
              <span className={styles.tooltipShortcut}>
                {sidebarShortcutLabel}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className={styles.quickActions}>
        <button
          type="button"
          onClick={onStartNewChat}
          className={styles.quickAction}
        >
          <SquarePen className={styles.icon15} />
          <span className={styles.quickActionText}>{t('sidebar.newThread', { defaultValue: '新线程' })}</span>
        </button>

        <SearchInput
          value={searchQuery}
          onValueChange={setSearchQuery}
          placeholder="Search"
          iconSize={15}
          className={cx(styles.quickAction, styles.searchInput)}
          iconClassName={styles.searchInputIcon}
          inputClassName={styles.searchInputField}
        />

        <NavLink
          to="/skills"
          className={({ isActive }) =>
            cx(styles.quickAction, isActive && styles.quickActionActive)
          }
        >
          <Hexagon className={styles.icon15} />
          <span className={styles.quickActionText}>技能</span>
        </NavLink>

        <NavLink
          to="/agents"
          className={({ isActive }) =>
            cx(styles.quickAction, isActive && styles.quickActionActive)
          }
        >
          <Blocks className={styles.icon15} />
          <span className={styles.quickActionText}>Plugins</span>
        </NavLink>

        <NavLink
          to="/cron"
          className={({ isActive }) =>
            cx(styles.quickAction, isActive && styles.quickActionActive)
          }
        >
          <Clock className={styles.icon15} />
          <span className={styles.quickActionText}>自动化</span>
        </NavLink>
      </div>

      <div className={styles.threadArea}>
        <div className={styles.threadHeader}>
          <span data-thread-header-title="true" className={styles.threadHeaderTitle}>
            线程
          </span>
          <div data-thread-header-controls="true" className={styles.threadHeaderControls}>
            <div ref={controlsRef} className={styles.relativeFlex}>
              <button
                aria-label="Filter"
                onClick={() => setControlsOpen(!controlsOpen)}
                className={styles.iconButton22}
              >
                <Filter className={styles.icon14} />
              </button>
              {controlsOpen ? (
                <div className={styles.controlsPopover}>
                  <div className={styles.controlsBlock}>
                    <div className={styles.controlsLabel}>{t('sidebar.show', { defaultValue: '显示' })}</div>
                    <div className={styles.controlsOptionsRow}>
                      <button
                        type="button"
                        onClick={() => setShowMode('all')}
                        className={cx(styles.controlsOption, showMode === 'all' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.showAll', { defaultValue: '全部' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMode('relevant')}
                        className={cx(styles.controlsOption, showMode === 'relevant' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.showRelevant', { defaultValue: '相关' })}
                      </button>
                    </div>
                  </div>

                  <div className={cx(styles.controlsBlock, styles.controlsBlockWithGap)}>
                    <div className={styles.controlsLabel}>{t('sidebar.sortBy', { defaultValue: '排序' })}</div>
                    <div className={styles.controlsOptionsRow}>
                      <button
                        type="button"
                        onClick={() => setSortMode('updated')}
                        className={cx(styles.controlsOption, sortMode === 'updated' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.sortUpdated', { defaultValue: '最近更新' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode('created')}
                        className={cx(styles.controlsOption, sortMode === 'created' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.sortCreated', { defaultValue: '创建时间' })}
                      </button>
                    </div>
                  </div>

                  <div className={cx(styles.controlsBlock, styles.controlsBlockWithGap)}>
                    <div className={styles.controlsLabel}>{t('sidebar.groupBy', { defaultValue: '分组' })}</div>
                    <div className={styles.controlsOptionsRow}>
                      <button
                        type="button"
                        onClick={() => setGroupMode('project')}
                        className={cx(styles.controlsOption, groupMode === 'project' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.groupProject', { defaultValue: '按项目' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupMode('connection')}
                        className={cx(styles.controlsOption, groupMode === 'connection' && styles.controlsOptionActive)}
                      >
                        {t('sidebar.groupConnection', { defaultValue: '按连接' })}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              aria-label="New folder"
              onClick={createProject}
              className={styles.iconButton22}
            >
              <FolderPlus className={styles.icon14} />
            </button>
          </div>
        </div>

        <div className={styles.threadScroller}>
        {searchQueryNormalized ? (
          <div className={styles.searchPanel}>
            <div className={styles.searchPanelHeader}>
              <span className={styles.searchPanelTitle}>
                {t('sidebar.searchResults', { defaultValue: '搜索结果' })}
              </span>
              <span className={styles.searchPanelCount}>{searchMatches.length}</span>
            </div>
            <div className={styles.compactStack}>
              {searchMatches.length > 0 ? searchMatches.map(renderThreadRow) : (
                <div className={styles.emptyState}>
                  {t('sidebar.noResults', { defaultValue: '没有匹配结果' })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {groupMode === 'project' ? (
          <div className={styles.groupsStack}>
            {projectGroups.map(({ project, threads }) => {
              const expanded = isProjectExpanded(project.id);
              const isSystem = Boolean(project.system);
              const canToggleThreadVisibility = threads.length > COLLAPSIBLE_THREAD_LIMIT;
              const showAllThreads = expandedThreadGroups[project.id] === true;
              const visibleThreads = canToggleThreadVisibility && !showAllThreads
                ? threads.slice(0, COLLAPSIBLE_THREAD_LIMIT)
                : threads;
              return (
                <section key={project.id} className={styles.groupSection}>
                  <div className={styles.groupHeader}>
                    <button
                      type="button"
                      onClick={() => toggleProjectExpanded(project.id)}
                      className={styles.groupToggle}
                    >
                      {expanded ? <ChevronDown className={styles.icon14Shrink} /> : <ChevronRight className={styles.icon14Shrink} />}
                      <span className={styles.truncate}>{project.name}</span>
                      <span className={styles.countBadge}>
                        {threads.length}
                      </span>
                    </button>
                    {!isSystem ? (
                      <div className={styles.groupActions}>
                        <button
                          type="button"
                          onClick={() => promptRenameProject(project)}
                          className={styles.groupAction}
                          aria-label={t('sidebar.project.rename', { defaultValue: '重命名项目' })}
                        >
                          <Pencil className={styles.icon14Shrink} />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmRemoveProject(project)}
                          className={cx(styles.groupAction, styles.groupActionDanger)}
                          aria-label={t('sidebar.project.remove', { defaultValue: '删除项目' })}
                        >
                          <Trash2 className={styles.icon14Shrink} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {expanded ? (
                    <div className={styles.groupChildren}>
                      {threads.length > 0 ? (
                        <>
                          {visibleThreads.map(renderThreadRow)}
                          {canToggleThreadVisibility ? (
                            <button
                              type="button"
                              onClick={() => toggleThreadGroupExpanded(project.id)}
                              className={styles.groupListToggleButton}
                            >
                              {showAllThreads
                                ? t('sidebar.collapseList', { defaultValue: '折叠显示' })
                                : t('sidebar.expandList', { defaultValue: '展开显示' })}
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <div className={styles.emptyState}>
                          {t('sidebar.noConversations', { defaultValue: '暂无会话' })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        ) : (
          <div className={styles.groupsStack}>
            {(['local', 'remote', 'cloud'] as ConnectionGroup[]).map((connection) => {
              const threads = connectionGroups.get(connection) ?? [];
              if (threads.length === 0) {
                return null;
              }
              return (
                <section key={connection} className={styles.groupSection}>
                  <div className={styles.connectionHeader}>
                    <span>{connectionLabel[connection]}</span>
                    <span className={styles.countBadge}>
                      {threads.length}
                    </span>
                  </div>
                  <div className={styles.groupChildren}>
                    {threads.map(renderThreadRow)}
                  </div>
                </section>
              );
            })}
            {sortedVisibleThreads.length === 0 ? (
              <div className={styles.emptyState}>
                {showMode === 'all'
                  ? t('sidebar.noConversations', { defaultValue: '暂无会话' })
                  : t('sidebar.noTasksWithFilter', { defaultValue: '没有会话符合当前筛选' })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>

    <div className={styles.footer}>
        <div className={styles.footerStatus}>
          {sourceErrorCount > 0
            ? t('sidebar.syncFailed', { defaultValue: '同步失败' })
            : isSourceLoading
              ? t('sidebar.loading', { defaultValue: '加载中' })
              : t('sidebar.dashboard', { defaultValue: '仪表盘' })}
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cx(styles.settingsLink, isActive && styles.settingsLinkActive)
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cx(styles.settingsIconWrap, isActive && styles.settingsIconWrapActive)}
              >
                <SettingsIcon className={styles.icon18} strokeWidth={2} />
              </div>
              <span className={styles.settingsLabel}>
                {t('sidebar.settings', { defaultValue: '设置' })}
              </span>
            </>
          )}
        </NavLink>
      </div>

      <ConfirmDialog
        open={!!sessionToDelete}
        title={t('actions.confirm', { defaultValue: '确认' })}
        message={t('sidebar.deleteSessionConfirm', {
          label: sessionToDelete?.label,
          defaultValue: `确定要删除对话 "${sessionToDelete?.label ?? ''}" 吗？`,
        })}
        confirmLabel={t('actions.delete', { defaultValue: '删除' })}
        cancelLabel={t('actions.cancel', { defaultValue: '取消' })}
        variant="destructive"
        onConfirm={async () => {
          if (!sessionToDelete) return;
          await deleteSession(sessionToDelete.key);
          if (currentSessionKey === sessionToDelete.key) navigate('/');
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
      />

      <div
        className={styles.resizeHandle}
        onMouseDown={startResize}
      />
    </aside>
  );
}
