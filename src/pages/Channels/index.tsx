import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, Trash2, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
import { ChannelConfigModal } from '@/features/channels/components/ChannelConfigModal';
import {
  CHANNEL_ICONS,
  CHANNEL_NAMES,
  CHANNEL_META,
  getPrimaryChannels,
  type ChannelType,
} from '@/types/channel';
import { usesPluginManagedQrAccounts } from '@/lib/channel-alias';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import telegramIcon from '@/assets/channels/telegram.svg';
import discordIcon from '@/assets/channels/discord.svg';
import whatsappIcon from '@/assets/channels/whatsapp.svg';
import wechatIcon from '@/assets/channels/wechat.svg';
import dingtalkIcon from '@/assets/channels/dingtalk.svg';
import feishuIcon from '@/assets/channels/feishu.svg';
import wecomIcon from '@/assets/channels/wecom.svg';
import qqIcon from '@/assets/channels/qq.svg';
import { useChannelsStyles } from './styles';

interface ChannelAccountItem {
  accountId: string;
  name: string;
  configured: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError?: string;
  isDefault: boolean;
  agentId?: string;
}

interface ChannelGroupItem {
  channelType: string;
  defaultAccountId: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  accounts: ChannelAccountItem[];
}

interface AgentItem {
  id: string;
  name: string;
}

interface DeleteTarget {
  channelType: string;
  accountId?: string;
}

function removeDeletedTarget(groups: ChannelGroupItem[], target: DeleteTarget): ChannelGroupItem[] {
  if (target.accountId) {
    return groups
      .map((group) => {
        if (group.channelType !== target.channelType) return group;
        return {
          ...group,
          accounts: group.accounts.filter((account) => account.accountId !== target.accountId),
        };
      })
      .filter((group) => group.accounts.length > 0);
  }

  return groups.filter((group) => group.channelType !== target.channelType);
}

export function Channels() {
  const { t } = useTranslation('channels');
  const { styles } = useChannelsStyles();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const lastGatewayStateRef = useRef(gatewayStatus.state);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [allowExistingConfigInModal, setAllowExistingConfigInModal] = useState(true);
  const [allowEditAccountIdInModal, setAllowEditAccountIdInModal] = useState(false);
  const [existingAccountIdsForModal, setExistingAccountIdsForModal] = useState<string[]>([]);
  const [initialConfigValuesForModal, setInitialConfigValuesForModal] = useState<Record<string, string> | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const displayedChannelTypes = getPrimaryChannels();

  const fetchPageData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelsRes, agentsRes] = await Promise.all([
        hostApiFetch<{ success: boolean; channels?: ChannelGroupItem[]; error?: string }>('/api/channels/accounts'),
        hostApiFetch<{ success: boolean; agents?: AgentItem[]; error?: string }>('/api/agents'),
      ]);

      if (!channelsRes.success) {
        throw new Error(channelsRes.error || 'Failed to load channels');
      }

      if (!agentsRes.success) {
        throw new Error(agentsRes.error || 'Failed to load agents');
      }

      setChannelGroups(channelsRes.channels || []);
      setAgents(agentsRes.agents || []);
    } catch (fetchError) {
      setError(String(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPageData();
  }, [fetchPageData]);

  useEffect(() => {
    const unsubscribe = subscribeHostEvent('gateway:channel-status', () => {
      void fetchPageData();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchPageData]);

  useEffect(() => {
    const previousGatewayState = lastGatewayStateRef.current;
    lastGatewayStateRef.current = gatewayStatus.state;

    if (previousGatewayState !== 'running' && gatewayStatus.state === 'running') {
      void fetchPageData();
    }
  }, [fetchPageData, gatewayStatus.state]);

  const configuredTypes = useMemo(
    () => channelGroups.map((group) => group.channelType),
    [channelGroups],
  );

  const groupedByType = useMemo(() => {
    return Object.fromEntries(channelGroups.map((group) => [group.channelType, group]));
  }, [channelGroups]);

  const configuredGroups = useMemo(() => {
    const known = displayedChannelTypes
      .map((type) => groupedByType[type])
      .filter((group): group is ChannelGroupItem => Boolean(group));
    const unknown = channelGroups.filter((group) => !displayedChannelTypes.includes(group.channelType as ChannelType));
    return [...known, ...unknown];
  }, [channelGroups, displayedChannelTypes, groupedByType]);

  const unsupportedGroups = displayedChannelTypes.filter((type) => !configuredTypes.includes(type));

  const handleRefresh = () => {
    void fetchPageData();
  };

  const handleBindAgent = async (channelType: string, accountId: string, agentId: string) => {
    try {
      if (!agentId) {
        await hostApiFetch<{ success: boolean; error?: string }>('/api/channels/binding', {
          method: 'DELETE',
          body: JSON.stringify({ channelType, accountId }),
        });
      } else {
        await hostApiFetch<{ success: boolean; error?: string }>('/api/channels/binding', {
          method: 'PUT',
          body: JSON.stringify({ channelType, accountId, agentId }),
        });
      }
      await fetchPageData();
      toast.success(t('toast.bindingUpdated'));
    } catch (bindError) {
      toast.error(t('toast.configFailed', { error: String(bindError) }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const suffix = deleteTarget.accountId
        ? `?accountId=${encodeURIComponent(deleteTarget.accountId)}`
        : '';
      await hostApiFetch(`/api/channels/config/${encodeURIComponent(deleteTarget.channelType)}${suffix}`, {
        method: 'DELETE',
      });
      setChannelGroups((prev) => removeDeletedTarget(prev, deleteTarget));
      toast.success(deleteTarget.accountId ? t('toast.accountDeleted') : t('toast.channelDeleted'));
      // Channel reload is debounced in main process; pull again shortly to
      // converge with runtime state without flashing deleted rows back in.
      window.setTimeout(() => {
        void fetchPageData();
      }, 1200);
    } catch (deleteError) {
      toast.error(t('toast.configFailed', { error: String(deleteError) }));
    } finally {
      setDeleteTarget(null);
    }
  };

  const createNewAccountId = (channelType: string, existingAccounts: string[]): string => {
    // Generate a collision-safe default account id for user editing.
    let nextAccountId = `${channelType}-${crypto.randomUUID().slice(0, 8)}`;
    while (existingAccounts.includes(nextAccountId)) {
      nextAccountId = `${channelType}-${crypto.randomUUID().slice(0, 8)}`;
    }
    return nextAccountId;
  };

  if (loading) {
    return (
      <div className={styles.pageRootLoading}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      <div className={styles.inner}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.pageTitle}>
              {t('title')}
            </h1>
            <p className={styles.pageSubtitle}>
              {t('subtitle')}
            </p>
          </div>

          <div className={styles.headerActions}>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={gatewayStatus.state !== 'running'}
              className={styles.refreshBtn}
            >
              <RefreshCw style={{ width: 14, height: 14, marginRight: 8 }} />
              {t('refresh')}
            </Button>
          </div>
        </div>

        <div className={styles.scrollArea}>
          {gatewayStatus.state !== 'running' && (
            <div className={styles.warningBanner}>
              <AlertCircle className={styles.warningIcon} />
              <span className={styles.warningText}>
                {t('gatewayWarning')}
              </span>
            </div>
          )}

          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle className={styles.errorIcon} />
              <span className={styles.errorText}>
                {error}
              </span>
            </div>
          )}

          {configuredGroups.length > 0 && (
            <div className={styles.configuredSection}>
              <h2 className={styles.sectionTitle}>
                {t('configured')}
              </h2>
              <div className={styles.groupList}>
                {configuredGroups.map((group) => (
                  <div key={group.channelType} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.groupHeaderLeft}>
                        <div className={styles.channelLogoWrap}>
                          <ChannelLogo type={group.channelType as ChannelType} />
                        </div>
                        <div className={styles.channelNameWrap}>
                          <h3 className={styles.channelName}>
                            {CHANNEL_NAMES[group.channelType as ChannelType] || group.channelType}
                          </h3>
                          <p className={styles.channelType}>{group.channelType}</p>
                        </div>
                        <div
                          className={
                            group.status === 'connected'
                              ? styles.statusDotConnected
                              : group.status === 'connecting'
                                ? styles.statusDotConnecting
                                : group.status === 'error'
                                  ? styles.statusDotError
                                  : styles.statusDotDefault
                          }
                        />
                      </div>

                      <div className={styles.groupHeaderRight}>
                        <Button
                          size="sm"
                          variant="outline"
                          className={styles.addAccountBtn}
                          onClick={() => {
                            const shouldUseGeneratedAccountId = !usesPluginManagedQrAccounts(group.channelType);
                            const nextAccountId = shouldUseGeneratedAccountId
                              ? createNewAccountId(
                                group.channelType,
                                group.accounts.map((item) => item.accountId),
                              )
                              : undefined;
                            setSelectedChannelType(group.channelType as ChannelType);
                            setSelectedAccountId(nextAccountId);
                            setAllowExistingConfigInModal(false);
                            setAllowEditAccountIdInModal(shouldUseGeneratedAccountId);
                            setExistingAccountIdsForModal(group.accounts.map((item) => item.accountId));
                            setInitialConfigValuesForModal(undefined);
                            setShowConfigModal(true);
                          }}
                        >
                          <Plus style={{ width: 14, height: 14, marginRight: 4 }} />
                          {t('account.add')}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={styles.deleteGroupBtn}
                          onClick={() => setDeleteTarget({ channelType: group.channelType })}
                          title={t('account.deleteChannel')}
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </Button>
                      </div>
                    </div>

                    <div className={styles.accountList}>
                      {group.accounts.map((account) => {
                        const displayName =
                          account.accountId === 'default' && account.name === account.accountId
                            ? t('account.mainAccount')
                            : account.name;
                        return (
                          <div key={`${group.channelType}-${account.accountId}`} className={styles.accountRow}>
                            <div className={styles.accountRowInner}>
                              <div className={styles.accountLeft}>
                                <div className={styles.accountNameRow}>
                                  <p className={styles.accountName}>{displayName}</p>
                                </div>
                                {account.lastError && (
                                  <div className={styles.accountError}>{account.lastError}</div>
                                )}
                              </div>

                              <div className={styles.accountRight}>
                                <span className={styles.bindLabel}>{t('account.bindAgentLabel')}</span>
                                <select
                                  className={styles.agentSelect}
                                  value={account.agentId || ''}
                                  onChange={(event) => {
                                    void handleBindAgent(group.channelType, account.accountId, event.target.value);
                                  }}
                                >
                                  <option value="">{t('account.unassigned')}</option>
                                  {agents.map((agent) => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={styles.editAccountBtn}
                                  onClick={() => {
                                    void (async () => {
                                      try {
                                        const accountParam = `?accountId=${encodeURIComponent(account.accountId)}`;
                                        const result = await hostApiFetch<{ success: boolean; values?: Record<string, string> }>(
                                          `/api/channels/config/${encodeURIComponent(group.channelType)}${accountParam}`
                                        );
                                        setInitialConfigValuesForModal(result.success ? (result.values || {}) : undefined);
                                      } catch {
                                        // Fall back to modal-side loading when prefetch fails.
                                        setInitialConfigValuesForModal(undefined);
                                      }
                                      setSelectedChannelType(group.channelType as ChannelType);
                                      setSelectedAccountId(account.accountId);
                                      setAllowExistingConfigInModal(true);
                                      setAllowEditAccountIdInModal(false);
                                      setExistingAccountIdsForModal([]);
                                      setShowConfigModal(true);
                                    })();
                                  }}
                                >
                                  {t('account.edit')}
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={styles.deleteAccountBtn}
                                  onClick={() => setDeleteTarget({ channelType: group.channelType, accountId: account.accountId })}
                                  title={t('account.delete')}
                                >
                                  <Trash2 style={{ width: 16, height: 16 }} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.supportedSection}>
            <h2 className={styles.sectionTitle}>
              {t('supportedChannels')}
            </h2>

            <div className={styles.channelGrid}>
              {unsupportedGroups.map((type) => {
                const meta = CHANNEL_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedChannelType(type);
                      setSelectedAccountId(undefined);
                      setAllowExistingConfigInModal(true);
                      setAllowEditAccountIdInModal(false);
                      setExistingAccountIdsForModal([]);
                      setInitialConfigValuesForModal(undefined);
                      setShowConfigModal(true);
                    }}
                    className={styles.channelGridButton}
                  >
                    <div className={styles.channelGridLogoWrap}>
                      <ChannelLogo type={type} />
                    </div>
                    <div className={styles.channelGridInfo}>
                      <div className={styles.channelGridNameRow}>
                        <h3 className={styles.channelGridName}>{meta.name}</h3>
                        {meta.isPlugin && (
                          <Badge variant="secondary" className={styles.pluginBadge}>
                            {t('pluginBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className={styles.channelGridDesc}>
                        {t(meta.description.replace('channels:', ''))}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showConfigModal && (
        <ChannelConfigModal
          initialSelectedType={selectedChannelType}
          accountId={selectedAccountId}
          configuredTypes={configuredTypes}
          allowExistingConfig={allowExistingConfigInModal}
          allowEditAccountId={allowEditAccountIdInModal}
          existingAccountIds={existingAccountIdsForModal}
          initialConfigValues={initialConfigValuesForModal}
          showChannelName={false}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedChannelType(null);
            setSelectedAccountId(undefined);
            setAllowExistingConfigInModal(true);
            setAllowEditAccountIdInModal(false);
            setExistingAccountIdsForModal([]);
            setInitialConfigValuesForModal(undefined);
          }}
          onChannelSaved={async () => {
            await fetchPageData();
            setShowConfigModal(false);
            setSelectedChannelType(null);
            setSelectedAccountId(undefined);
            setAllowExistingConfigInModal(true);
            setAllowEditAccountIdInModal(false);
            setExistingAccountIdsForModal([]);
            setInitialConfigValuesForModal(undefined);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('common.confirm', 'Confirm')}
        message={deleteTarget?.accountId ? t('account.deleteConfirm') : t('deleteConfirm')}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="destructive"
        onConfirm={() => {
          void handleDelete();
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ChannelLogo({ type }: { type: ChannelType }) {
  const { styles } = useChannelsStyles();
  switch (type) {
    case 'telegram':
      return <img src={telegramIcon} alt="Telegram" className={styles.channelLogoImg} />;
    case 'discord':
      return <img src={discordIcon} alt="Discord" className={styles.channelLogoImg} />;
    case 'whatsapp':
      return <img src={whatsappIcon} alt="WhatsApp" className={styles.channelLogoImg} />;
    case 'wechat':
      return <img src={wechatIcon} alt="WeChat" className={styles.channelLogoImg} />;
    case 'dingtalk':
      return <img src={dingtalkIcon} alt="DingTalk" className={styles.channelLogoImg} />;
    case 'feishu':
      return <img src={feishuIcon} alt="Feishu" className={styles.channelLogoImg} />;
    case 'wecom':
      return <img src={wecomIcon} alt="WeCom" className={styles.channelLogoImg} />;
    case 'qqbot':
      return <img src={qqIcon} alt="QQ" className={styles.channelLogoImg} />;
    default:
      return <span style={{ fontSize: 14 }}>{CHANNEL_ICONS[type] || '💬'}</span>;
  }
}

export default Channels;
