import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bot, Check, Plus, RefreshCw, Settings2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayStore } from '@/stores/gateway';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';
import { CHANNEL_ICONS, CHANNEL_NAMES, type ChannelType } from '@/types/channel';
import type { AgentSummary } from '@/types/agent';
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
import { useAgentsStyles } from './styles';

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

export function Agents() {
  const { t } = useTranslation('agents');
  const { styles } = useAgentsStyles();
  const gatewayStatus = useGatewayStore((state) => state.status);
  const lastGatewayStateRef = useRef(gatewayStatus.state);
  const {
    agents,
    loading,
    error,
    fetchAgents,
    createAgent,
    deleteAgent,
  } = useAgentsStore();
  const [channelGroups, setChannelGroups] = useState<ChannelGroupItem[]>([]);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);

  const fetchChannelAccounts = useCallback(async () => {
    try {
      const response = await hostApiFetch<{ success: boolean; channels?: ChannelGroupItem[] }>('/api/channels/accounts');
      setChannelGroups(response.channels || []);
    } catch {
      setChannelGroups([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([fetchAgents(), fetchChannelAccounts()]);
  }, [fetchAgents, fetchChannelAccounts]);

  useEffect(() => {
    const unsubscribe = subscribeHostEvent('gateway:channel-status', () => {
      void fetchChannelAccounts();
    });
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchChannelAccounts]);

  useEffect(() => {
    const previousGatewayState = lastGatewayStateRef.current;
    lastGatewayStateRef.current = gatewayStatus.state;

    if (previousGatewayState !== 'running' && gatewayStatus.state === 'running') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchChannelAccounts();
    }
  }, [fetchChannelAccounts, gatewayStatus.state]);

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? null,
    [activeAgentId, agents],
  );
  const handleRefresh = () => {
    void Promise.all([fetchAgents(), fetchChannelAccounts()]);
  };

  if (loading) {
    return (
      <div className={styles.pageLoadingRoot}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      <div className={styles.contentWrap}>
        <div className={styles.pageHeader}>
          <div>
            <h1
              className={styles.pageTitle}
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
            >
              {t('title')}
            </h1>
            <p className={styles.pageSubtitle}>{t('subtitle')}</p>
          </div>
          <div className={styles.headerActions}>
            <Button
              onClick={handleRefresh}
              style={{
                height: 36,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 9999,
                paddingLeft: 16,
                paddingRight: 16,
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'transparent',
                boxShadow: 'none',
              }}
            >
              <RefreshCw style={{ height: 14, width: 14, marginRight: 8 }} />
              {t('refresh')}
            </Button>
            <Button
              type="primary"
              onClick={() => setShowAddDialog(true)}
              style={{
                height: 36,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 9999,
                paddingLeft: 16,
                paddingRight: 16,
                boxShadow: 'none',
              }}
            >
              <Plus style={{ height: 14, width: 14, marginRight: 8 }} />
              {t('addAgent')}
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

          <div className={styles.agentList}>
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                channelGroups={channelGroups}
                onOpenSettings={() => setActiveAgentId(agent.id)}
                onDelete={() => setAgentToDelete(agent)}
              />
            ))}
          </div>
        </div>
      </div>

      {showAddDialog && (
        <AddAgentDialog
          onClose={() => setShowAddDialog(false)}
          onCreate={async (name) => {
            await createAgent(name);
            setShowAddDialog(false);
            toast.success(t('toast.agentCreated'));
          }}
        />
      )}

      {activeAgent && (
        <AgentSettingsModal
          agent={activeAgent}
          channelGroups={channelGroups}
          onClose={() => setActiveAgentId(null)}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={async () => {
          if (!agentToDelete) return;
          try {
            await deleteAgent(agentToDelete.id);
            const deletedId = agentToDelete.id;
            setAgentToDelete(null);
            if (activeAgentId === deletedId) {
              setActiveAgentId(null);
            }
            toast.success(t('toast.agentDeleted'));
          } catch (error) {
            toast.error(t('toast.agentDeleteFailed', { error: String(error) }));
          }
        }}
        onCancel={() => setAgentToDelete(null)}
      />
    </div>
  );
}

function AgentCard({
  agent,
  channelGroups,
  onOpenSettings,
  onDelete,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onOpenSettings: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('agents');
  const { styles, cx } = useAgentsStyles();
  const boundChannelAccounts = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => {
        const channelName = CHANNEL_NAMES[group.channelType as ChannelType] || group.channelType;
        const accountLabel =
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId;
        return `${channelName} · ${accountLabel}`;
      }),
  );
  const channelsText = boundChannelAccounts.length > 0
    ? boundChannelAccounts.join(', ')
    : t('none');

  return (
    <div className={cx('mimi-agent-card', styles.agentCard, agent.isDefault && styles.agentCardDefault)}>
      <div className={styles.agentAvatar}>
        <Bot style={{ height: 22, width: 22 }} />
      </div>
      <div className={styles.agentBody}>
        <div className={styles.agentNameRow}>
          <div className={styles.agentNameGroup}>
            <h2 className={styles.agentName}>{agent.name}</h2>
            {agent.isDefault && (
              <Badge
                variant="secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'monospace',
                  fontSize: 10,
                  fontWeight: 500,
                  paddingLeft: 8,
                  paddingRight: 8,
                  paddingTop: 2,
                  paddingBottom: 2,
                  borderRadius: 9999,
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  boxShadow: 'none',
                }}
              >
                <Check style={{ height: 12, width: 12 }} />
                {t('defaultBadge')}
              </Badge>
            )}
          </div>
          <div className={styles.agentActions}>
            {!agent.isDefault && (
              <Button
                type="text"
                style={{ height: 28, width: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                className={styles.agentActionBtnHoverable}
                onClick={onDelete}
                title={t('deleteAgent')}
              >
                <Trash2 style={{ height: 16, width: 16 }} />
              </Button>
            )}
            <Button
              type="text"
              style={{ height: 28, width: 28, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              className={agent.isDefault ? undefined : styles.agentActionBtnHoverable}
              onClick={onOpenSettings}
              title={t('settings')}
            >
              <Settings2 style={{ height: 16, width: 16 }} />
            </Button>
          </div>
        </div>
        <p className={styles.agentMeta}>
          {t('modelLine', {
            model: agent.modelDisplay,
            suffix: agent.inheritedModel ? ` (${t('inherited')})` : '',
          })}
        </p>
        <p className={styles.agentMeta}>
          {t('channelsLine', { channels: channelsText })}
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  fontFamily: 'monospace',
  fontSize: 13,
  background: '#eeece3',
};

const labelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
};

function ChannelLogo({ type }: { type: ChannelType }) {
  const { styles } = useAgentsStyles();
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
      return <span style={{ fontSize: 14, lineHeight: 1 }}>{CHANNEL_ICONS[type] || '💬'}</span>;
  }
}

function AddAgentDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const { styles } = useAgentsStyles();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
    } catch (error) {
      toast.error(t('toast.agentCreateFailed', { error: String(error) }));
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className={styles.modalBackdrop}>
      <Card className={styles.addDialogCard}>
        <CardHeader style={{ paddingBottom: 8 }}>
          <CardTitle style={{ fontSize: 14, fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif', fontWeight: 'normal', letterSpacing: '-0.025em' }}>
            {t('createDialog.title')}
          </CardTitle>
          <CardDescription style={{ fontSize: 14, marginTop: 4 }}>
            {t('createDialog.description')}
          </CardDescription>
        </CardHeader>
        <CardContent style={{ padding: 24, paddingTop: 16 }}>
          <div className={styles.spaceY25} style={{ marginBottom: 24 }}>
            <Label htmlFor="agent-name" style={labelStyle}>{t('createDialog.nameLabel')}</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('createDialog.namePlaceholder')}
              style={inputStyle}
            />
          </div>
          <div className={styles.dialogFormRow}>
            <Button
              onClick={onClose}
              style={{
                height: 36,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 9999,
                paddingLeft: 16,
                paddingRight: 16,
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'transparent',
                boxShadow: 'none',
              }}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="primary"
              onClick={() => void handleSubmit()}
              disabled={saving || !name.trim()}
              style={{
                height: 36,
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 9999,
                paddingLeft: 16,
                paddingRight: 16,
                boxShadow: 'none',
              }}
            >
              {saving ? (
                <>
                  <RefreshCw style={{ height: 16, width: 16, marginRight: 8 }} className="animate-spin" />
                  {t('creating')}
                </>
              ) : (
                t('common:actions.save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentSettingsModal({
  agent,
  channelGroups,
  onClose,
}: {
  agent: AgentSummary;
  channelGroups: ChannelGroupItem[];
  onClose: () => void;
}) {
  const { t } = useTranslation('agents');
  const { styles } = useAgentsStyles();
  const { updateAgent } = useAgentsStore();
  const [name, setName] = useState(agent.name);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setName(agent.name);
  }, [agent.name]);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === agent.name) return;
    setSavingName(true);
    try {
      await updateAgent(agent.id, name.trim());
      toast.success(t('toast.agentUpdated'));
    } catch (error) {
      toast.error(t('toast.agentUpdateFailed', { error: String(error) }));
    } finally {
      setSavingName(false);
    }
  };

  const assignedChannels = channelGroups.flatMap((group) =>
    group.accounts
      .filter((account) => account.agentId === agent.id)
      .map((account) => ({
        channelType: group.channelType as ChannelType,
        accountId: account.accountId,
        name:
          account.accountId === 'default'
            ? t('settingsDialog.mainAccount')
            : account.name || account.accountId,
        error: account.lastError,
      })),
  );

  return (
    <div className={styles.modalBackdrop}>
      <Card className={styles.settingsModalCard}>
        <CardHeader className={styles.settingsCardHeader} style={{ padding: '24px 24px 8px' }}>
          <div>
            <CardTitle style={{ fontSize: 14, fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif', fontWeight: 'normal', letterSpacing: '-0.025em' }}>
              {t('settingsDialog.title', { name: agent.name })}
            </CardTitle>
            <CardDescription style={{ fontSize: 14, marginTop: 4 }}>
              {t('settingsDialog.description')}
            </CardDescription>
          </div>
          <Button
            type="text"
            onClick={onClose}
            style={{
              borderRadius: 9999,
              height: 32,
              width: 32,
              marginRight: -8,
              marginTop: -8,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ height: 16, width: 16 }} />
          </Button>
        </CardHeader>
        <CardContent className={styles.settingsCardContent}>
          <div className={styles.spaceY4}>
            <div className={styles.spaceY25}>
              <Label htmlFor="agent-settings-name" style={labelStyle}>{t('settingsDialog.nameLabel')}</Label>
              <div className={styles.nameInputRow}>
                <Input
                  id="agent-settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  readOnly={agent.isDefault}
                  style={inputStyle}
                />
                {!agent.isDefault && (
                  <Button
                    onClick={() => void handleSaveName()}
                    disabled={savingName || !name.trim() || name.trim() === agent.name}
                    style={{
                      height: 44,
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 12,
                      paddingLeft: 16,
                      paddingRight: 16,
                      border: '1px solid rgba(0,0,0,0.1)',
                      background: '#eeece3',
                      boxShadow: 'none',
                    }}
                  >
                    {savingName ? (
                      <RefreshCw style={{ height: 16, width: 16 }} className="animate-spin" />
                    ) : (
                      t('common:actions.save')
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoCell}>
                <p className={styles.infoCellLabel}>
                  {t('settingsDialog.agentIdLabel')}
                </p>
                <p className={styles.infoCellValue}>{agent.id}</p>
              </div>
              <div className={styles.infoCell}>
                <p className={styles.infoCellLabel}>
                  {t('settingsDialog.modelLabel')}
                </p>
                <p className={styles.infoCellValueNormal}>
                  {agent.modelDisplay}
                  {agent.inheritedModel ? ` (${t('inherited')})` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className={styles.channelsSection}>
            <div className={styles.channelsSectionHeader}>
              <div>
                <h3 className={styles.channelsSectionTitle}>
                  {t('settingsDialog.channelsTitle')}
                </h3>
                <p className={styles.channelsSectionDesc}>{t('settingsDialog.channelsDescription')}</p>
              </div>
            </div>

            {assignedChannels.length === 0 && agent.channelTypes.length === 0 ? (
              <div className={styles.noChannelsBox}>
                {t('settingsDialog.noChannels')}
              </div>
            ) : (
              <div className={styles.channelList}>
                {assignedChannels.map((channel) => (
                  <div key={`${channel.channelType}-${channel.accountId}`} className={styles.channelRow}>
                    <div className={styles.channelRowLeft}>
                      <div className={styles.channelIcon}>
                        <ChannelLogo type={channel.channelType} />
                      </div>
                      <div className={styles.channelInfo}>
                        <p className={styles.channelName}>{channel.name}</p>
                        <p className={styles.channelMeta}>
                          {CHANNEL_NAMES[channel.channelType]} · {channel.accountId === 'default' ? t('settingsDialog.mainAccount') : channel.accountId}
                        </p>
                        {channel.error && (
                          <p className={styles.channelError}>{channel.error}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }} />
                  </div>
                ))}
                {assignedChannels.length === 0 && agent.channelTypes.length > 0 && (
                  <div className={styles.noChannelsBox}>
                    {t('settingsDialog.channelsManagedInChannels')}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Agents;
