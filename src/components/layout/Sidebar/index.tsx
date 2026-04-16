/**
 * Sidebar — NavPanel 风格重写
 * 业务逻辑完整保留自 LegacySidebar，渲染层替换为 NavPanel UI 组件。
 */
import { ActionIcon, Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import {
  Blocks,
  ChevronDown,
  ChevronRight,
  Clock,
  Ellipsis,
  FolderOpen,
  Hexagon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Mic,
  Pin,
  Plus,
  Search,
  Settings as SettingsIcon,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Dropdown, type MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';

import { useSettingsStore, type SidebarThreadWorkspace } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useRemoteMessengerStore } from '@/stores/remote-messenger';
import { useVoiceChatSessionsStore } from '@/stores/voice-chat-sessions';
import {
  fetchCodeAgentSessions,
  fetchWorkspaceAvailability,
  readStoredCodeAgentWorkspaceRoot,
  writeStoredCodeAgentWorkspaceRoot,
} from '@/lib/code-agent';
import { invokeIpc } from '@/lib/api-client';
import { subscribeHostEvent } from '@/lib/host-events';
import {
  buildWorkspaceId,
  deriveWorkspaceName,
  normalizeWorkspacePath,
} from '@/lib/sidebar-workspace';
import { SearchInput } from '@/components/common/SearchInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { NavItem, SideBarLayout } from '@/features/NavPanel';
import { SettingsSidebar } from './SettingsSidebar';

// ─── types ────────────────────────────────────────────────────────────────────

type FolderKey = 'thread' | 'openclaw' | 'realtimeVoice' | 'xiaojiu';

type OpenClawSessionItem = { key: string; label: string; updatedAt: number };
type CliSessionItem = { sessionId: string; title: string; updatedAt: number };
type VoiceSessionItem = { id: string; label: string; updatedAt: number };
type XiaojiuSessionItem = { id: string; label: string; updatedAt: number };
type WorkspaceAvailability = { available: boolean; reason?: string };

const COLLAPSIBLE_SESSION_LIMIT = 5;
const THREAD_WORKSPACE_MIGRATION_KEY = 'mimiclaw:thread-workspaces-migrated-v1';

// ─── styles ───────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ css, token }) => ({
  aside: css`
    display: flex;
    width: 248px;
    flex-shrink: 0;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-right: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgLayout};
  `,
  topSpacer: css`
    height: ${window.electron?.platform === 'darwin' ? '40px' : '2.75rem'};
    width: 100%;
    flex-shrink: 0;
  `,
  footer: css`
    flex-shrink: 0;
    padding: 4px 8px;
    border-top: 1px solid ${token.colorBorderSecondary};
  `,
  /* sub-items are indented — align text with section header text (icon 28 + gap 8 + outer pad 8 = 44) */
  subItem: css`
    padding-inline-start: 16px !important;
  `,
  timeLabel: css`
    font-size: 11px;
    color: ${cssVar.colorTextQuaternary};
    flex-shrink: 0;
  `,
  sessionListToggle: css`
    width: 100%;
    padding: 2px 4px 2px 20px;
    font-size: 11px;
    color: ${cssVar.colorTextTertiary};
    cursor: pointer;
    border-radius: 4px;
    border: none;
    background: none;
    box-shadow: none;
    outline: none;
    text-align: left;
    &:hover { background: ${cssVar.colorFillTertiary}; }
  `,
  emptyHint: css`
    padding: 4px 8px 4px 20px;
    font-size: 12px;
    color: ${cssVar.colorTextQuaternary};
  `,
  warningText: css`
    padding: 4px 8px 4px 20px;
    font-size: 11px;
    color: ${token.colorWarning};
  `,
  searchWrap: css`
    padding: 2px 8px;
  `,
  unavailableTag: css`
    flex-shrink: 0;
    border-radius: 999px;
    background: ${token.colorWarningBg};
    padding: 1px 6px;
    font-size: 10px;
    color: ${token.colorWarningText};
  `,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: number, language: string): string {
  if (!timestamp || Number.isNaN(timestamp)) return '';
  const elapsedMs = Math.max(0, Date.now() - timestamp);
  const isZh = language.startsWith('zh');
  if (elapsedMs < 60_000) return isZh ? '刚刚' : 'now';
  if (elapsedMs < 60 * 60_000) {
    const minutes = Math.floor(elapsedMs / 60_000);
    return isZh ? `${minutes} 分` : `${minutes}m`;
  }
  if (elapsedMs < 24 * 60 * 60_000) {
    const hours = Math.floor(elapsedMs / (60 * 60_000));
    return isZh ? `${hours} 小时` : `${hours}h`;
  }
  const days = Math.floor(elapsedMs / (24 * 60 * 60_000));
  return isZh ? `${days} 天` : `${days}d`;
}

function getWorkspaceSecondaryLabel(workspace: SidebarThreadWorkspace): string {
  const parts = normalizeWorkspacePath(workspace.rootPath).split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2) return '';
  const parent = parts[parts.length - 2] ?? '';
  return parent && parent !== workspace.name ? parent : '';
}

// ─── component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { styles } = useStyles();

  // ── settings store ────────────────────────────────────────────────────────
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const sidebarFolderExpanded = useSettingsStore((s) => s.sidebarFolderExpanded);
  const setSidebarFolderExpanded = useSettingsStore((s) => s.setSidebarFolderExpanded);
  const sidebarThreadWorkspaces = useSettingsStore((s) => s.sidebarThreadWorkspaces);
  const sidebarThreadWorkspaceExpanded = useSettingsStore((s) => s.sidebarThreadWorkspaceExpanded);
  const sidebarActiveContext = useSettingsStore((s) => s.sidebarActiveContext);
  const setSidebarThreadWorkspaceExpanded = useSettingsStore((s) => s.setSidebarThreadWorkspaceExpanded);
  const setSidebarActiveContext = useSettingsStore((s) => s.setSidebarActiveContext);
  const upsertSidebarThreadWorkspace = useSettingsStore((s) => s.upsertSidebarThreadWorkspace);
  const renameSidebarThreadWorkspace = useSettingsStore((s) => s.renameSidebarThreadWorkspace);
  const removeSidebarThreadWorkspace = useSettingsStore((s) => s.removeSidebarThreadWorkspace);
  const touchSidebarThreadWorkspace = useSettingsStore((s) => s.touchSidebarThreadWorkspace);
  const xiaojiuEnabled = useSettingsStore((s) => s.xiaojiuEnabled);

  // ── chat store ────────────────────────────────────────────────────────────
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

  // ── gateway / remote / voice stores ───────────────────────────────────────
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const remoteSessions = useRemoteMessengerStore((s) => s.sessions);
  const remoteLastSyncedAt = useRemoteMessengerStore((s) => s.lastSyncedAt);
  const remoteSyncError = useRemoteMessengerStore((s) => s.syncError);
  const remoteActiveSessionId = useRemoteMessengerStore((s) => s.activeSessionId);
  const setRemoteActiveSessionId = useRemoteMessengerStore((s) => s.setActiveSessionId);

  const voiceSessions = useVoiceChatSessionsStore((s) => s.sessions);
  const voiceSyncError = useVoiceChatSessionsStore((s) => s.syncError);
  const voiceActiveSessionId = useVoiceChatSessionsStore((s) => s.activeSessionId);
  const setVoiceActiveSessionId = useVoiceChatSessionsStore((s) => s.setActiveSessionId);

  // ── router ────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { t, i18n } = useTranslation(['common']);

  // ── local state ───────────────────────────────────────────────────────────
  const [sessionToDelete, setSessionToDelete] = useState<{ key: string; label: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [openClawSessionsExpanded, setOpenClawSessionsExpanded] = useState(false);
  const [xiaojiuSessionsExpanded, setXiaojiuSessionsExpanded] = useState(false);
  const [voiceSessionsExpanded, setVoiceSessionsExpanded] = useState(false);
  const [workspaceSessionsExpanded, setWorkspaceSessionsExpanded] = useState<Record<string, boolean>>({});
  const [workspaceSessionsById, setWorkspaceSessionsById] = useState<Record<string, CliSessionItem[]>>({});
  const [workspaceLoadingById, setWorkspaceLoadingById] = useState<Record<string, boolean>>({});
  const [workspaceErrorById, setWorkspaceErrorById] = useState<Record<string, string | null>>({});
  const [workspaceAvailabilityById, setWorkspaceAvailabilityById] = useState<Record<string, WorkspaceAvailability>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const didRunMigrationRef = useRef(false);
  const didInitialWorkspaceFetchRef = useRef(false);
  const fetchedWorkspaceIdsRef = useRef<Set<string>>(new Set());

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isGatewayRunning) return;
    let cancelled = false;
    const hasExistingMessages = useChatStore.getState().messages.length > 0;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory(hasExistingMessages);
    })();
    return () => { cancelled = true; };
  }, [isGatewayRunning, loadHistory, loadSessions]);

  const isFolderExpanded = useCallback(
    (folder: FolderKey) => sidebarFolderExpanded?.[folder] !== false,
    [sidebarFolderExpanded],
  );

  const setFolderExpanded = useCallback(
    (folder: FolderKey, expanded: boolean) => setSidebarFolderExpanded(folder, expanded),
    [setSidebarFolderExpanded],
  );

  const toggleFolder = useCallback(
    (folder: FolderKey) => setFolderExpanded(folder, !isFolderExpanded(folder)),
    [isFolderExpanded, setFolderExpanded],
  );

  const threadWorkspaces = useMemo(
    () => [...sidebarThreadWorkspaces].sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0)),
    [sidebarThreadWorkspaces],
  );

  const workspaceById = useMemo(
    () => Object.fromEntries(threadWorkspaces.map((w) => [w.id, w])),
    [threadWorkspaces],
  );

  const workspaceIdByNormalizedRoot = useMemo(
    () => Object.fromEntries(threadWorkspaces.map((w) => [normalizeWorkspacePath(w.rootPath), w.id])),
    [threadWorkspaces],
  );

  const openClawSessions = useMemo<OpenClawSessionItem[]>(() => {
    const getLabel = (key: string, displayName?: string, label?: string) =>
      sessionLabels[key] ?? label ?? displayName ?? key;
    return [...sessions]
      .sort((a, b) => {
        const aU = sessionLastActivity[a.key] ?? a.updatedAt ?? 0;
        const bU = sessionLastActivity[b.key] ?? b.updatedAt ?? 0;
        return bU - aU;
      })
      .map((s) => ({
        key: s.key,
        label: getLabel(s.key, s.displayName, s.label),
        updatedAt: sessionLastActivity[s.key] ?? s.updatedAt ?? 0,
      }));
  }, [sessionLabels, sessionLastActivity, sessions]);

  const realtimeVoiceSessions = useMemo<VoiceSessionItem[]>(
    () =>
      [...voiceSessions]
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
        .map((s) => ({ id: s.id, label: s.title, updatedAt: s.lastActivityAt })),
    [voiceSessions],
  );

  const xiaojiuSessionItems = useMemo<XiaojiuSessionItem[]>(() => {
    if (!xiaojiuEnabled) return [];
    const syncBase = remoteLastSyncedAt ?? 0;
    return [...remoteSessions]
      .sort((a, b) => {
        const aU = a.updatedAt ?? syncBase - a.sortIndex * 1000;
        const bU = b.updatedAt ?? syncBase - b.sortIndex * 1000;
        return bU - aU;
      })
      .map((s) => ({
        id: s.id,
        label: s.name,
        updatedAt: s.updatedAt ?? syncBase - s.sortIndex * 1000,
      }));
  }, [remoteLastSyncedAt, remoteSessions, xiaojiuEnabled]);

  const routeSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeWorkspaceRoot = routeSearchParams.get('workspaceRoot')?.trim() || '';
  const routeSessionId = routeSearchParams.get('sessionId')?.trim() || '';
  const activeThreadWorkspaceIdFromRoute =
    (pathname.startsWith('/code-agent/quick-chat') && routeWorkspaceRoot
      ? workspaceIdByNormalizedRoot[normalizeWorkspacePath(routeWorkspaceRoot)]
      : undefined) ?? null;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedQuery.length > 0;
  const matchesQuery = useCallback(
    (value: string) => !hasSearchQuery || value.toLowerCase().includes(normalizedQuery),
    [hasSearchQuery, normalizedQuery],
  );

  const filteredOpenClawSessions = useMemo(
    () => openClawSessions.filter((s) => matchesQuery(s.label)),
    [matchesQuery, openClawSessions],
  );
  const filteredRealtimeVoiceSessions = useMemo(
    () => realtimeVoiceSessions.filter((s) => matchesQuery(s.label)),
    [matchesQuery, realtimeVoiceSessions],
  );
  const filteredXiaojiuSessions = useMemo(
    () => xiaojiuSessionItems.filter((s) => matchesQuery(s.label)),
    [matchesQuery, xiaojiuSessionItems],
  );
  const filteredThreadSessionsByWorkspace = useMemo(() => {
    const next: Record<string, CliSessionItem[]> = {};
    for (const w of threadWorkspaces) {
      next[w.id] = (workspaceSessionsById[w.id] ?? []).filter((s) => matchesQuery(s.title));
    }
    return next;
  }, [matchesQuery, threadWorkspaces, workspaceSessionsById]);

  const visibleThreadWorkspaces = useMemo(
    () =>
      threadWorkspaces.filter((w) => {
        if (!hasSearchQuery) return true;
        if (matchesQuery(w.name)) return true;
        return (filteredThreadSessionsByWorkspace[w.id] ?? []).length > 0;
      }),
    [filteredThreadSessionsByWorkspace, hasSearchQuery, matchesQuery, threadWorkspaces],
  );

  const refreshWorkspaceSessions = useCallback(async (workspace: SidebarThreadWorkspace) => {
    setWorkspaceLoadingById((prev) => ({ ...prev, [workspace.id]: true }));
    setWorkspaceErrorById((prev) => ({ ...prev, [workspace.id]: null }));
    try {
      const availability = await fetchWorkspaceAvailability(workspace.rootPath);
      setWorkspaceAvailabilityById((prev) => ({ ...prev, [workspace.id]: availability }));
      if (!availability.available) {
        setWorkspaceSessionsById((prev) => ({ ...prev, [workspace.id]: [] }));
        setWorkspaceErrorById((prev) => ({
          ...prev,
          [workspace.id]: t('sidebar.workspaceUnavailable', { defaultValue: '工作区不可用' }),
        }));
        return;
      }
      const sessionsInWorkspace = await fetchCodeAgentSessions(workspace.rootPath, 60);
      const mapped = [...sessionsInWorkspace]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((s) => ({
          sessionId: s.sessionId,
          title: s.title?.trim() || s.sessionId,
          updatedAt: s.updatedAt,
        }));
      setWorkspaceSessionsById((prev) => ({ ...prev, [workspace.id]: mapped }));
    } catch {
      setWorkspaceSessionsById((prev) => ({ ...prev, [workspace.id]: [] }));
      setWorkspaceErrorById((prev) => ({
        ...prev,
        [workspace.id]: t('sidebar.threadSessionsLoadFailed', { defaultValue: '线程会话加载失败' }),
      }));
    } finally {
      setWorkspaceLoadingById((prev) => ({ ...prev, [workspace.id]: false }));
    }
  }, [t]);

  useEffect(() => {
    if (didRunMigrationRef.current) return;
    didRunMigrationRef.current = true;
    const runMigration = async () => {
      try {
        if (window.localStorage.getItem(THREAD_WORKSPACE_MIGRATION_KEY) === '1') return;
        const legacyRoot = readStoredCodeAgentWorkspaceRoot().trim();
        if (!legacyRoot) {
          window.localStorage.setItem(THREAD_WORKSPACE_MIGRATION_KEY, '1');
          return;
        }
        const normalizedLegacyRoot = normalizeWorkspacePath(legacyRoot);
        const existing = sidebarThreadWorkspaces.find(
          (w) => normalizeWorkspacePath(w.rootPath) === normalizedLegacyRoot,
        );
        if (!existing) {
          const workspaceId = await buildWorkspaceId(legacyRoot);
          if (workspaceId) {
            const now = Date.now();
            upsertSidebarThreadWorkspace({
              id: workspaceId,
              rootPath: legacyRoot,
              name: deriveWorkspaceName(legacyRoot) || legacyRoot,
              createdAt: now,
              lastUsedAt: now,
            });
            setSidebarThreadWorkspaceExpanded(workspaceId, true);
          }
        }
        window.localStorage.setItem(THREAD_WORKSPACE_MIGRATION_KEY, '1');
      } catch { /* ignore */ }
    };
    void runMigration();
  }, [sidebarThreadWorkspaces, setSidebarThreadWorkspaceExpanded, upsertSidebarThreadWorkspace]);

  useEffect(() => {
    if (threadWorkspaces.length === 0) return;
    if (!didInitialWorkspaceFetchRef.current) {
      didInitialWorkspaceFetchRef.current = true;
      for (const w of threadWorkspaces) {
        fetchedWorkspaceIdsRef.current.add(w.id);
        void refreshWorkspaceSessions(w);
      }
      return;
    }
    for (const w of threadWorkspaces) {
      if (fetchedWorkspaceIdsRef.current.has(w.id)) continue;
      fetchedWorkspaceIdsRef.current.add(w.id);
      void refreshWorkspaceSessions(w);
    }
  }, [refreshWorkspaceSessions, threadWorkspaces]);

  useEffect(() => {
    const refresh = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const request = (payload as { request?: unknown }).request;
      if (!request || typeof request !== 'object') return;
      const workspaceRoot = (request as { workspaceRoot?: unknown }).workspaceRoot;
      if (typeof workspaceRoot !== 'string' || !workspaceRoot.trim()) return;
      const workspaceId = workspaceIdByNormalizedRoot[normalizeWorkspacePath(workspaceRoot)];
      if (!workspaceId) return;
      const workspace = workspaceById[workspaceId];
      if (!workspace) return;
      void refreshWorkspaceSessions(workspace);
    };
    const unsubA = subscribeHostEvent('code-agent:run-completed', refresh);
    const unsubB = subscribeHostEvent('code-agent:run-failed', refresh);
    return () => { unsubA(); unsubB(); };
  }, [refreshWorkspaceSessions, workspaceById, workspaceIdByNormalizedRoot]);

  useEffect(() => {
    if (pathname === '/' || pathname.startsWith('/chat/openclaw')) {
      setSidebarActiveContext({ kind: 'openclaw', workspaceId: null });
      return;
    }
    if (pathname.startsWith('/chat/voice')) {
      setSidebarActiveContext({ kind: 'realtimeVoice', workspaceId: null });
      return;
    }
    if (pathname.startsWith('/code-agent/quick-chat') && activeThreadWorkspaceIdFromRoute) {
      setSidebarActiveContext({ kind: 'thread', workspaceId: activeThreadWorkspaceIdFromRoute });
    }
  }, [activeThreadWorkspaceIdFromRoute, pathname, setSidebarActiveContext]);

  useEffect(() => {
    const ids = new Set(threadWorkspaces.map((w) => w.id));
    const clean = <T extends Record<string, unknown>>(obj: T): T =>
      Object.fromEntries(Object.entries(obj).filter(([id]) => ids.has(id))) as T;
    setWorkspaceSessionsById(clean);
    setWorkspaceLoadingById(clean);
    setWorkspaceErrorById(clean);
    setWorkspaceAvailabilityById(clean);
  }, [threadWorkspaces]);

  // ── handlers ─────────────────────────────────────────────────────────────

  const handleAddWorkspace = useCallback(async () => {
    const result = (await invokeIpc('dialog:open', { properties: ['openDirectory'] })) as {
      canceled: boolean;
      filePaths?: string[];
    };
    if (result.canceled || !result.filePaths?.[0]) return;
    const rootPath = result.filePaths[0].trim();
    if (!rootPath) return;
    const normalizedRoot = normalizeWorkspacePath(rootPath);
    const existing = threadWorkspaces.find(
      (w) => normalizeWorkspacePath(w.rootPath) === normalizedRoot,
    );
    if (existing) {
      setSidebarThreadWorkspaceExpanded(existing.id, true);
      setSidebarActiveContext({ kind: 'thread', workspaceId: existing.id });
      touchSidebarThreadWorkspace(existing.id);
      void refreshWorkspaceSessions(existing);
      return;
    }
    const workspaceId = await buildWorkspaceId(rootPath);
    if (!workspaceId) return;
    const now = Date.now();
    const workspace: SidebarThreadWorkspace = {
      id: workspaceId,
      rootPath,
      name: deriveWorkspaceName(rootPath) || rootPath,
      createdAt: now,
      lastUsedAt: now,
    };
    upsertSidebarThreadWorkspace(workspace);
    setSidebarThreadWorkspaceExpanded(workspace.id, true);
    setSidebarActiveContext({ kind: 'thread', workspaceId: workspace.id });
    writeStoredCodeAgentWorkspaceRoot(rootPath);
    void refreshWorkspaceSessions(workspace);
  }, [
    refreshWorkspaceSessions, setSidebarActiveContext, setSidebarThreadWorkspaceExpanded,
    threadWorkspaces, touchSidebarThreadWorkspace, upsertSidebarThreadWorkspace,
  ]);

  const focusSearch = useCallback(() => {
    setSearchExpanded(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const handleOpenClawNewThread = useCallback(() => {
    setSidebarActiveContext({ kind: 'openclaw', workspaceId: null });
    setFolderExpanded('openclaw', true);
    newSession();
    navigate('/chat/openclaw');
  }, [navigate, newSession, setFolderExpanded, setSidebarActiveContext]);

  const handleRealtimeVoiceNewThread = useCallback(() => {
    setSidebarActiveContext({ kind: 'realtimeVoice', workspaceId: null });
    setFolderExpanded('realtimeVoice', true);
    void invokeIpc('voice:openDialog').catch(() => {});
  }, [setFolderExpanded, setSidebarActiveContext]);

  const handleWorkspaceNewThread = useCallback(
    (workspace: SidebarThreadWorkspace) => {
      const availability = workspaceAvailabilityById[workspace.id];
      if (availability && !availability.available) return;
      setSidebarActiveContext({ kind: 'thread', workspaceId: workspace.id });
      touchSidebarThreadWorkspace(workspace.id);
      setSidebarThreadWorkspaceExpanded(workspace.id, true);
      writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
      const params = new URLSearchParams();
      params.set('workspaceRoot', workspace.rootPath);
      params.set('newThread', String(Date.now()));
      navigate(`/code-agent/quick-chat?${params.toString()}`);
    },
    [navigate, setSidebarActiveContext, setSidebarThreadWorkspaceExpanded,
      touchSidebarThreadWorkspace, workspaceAvailabilityById],
  );

  const handleGlobalNewThread = useCallback(() => {
    if (sidebarActiveContext.kind === 'realtimeVoice') {
      handleRealtimeVoiceNewThread();
      return;
    }
    if (sidebarActiveContext.kind === 'thread') {
      const activeWorkspace =
        (sidebarActiveContext.workspaceId
          ? workspaceById[sidebarActiveContext.workspaceId]
          : undefined) ?? threadWorkspaces[0];
      if (activeWorkspace) {
        handleWorkspaceNewThread(activeWorkspace);
        return;
      }
      void handleAddWorkspace();
      return;
    }
    handleOpenClawNewThread();
  }, [
    handleAddWorkspace, handleOpenClawNewThread, handleRealtimeVoiceNewThread,
    handleWorkspaceNewThread, sidebarActiveContext, threadWorkspaces, workspaceById,
  ]);

  const handleWorkspaceRename = useCallback((workspace: SidebarThreadWorkspace) => {
    const nextName = window.prompt(
      t('sidebar.workspace.renamePrompt', { defaultValue: '重命名工作区' }),
      workspace.name,
    );
    if (!nextName) return;
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === workspace.name) return;
    renameSidebarThreadWorkspace(workspace.id, trimmed);
  }, [renameSidebarThreadWorkspace, t]);

  const handleWorkspaceRemove = useCallback((workspace: SidebarThreadWorkspace) => {
    const confirmed = window.confirm(
      t('sidebar.workspace.removeConfirm', {
        defaultValue: `确定从列表移除工作区"${workspace.name}"吗？此操作不会删除本地文件。`,
      }),
    );
    if (!confirmed) return;
    removeSidebarThreadWorkspace(workspace.id);
  }, [removeSidebarThreadWorkspace, t]);

  const handleWorkspaceOpenInFinder = useCallback((workspace: SidebarThreadWorkspace) => {
    void invokeIpc('shell:showItemInFolder', workspace.rootPath).catch(() => {});
  }, []);

  const handleOpenClawSession = useCallback((sessionKey: string) => {
    setSidebarActiveContext({ kind: 'openclaw', workspaceId: null });
    switchSession(sessionKey);
    navigate('/chat/openclaw');
  }, [navigate, setSidebarActiveContext, switchSession]);

  const handleRealtimeVoiceSession = useCallback((sessionId: string) => {
    setSidebarActiveContext({ kind: 'realtimeVoice', workspaceId: null });
    setVoiceActiveSessionId(sessionId);
    navigate('/chat/voice');
  }, [navigate, setSidebarActiveContext, setVoiceActiveSessionId]);

  const handleXiaojiuSession = useCallback((sessionId: string) => {
    setRemoteActiveSessionId(sessionId);
    navigate('/chat/xiaojiu');
  }, [navigate, setRemoteActiveSessionId]);

  const handleThreadSession = useCallback(
    (workspace: SidebarThreadWorkspace, sessionId: string) => {
      setSidebarActiveContext({ kind: 'thread', workspaceId: workspace.id });
      touchSidebarThreadWorkspace(workspace.id);
      setSidebarThreadWorkspaceExpanded(workspace.id, true);
      writeStoredCodeAgentWorkspaceRoot(workspace.rootPath);
      const params = new URLSearchParams();
      params.set('workspaceRoot', workspace.rootPath);
      params.set('sessionId', sessionId);
      navigate(`/code-agent/quick-chat?${params.toString()}`);
    },
    [navigate, setSidebarActiveContext, setSidebarThreadWorkspaceExpanded, touchSidebarThreadWorkspace],
  );

  // ── derived counts ────────────────────────────────────────────────────────

  const openClawCount = filteredOpenClawSessions.length;
  const xiaojiuCount = filteredXiaojiuSessions.length;
  const realtimeVoiceCount = filteredRealtimeVoiceSessions.length;
  const hasActiveOpenClawSession =
    pathname.startsWith('/chat/openclaw') && openClawSessions.some((s) => s.key === currentSessionKey);

  const canToggleOpenClawSessions = openClawCount > COLLAPSIBLE_SESSION_LIMIT;
  const visibleOpenClawSessions =
    canToggleOpenClawSessions && !openClawSessionsExpanded
      ? filteredOpenClawSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
      : filteredOpenClawSessions;

  const canToggleRealtimeVoiceSessions = realtimeVoiceCount > COLLAPSIBLE_SESSION_LIMIT;
  const visibleRealtimeVoiceSessions =
    canToggleRealtimeVoiceSessions && !voiceSessionsExpanded
      ? filteredRealtimeVoiceSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
      : filteredRealtimeVoiceSessions;

  const canToggleXiaojiuSessions = xiaojiuCount > COLLAPSIBLE_SESSION_LIMIT;
  const visibleXiaojiuSessions =
    canToggleXiaojiuSessions && !xiaojiuSessionsExpanded
      ? filteredXiaojiuSessions.slice(0, COLLAPSIBLE_SESSION_LIMIT)
      : filteredXiaojiuSessions;

  if (sidebarCollapsed) return null;

  // ── 设置路由：整个侧边栏切换为设置导航 ──────────────────────────────────
  if (pathname === '/settings') {
    return <SettingsSidebar />;
  }

  // ── render helpers ────────────────────────────────────────────────────────

  /** 折叠图标 */
  const FolderChevron = ({ expanded }: { expanded: boolean }) => (
    expanded
      ? <ChevronDown size={14} style={{ color: cssVar.colorTextTertiary, flexShrink: 0 }} />
      : <ChevronRight size={14} style={{ color: cssVar.colorTextTertiary, flexShrink: 0 }} />
  );

  /** 悬浮时才出现的时间标签 */
  const TimeLabel = ({ text }: { text: string }) => (
    <span className={styles.timeLabel}>{text}</span>
  );

  // ── render ────────────────────────────────────────────────────────────────

  const headerNode = (
    <Flexbox gap={2} paddingInline={8} paddingBlock={4}>
      {/* 新线程 */}
      <NavItem
        icon={SquarePen}
        title={t('sidebar.newThread', { defaultValue: '新线程' })}
        onClick={handleGlobalNewThread}
      />

      {/* 搜索 */}
      {!searchExpanded && !hasSearchQuery ? (
        <NavItem
          icon={Search}
          title={t('actions.search', { defaultValue: '搜索' })}
          onClick={focusSearch}
        />
      ) : (
        <div className={styles.searchWrap}>
          <SearchInput
            ref={searchInputRef}
            value={searchQuery}
            onValueChange={setSearchQuery}
            onBlur={() => { if (!searchQuery.trim()) setSearchExpanded(false); }}
            placeholder="Search"
            iconSize={14}
          />
        </div>
      )}

      {/* 技能 */}
      <NavItem
        icon={Hexagon}
        title={t('sidebar.skills', { defaultValue: '技能' })}
        active={pathname === '/skills'}
        onClick={() => navigate('/skills')}
      />

      {/* Agents */}
      <NavItem
        icon={Blocks}
        title={t('sidebar.pluginsNav', { defaultValue: 'Plugins' })}
        active={pathname === '/agents'}
        onClick={() => navigate('/agents')}
      />

      {/* 自动化 */}
      <NavItem
        icon={Clock}
        title={t('sidebar.automationNav', { defaultValue: '自动化' })}
        active={pathname === '/cron'}
        onClick={() => navigate('/cron')}
      />
    </Flexbox>
  );

  const bodyNode = (
    <Flexbox gap={2} paddingInline={8} paddingBlock={4}>

      {/* ── Thread 工作区 ────────────────────────────────────────────── */}
      <NavItem
        icon={FolderOpen}
        title={t('sidebar.folder.thread', { defaultValue: '线程' })}
        active={false}
        extra={<FolderChevron expanded={isFolderExpanded('thread')} />}
        actions={
          <ActionIcon
            icon={Plus}
            size={{ blockSize: 20, size: 12 }}
            title={t('sidebar.addWorkspace', { defaultValue: '添加工作区' })}
            onClick={(e) => { e.stopPropagation(); void handleAddWorkspace(); }}
          />
        }
        onClick={() => {
          toggleFolder('thread');
          const first = threadWorkspaces[0];
          if (first) {
            setSidebarActiveContext({ kind: 'thread', workspaceId: first.id });
            void refreshWorkspaceSessions(first);
          }
        }}
      />

      {isFolderExpanded('thread') && (
        <>
          {visibleThreadWorkspaces.length === 0 && (
            <div className={styles.emptyHint}>{t('sidebar.empty.thread', { defaultValue: '无线程' })}</div>
          )}

          {visibleThreadWorkspaces.map((workspace) => {
            const expanded = sidebarThreadWorkspaceExpanded?.[workspace.id] !== false;
            const availability = workspaceAvailabilityById[workspace.id] ?? { available: true };
            const secondaryLabel = getWorkspaceSecondaryLabel(workspace);
            const sessionsInWorkspace = filteredThreadSessionsByWorkspace[workspace.id] ?? [];
            const isLoading = workspaceLoadingById[workspace.id] === true;
            const error = workspaceErrorById[workspace.id];
            const canToggleSessions = sessionsInWorkspace.length > COLLAPSIBLE_SESSION_LIMIT;
            const sessionsExpanded = workspaceSessionsExpanded[workspace.id] === true;
            const visibleSessions =
              canToggleSessions && !sessionsExpanded
                ? sessionsInWorkspace.slice(0, COLLAPSIBLE_SESSION_LIMIT)
                : sessionsInWorkspace;

            const workspaceMenu: MenuProps = {
              items: [
                { key: 'rename', label: t('sidebar.workspace.rename', { defaultValue: '重命名' }) },
                { key: 'remove', label: t('sidebar.workspace.remove', { defaultValue: '从列表移除' }) },
                { key: 'open', label: t('sidebar.workspace.openInFinder', { defaultValue: '在 Finder 中打开' }) },
              ],
              onClick: ({ key }) => {
                if (key === 'rename') { handleWorkspaceRename(workspace); return; }
                if (key === 'remove') { handleWorkspaceRemove(workspace); return; }
                handleWorkspaceOpenInFinder(workspace);
              },
            };

            return (
              <div key={workspace.id}>
                <NavItem
                  className={styles.subItem}
                  icon={FolderOpen}
                  title={
                    <Flexbox horizontal align="center" gap={4} style={{ overflow: 'hidden' }}>
                      <Text ellipsis style={{ flex: 1 }}>{workspace.name}</Text>
                      {secondaryLabel && (
                        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{secondaryLabel}</Text>
                      )}
                      {!availability.available && (
                        <span className={styles.unavailableTag}>
                          {t('sidebar.workspaceUnavailable', { defaultValue: '不可用' })}
                        </span>
                      )}
                    </Flexbox>
                  }
                  slots={{ iconPostfix: <FolderChevron expanded={expanded} /> }}
                  actions={
                    <Flexbox horizontal gap={2}>
                      <ActionIcon
                        icon={Plus}
                        size={{ blockSize: 20, size: 12 }}
                        disabled={!availability.available}
                        title={t('sidebar.newThread', { defaultValue: '新线程' })}
                        onClick={(e) => { e.stopPropagation(); handleWorkspaceNewThread(workspace); }}
                      />
                      <Dropdown menu={workspaceMenu} trigger={['click']}>
                        <ActionIcon
                          icon={Ellipsis}
                          size={{ blockSize: 20, size: 12 }}
                          title={t('sidebar.workspace.more', { defaultValue: '更多' })}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Dropdown>
                    </Flexbox>
                  }
                  onClick={() => {
                    setSidebarThreadWorkspaceExpanded(workspace.id, !expanded);
                    setSidebarActiveContext({ kind: 'thread', workspaceId: workspace.id });
                    touchSidebarThreadWorkspace(workspace.id);
                    void refreshWorkspaceSessions(workspace);
                  }}
                />

                {expanded && (
                  <>
                    {isLoading && (
                      <div className={styles.emptyHint}>{t('status.loading', { defaultValue: '加载中...' })}</div>
                    )}
                    {!isLoading && error && <div className={styles.warningText}>{error}</div>}
                    {!isLoading && !error && visibleSessions.length === 0 && (
                      <div className={styles.emptyHint}>{t('sidebar.empty.thread', { defaultValue: '无线程' })}</div>
                    )}
                    {visibleSessions.map((session) => {
                      const isActive =
                        pathname.startsWith('/code-agent/quick-chat') &&
                        activeThreadWorkspaceIdFromRoute === workspace.id &&
                        routeSessionId === session.sessionId;
                      return (
                        <NavItem
                          key={`${workspace.id}:${session.sessionId}`}
                          className={styles.subItem}
                          title={session.title}
                          active={isActive}
                          extra={<TimeLabel text={formatRelativeTime(session.updatedAt, i18n.language)} />}
                          style={{ paddingInlineStart: 28 }}
                          onClick={() => handleThreadSession(workspace, session.sessionId)}
                        />
                      );
                    })}
                    {canToggleSessions && (
                      <button
                        type="button"
                        className={styles.sessionListToggle}
                        onClick={() =>
                          setWorkspaceSessionsExpanded((prev) => ({
                            ...prev,
                            [workspace.id]: !sessionsExpanded,
                          }))
                        }
                      >
                        {sessionsExpanded
                          ? t('sidebar.collapseList', { defaultValue: '折叠显示' })
                          : t('sidebar.expandList', { defaultValue: '展开显示' })}
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── OpenClaw ───────────────────────────────────────────────────── */}
      <NavItem
        icon={MessageSquare}
        title={t('sidebar.folder.openClaw', { defaultValue: 'OpenClaw' })}
        active={pathname.startsWith('/chat/openclaw') && !hasActiveOpenClawSession}
        style={{ marginTop: 6 }}
        extra={<FolderChevron expanded={isFolderExpanded('openclaw')} />}
        actions={
          <ActionIcon
            icon={Plus}
            size={{ blockSize: 20, size: 12 }}
            title={t('sidebar.newThread', { defaultValue: '新线程' })}
            onClick={(e) => { e.stopPropagation(); handleOpenClawNewThread(); }}
          />
        }
        onClick={() => {
          toggleFolder('openclaw');
          setSidebarActiveContext({ kind: 'openclaw', workspaceId: null });
        }}
      />

      {isFolderExpanded('openclaw') && (
        <>
          {openClawCount === 0 && (
            <div className={styles.emptyHint}>{t('sidebar.empty.openClaw', { defaultValue: '无对话' })}</div>
          )}
          {visibleOpenClawSessions.map((session) => {
            const isActive = pathname.startsWith('/chat/openclaw') && currentSessionKey === session.key;
            const isRunning = isActive && chatSending;
            return (
              <NavItem
                key={session.key}
                className={styles.subItem}
                icon={isRunning ? Loader2 : undefined}
                title={session.label}
                active={isActive}
                extra={<TimeLabel text={formatRelativeTime(session.updatedAt, i18n.language)} />}
                actions={
                  <ActionIcon
                    icon={Trash2}
                    size={{ blockSize: 20, size: 12 }}
                    title="删除会话"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionToDelete({ key: session.key, label: session.label });
                    }}
                  />
                }
                slots={!isRunning ? { titlePrefix: <Pin size={11} style={{ flexShrink: 0, opacity: 0.4 }} /> } : undefined}
                onClick={() => handleOpenClawSession(session.key)}
              />
            );
          })}
          {canToggleOpenClawSessions && (
            <button
              type="button"
              className={styles.sessionListToggle}
              onClick={() => setOpenClawSessionsExpanded((v) => !v)}
            >
              {openClawSessionsExpanded
                ? t('sidebar.collapseList', { defaultValue: '折叠显示' })
                : t('sidebar.expandList', { defaultValue: '展开显示' })}
            </button>
          )}
        </>
      )}

      {/* ── 小九 ────────────────────────────────────────────────────────── */}
      {xiaojiuEnabled && (
        <>
          <NavItem
            icon={MessageCircle}
            title={t('sidebar.folder.xiaojiu', { defaultValue: '小九' })}
            active={pathname.startsWith('/chat/xiaojiu')}
            style={{ marginTop: 6 }}
            extra={
              <>
                {xiaojiuCount > 0 && <Text style={{ fontSize: 11 }}>{xiaojiuCount}</Text>}
                <FolderChevron expanded={isFolderExpanded('xiaojiu')} />
              </>
            }
            onClick={() => {
              toggleFolder('xiaojiu');
              const first = xiaojiuSessionItems[0];
              if (first) setRemoteActiveSessionId(first.id);
              navigate('/chat/xiaojiu');
            }}
          />
          {isFolderExpanded('xiaojiu') && (
            <>
              {remoteSyncError && (
                <div className={styles.warningText}>{t('sidebar.syncFailed', { defaultValue: '同步失败' })}</div>
              )}
              {xiaojiuCount === 0 && (
                <div className={styles.emptyHint}>{t('sidebar.noConversations', { defaultValue: '暂无会话' })}</div>
              )}
              {visibleXiaojiuSessions.map((session) => {
                const isActive = pathname.startsWith('/chat/xiaojiu') && remoteActiveSessionId === session.id;
                return (
                  <NavItem
                    key={session.id}
                    className={styles.subItem}
                    title={session.label}
                    active={isActive}
                    extra={<TimeLabel text={formatRelativeTime(session.updatedAt, i18n.language)} />}
                    onClick={() => handleXiaojiuSession(session.id)}
                  />
                );
              })}
              {canToggleXiaojiuSessions && (
                <button
                  type="button"
                  className={styles.sessionListToggle}
                  onClick={() => setXiaojiuSessionsExpanded((v) => !v)}
                >
                  {xiaojiuSessionsExpanded
                    ? t('sidebar.collapseList', { defaultValue: '折叠显示' })
                    : t('sidebar.expandList', { defaultValue: '展开显示' })}
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* ── 实时语音 ────────────────────────────────────────────────────── */}
      <NavItem
        icon={Mic}
        title={t('sidebar.folder.realtimeVoice', { defaultValue: '实时语音' })}
        active={pathname.startsWith('/chat/voice')}
        style={{ marginTop: 6 }}
        extra={<FolderChevron expanded={isFolderExpanded('realtimeVoice')} />}
        actions={
          <ActionIcon
            icon={Plus}
            size={{ blockSize: 20, size: 12 }}
            title={t('sidebar.newThread', { defaultValue: '新线程' })}
            onClick={(e) => { e.stopPropagation(); handleRealtimeVoiceNewThread(); }}
          />
        }
        onClick={() => {
          toggleFolder('realtimeVoice');
          setSidebarActiveContext({ kind: 'realtimeVoice', workspaceId: null });
        }}
      />

      {isFolderExpanded('realtimeVoice') && (
        <>
          {voiceSyncError && (
            <div className={styles.warningText}>{t('sidebar.syncFailed', { defaultValue: '同步失败' })}</div>
          )}
          {realtimeVoiceCount === 0 && (
            <div className={styles.emptyHint}>{t('sidebar.empty.realtimeVoice', { defaultValue: '无语音会话' })}</div>
          )}
          {visibleRealtimeVoiceSessions.map((session) => {
            const isActive = pathname.startsWith('/chat/voice') && voiceActiveSessionId === session.id;
            return (
              <NavItem
                key={session.id}
                className={styles.subItem}
                title={session.label}
                active={isActive}
                extra={<TimeLabel text={formatRelativeTime(session.updatedAt, i18n.language)} />}
                onClick={() => handleRealtimeVoiceSession(session.id)}
              />
            );
          })}
          {canToggleRealtimeVoiceSessions && (
            <button
              type="button"
              className={styles.sessionListToggle}
              onClick={() => setVoiceSessionsExpanded((v) => !v)}
            >
              {voiceSessionsExpanded
                ? t('sidebar.collapseList', { defaultValue: '折叠显示' })
                : t('sidebar.expandList', { defaultValue: '展开显示' })}
            </button>
          )}
        </>
      )}

    </Flexbox>
  );

  return (
    <aside className={styles.aside}>
      <div className={styles.topSpacer} />

      <SideBarLayout header={headerNode} body={bodyNode} />

      {/* 底部：设置 */}
      <div className={styles.footer}>
        <NavItem
          icon={SettingsIcon}
          title={t('sidebar.settings', { defaultValue: '设置' })}
          active={pathname === '/settings'}
          onClick={() => navigate('/settings')}
        />
      </div>

      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        title={t('actions.delete', { defaultValue: '删除' })}
        message={t('sidebar.deleteSessionConfirm', {
          defaultValue: '确定要删除会话 "{{label}}" 吗？',
          label: sessionToDelete?.label || '',
        })}
        confirmLabel={t('actions.delete', { defaultValue: '删除' })}
        cancelLabel={t('actions.cancel', { defaultValue: '取消' })}
        onConfirm={() => {
          if (sessionToDelete) deleteSession(sessionToDelete.key);
          setSessionToDelete(null);
        }}
        onCancel={() => setSessionToDelete(null)}
        variant="destructive"
      />
    </aside>
  );
}
