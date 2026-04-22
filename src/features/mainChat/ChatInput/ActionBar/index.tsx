import { ChatInputActions, type ChatInputActionItem } from '@lobehub/editor/react';
import { ActionIcon, Tag } from '@lobehub/ui';
import { Dropdown, type MenuProps } from 'antd';
import { X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useVolcengineAsr } from '@/hooks/useVolcengineAsr';
import { useChatStore, topicSelectors } from '@/stores/chat';
import { aiModelSelectors, useProviderStore } from '@/stores/providers';
import { useSkillsStore } from '@/stores/skills';
import { useSettingsStore, labPreferSelectors } from '@/stores/settings';
import { chatInputStoreSelectors, useChatInputStore } from '../store';
import type { ChatInputActionKey } from '../types';
import { useChatInputContext } from '../ChatInputProvider';
import { RuntimeConfig } from '../RuntimeConfig';
import { TokenDisplay } from '../Desktop/TokenDisplay';
import {
  handleAgentModeAction,
  handleClearAction,
  handleFileUploadAction,
  handleHistoryAction,
  handleMainTokenAction,
  handleMemoryAction,
  handleMentionAction,
  handleModelAction,
  handleParamsAction,
  handlePortalTokenAction,
  handlePromptTransformAction,
  handleSaveTopicAction,
  handleSearchAction,
  handleSttAction,
  handleToolsAction,
  handleTypoAction,
} from './actions';
import { ACTION_META_MAP } from './config';
import type { ActionHandlerContext } from './context';

const IMPLEMENTED_ACTIONS = new Set<ChatInputActionKey>([
  'agentMode',
  'clear',
  'fileUpload',
  'history',
  'mainToken',
  'memory',
  'mention',
  'model',
  'params',
  'portalToken',
  'promptTransform',
  'saveTopic',
  'search',
  'stt',
  'tools',
  'typo',
]);

export function ChatInputActionBar() {
  const {
    agentId,
    attachments,
    clearAttachments,
    editor,
    leftActions = [],
    mentionItems = [],
    pickFiles,
    removeAttachment,
    rightActions = [],
    setExpanded,
  } = useChatInputContext();
  const clearCurrentTopic = useChatStore((s) => s.clearCurrentTopic);
  const createTopic = useChatStore((s) => s.createTopic);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const currentTopicId = useChatStore((s) => s.currentTopicId);
  const currentTopicTokens = useChatStore(topicSelectors.currentTopicTokens);
  const mode = useChatStore((s) => s.mode);
  const setChatMode = useChatStore((s) => s.setChatMode);
  const enabledModels = useProviderStore(useShallow((s) => s.accounts.filter((account) => account.enabled)));
  const defaultAccountId = useProviderStore((s) => s.defaultAccountId);
  const setDefaultAccount = useProviderStore((s) => s.setDefaultAccount);
  const supportsSearch = useProviderStore(
    aiModelSelectors.supportsSearch(defaultAccountId || ''),
  );
  const isDevMode = useSettingsStore((s) => s.preference.isDevMode);
  const memoryEnabled = useSettingsStore(labPreferSelectors.enabled('memory'));
  const promptTransformEnabled = useSettingsStore(labPreferSelectors.enabled('promptTransform'));
  const isSttEnabled = useSettingsStore(labPreferSelectors.enabled('stt'));
  const searchEnabled = useChatInputStore(chatInputStoreSelectors.searchEnabled);
  const historyCount = useChatInputStore(chatInputStoreSelectors.historyCount);
  const memoryTurnEnabled = useChatInputStore(chatInputStoreSelectors.memoryTurnEnabled);
  const modelParams = useChatInputStore(chatInputStoreSelectors.modelParams);
  const setSearchEnabled = useChatInputStore((s) => s.setSearchEnabled);
  const setHistoryCount = useChatInputStore((s) => s.setHistoryCount);
  const setMemoryTurnEnabled = useChatInputStore((s) => s.setMemoryTurnEnabled);
  const setModelParams = useChatInputStore((s) => s.setModelParams);
  const skills = useSkillsStore((s) => s.skills);
  const skillsLoading = useSkillsStore((s) => s.loading);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const enableSkill = useSkillsStore((s) => s.enableSkill);
  const disableSkill = useSkillsStore((s) => s.disableSkill);

  const handleTranscriptReady = useCallback((text: string) => {
    const transcript = text.trim();
    if (!transcript) return;
    const shouldBreakLine = (editor?.getMarkdownContent().trim().length ?? 0) > 0;
    editor?.insertTextAtCursor(`${shouldBreakLine ? '\n' : ''}${transcript}`);
  }, [editor]);

  const { cancelRecording, isRecording: isSttRecording, isTranscribing: isSttTranscribing, toggleRecording } = useVolcengineAsr({
    onTranscriptReady: handleTranscriptReady,
  });

  useEffect(() => {
    if (!isSttEnabled && isSttRecording) {
      cancelRecording();
    }
  }, [cancelRecording, isSttEnabled, isSttRecording]);

  const toggleSkillEnabled = useCallback(async (skillId: string) => {
    const target = skills.find((skill) => skill.id === skillId);
    if (!target) return;
    try {
      if (target.enabled) {
        await disableSkill(skillId);
      } else {
        await enableSkill(skillId);
      }
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  }, [disableSkill, enableSkill, skills]);

  const enabledSkillIds = useMemo(
    () => skills.filter((skill) => skill.enabled).map((skill) => skill.id),
    [skills],
  );

  const toolsMenu = useMemo<MenuProps>(() => {
    const items: NonNullable<MenuProps['items']> = skills.length > 0
      ? skills.map((skill) => ({
        disabled: skill.isCore,
        key: skill.id,
        label: `${skill.name}${skill.isCore ? ' (core)' : ''}`,
      }))
      : [
        {
          disabled: true,
          key: '__empty',
          label: skillsLoading ? 'Loading tools…' : 'No tools installed',
        },
      ];

    return {
      items,
      multiple: true,
      onClick: ({ key }) => {
        if (key === '__empty') return;
        void toggleSkillEnabled(String(key));
      },
      selectedKeys: enabledSkillIds,
      selectable: true,
    };
  }, [enabledSkillIds, skills, skillsLoading, toggleSkillEnabled]);

  const orderedActions = useMemo(() => Array.from(new Set([...leftActions, ...rightActions])), [leftActions, rightActions]);
  const actionContext = useMemo<ActionHandlerContext>(() => ({
    agentId,
    clearAttachments,
    clearCurrentTopic,
    createTopic,
    currentSessionKey,
    currentTopicId,
    currentTopicTokens,
    defaultAccountId,
    editor,
    enabledModels,
    historyCount,
    isSttEnabled,
    isSttRecording,
    isSttTranscribing,
    memoryEnabled,
    memoryTurnEnabled,
    mentionItems,
    modelParams,
    mode,
    pickFiles,
    promptTransformEnabled,
    searchEnabled,
    setHistoryCount,
    setChatMode,
    setDefaultAccount,
    setExpanded,
    setMemoryTurnEnabled,
    setModelParams,
    setSearchEnabled,
    skills,
    toggleRecording,
    toggleSkillEnabled,
  }), [
    agentId,
    clearAttachments,
    clearCurrentTopic,
    createTopic,
    currentSessionKey,
    currentTopicId,
    currentTopicTokens,
    defaultAccountId,
    editor,
    enabledModels,
    historyCount,
    isSttEnabled,
    isSttRecording,
    isSttTranscribing,
    memoryEnabled,
    memoryTurnEnabled,
    mentionItems,
    modelParams,
    mode,
    pickFiles,
    promptTransformEnabled,
    searchEnabled,
    setHistoryCount,
    setChatMode,
    setDefaultAccount,
    setExpanded,
    setMemoryTurnEnabled,
    setModelParams,
    setSearchEnabled,
    skills,
    toggleRecording,
    toggleSkillEnabled,
  ]);

  const handleAction = useCallback(async (action: ChatInputActionKey) => {
    switch (action) {
      case 'agentMode':
        handleAgentModeAction(actionContext);
        return;
      case 'clear':
        handleClearAction(actionContext);
        return;
      case 'fileUpload':
        await handleFileUploadAction(actionContext);
        return;
      case 'history':
        handleHistoryAction(actionContext);
        return;
      case 'mainToken':
        handleMainTokenAction(actionContext);
        return;
      case 'memory':
        handleMemoryAction(actionContext);
        return;
      case 'mention':
        handleMentionAction(actionContext);
        return;
      case 'model':
        await handleModelAction(actionContext);
        return;
      case 'params':
        handleParamsAction(actionContext);
        return;
      case 'portalToken':
        handlePortalTokenAction(actionContext);
        return;
      case 'promptTransform':
        await handlePromptTransformAction(actionContext);
        return;
      case 'saveTopic':
        handleSaveTopicAction(actionContext);
        return;
      case 'search':
        handleSearchAction(actionContext);
        return;
      case 'stt':
        await handleSttAction(actionContext);
        return;
      case 'tools':
        await handleToolsAction(actionContext);
        return;
      case 'typo':
        handleTypoAction(actionContext);
        return;
      default:
        return;
    }
  }, [actionContext]);

  const items = useMemo<ChatInputActionItem[]>(() => {
    const result: ChatInputActionItem[] = orderedActions.flatMap((action) => {
      const config = ACTION_META_MAP[action];
      if (!config) return [];
      const { icon, title } = config;
      const enabled = IMPLEMENTED_ACTIONS.has(action);
      const active =
        action === 'agentMode'
          ? mode === 'agent'
          : action === 'history'
            ? historyCount > 0
            : action === 'params'
              ? modelParams.label !== 'Balanced'
              : action === 'memory'
                ? memoryTurnEnabled
                : action === 'search'
                  ? searchEnabled
                  : action === 'stt'
                    ? isSttRecording || isSttTranscribing
                    : action === 'tools'
                      ? enabledSkillIds.length > 0
                      : false;
      const isDisabled =
        action === 'promptTransform'
          ? !promptTransformEnabled
          : action === 'memory'
            ? !memoryEnabled
            : action === 'model'
              ? enabledModels.length === 0
              : action === 'params'
                ? !isDevMode
                : action === 'search'
                  ? !supportsSearch
                  : action === 'stt'
                    ? !isSttEnabled || isSttTranscribing
                    : !enabled;

      const iconNode = (
        <ActionIcon
          active={active}
          disabled={isDisabled}
          icon={icon}
          key={action}
          loading={action === 'stt' ? isSttTranscribing : false}
          onClick={enabled && action !== 'tools' ? () => void handleAction(action) : undefined}
          title={isDisabled ? `${title} (coming soon)` : title}
        />
      );

      const item: ChatInputActionItem = {
        alwaysDisplay: action === 'mainToken',
        children: iconNode,
        key: action,
        wrapper:
          action === 'tools' && enabled
            ? (dom) => (
                <Dropdown
                  menu={toolsMenu}
                  onOpenChange={(open) => {
                    if (!open || skills.length > 0 || skillsLoading) return;
                    void fetchSkills();
                  }}
                  placement="topLeft"
                  trigger={['click']}
                >
                  <span>{dom}</span>
                </Dropdown>
              )
            : undefined,
      };
      return [item];
    });

    const tagItems: ChatInputActionItem[] = [
      { alwaysDisplay: true as const, children: <RuntimeConfig />, key: 'runtime-config' },
      ...(searchEnabled ? [{ alwaysDisplay: true as const, children: <Tag>Search On</Tag>, key: 'tag-search' }] : []),
      ...(memoryTurnEnabled ? [{ alwaysDisplay: true as const, children: <Tag>Memory On</Tag>, key: 'tag-memory' }] : []),
      ...(historyCount > 0 ? [{ alwaysDisplay: true as const, children: <Tag>{`History ${historyCount}`}</Tag>, key: 'tag-history' }] : []),
      ...(isDevMode ? [{ alwaysDisplay: true as const, children: <Tag>{modelParams.label}</Tag>, key: 'tag-params' }] : []),
      ...attachments.map((attachment) => ({
        alwaysDisplay: true as const,
        children: (
          <Tag
            closable
            key={attachment.id}
            onClose={(event: React.MouseEvent) => {
              event?.preventDefault?.();
              removeAttachment(attachment.id);
            }}
          >
            {attachment.fileName}
          </Tag>
        ),
        key: `attachment-${attachment.id}`,
      })),
      ...(attachments.length > 0
        ? [{ alwaysDisplay: true as const, children: <ActionIcon icon={X} onClick={clearAttachments} title="Clear files" />, key: 'clear-attachments' }]
        : []),
      { alwaysDisplay: true as const, children: <TokenDisplay />, key: 'token-display' },
    ];

    return [...result, ...tagItems];
  }, [
    attachments,
    clearAttachments,
    enabledModels.length,
    enabledSkillIds.length,
    fetchSkills,
    handleAction,
    historyCount,
    isDevMode,
    isSttEnabled,
    isSttRecording,
    isSttTranscribing,
    memoryEnabled,
    memoryTurnEnabled,
    modelParams.label,
    mode,
    orderedActions,
    promptTransformEnabled,
    removeAttachment,
    searchEnabled,
    skills.length,
    skillsLoading,
    supportsSearch,
    toolsMenu,
  ]);

  return (
    <ChatInputActions
      collapseOffset={80}
      defaultGroupCollapse
      items={items}
    />
  );
}
