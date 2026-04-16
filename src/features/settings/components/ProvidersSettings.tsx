/**
 * Providers Settings Component
 * Manage AI provider configurations and API keys
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  Key,
  ExternalLink,
  Copy,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useProviderStore,
  type ProviderAccount,
  type ProviderConfig,
  type ProviderVendorInfo,
} from '@/stores/providers';
import {
  PROVIDER_TYPE_INFO,
  getProviderDocsUrl,
  type ProviderType,
  getProviderIconUrl,
  resolveProviderApiKeyForSave,
  resolveProviderModelForSave,
  shouldShowProviderModelId,
  shouldInvertInDark,
} from '@/lib/providers';
import {
  buildProviderAccountId,
  buildProviderListItems,
  hasConfiguredCredentials,
  type ProviderListItem,
} from '@/lib/provider-accounts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useProviderStyles } from './styles';
import { useTranslation } from 'react-i18next';
import { invokeIpc } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settings';
import { hostApiFetch } from '@/lib/host-api';
import { subscribeHostEvent } from '@/lib/host-events';

type ArkMode = 'apikey' | 'codeplan';

function normalizeFallbackProviderIds(ids?: string[]): string[] {
  return Array.from(new Set((ids ?? []).filter(Boolean)));
}

function getProtocolBaseUrlPlaceholder(
  apiProtocol: ProviderAccount['apiProtocol'],
): string {
  if (apiProtocol === 'anthropic-messages') {
    return 'https://api.example.com/anthropic';
  }
  return 'https://api.example.com/v1';
}

function fallbackProviderIdsEqual(a?: string[], b?: string[]): boolean {
  const left = normalizeFallbackProviderIds(a).sort();
  const right = normalizeFallbackProviderIds(b).sort();
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function normalizeFallbackModels(models?: string[]): string[] {
  return Array.from(new Set((models ?? []).map((model) => model.trim()).filter(Boolean)));
}

function fallbackModelsEqual(a?: string[], b?: string[]): boolean {
  const left = normalizeFallbackModels(a);
  const right = normalizeFallbackModels(b);
  return left.length === right.length && left.every((model, index) => model === right[index]);
}

function isArkCodePlanMode(
  vendorId: string,
  baseUrl: string | undefined,
  modelId: string | undefined,
  codePlanPresetBaseUrl?: string,
  codePlanPresetModelId?: string,
): boolean {
  if (vendorId !== 'ark' || !codePlanPresetBaseUrl || !codePlanPresetModelId) return false;
  return (baseUrl || '').trim() === codePlanPresetBaseUrl && (modelId || '').trim() === codePlanPresetModelId;
}

function getAuthModeLabel(
  authMode: ProviderAccount['authMode'],
  t: (key: string) => string
): string {
  switch (authMode) {
    case 'api_key':
      return t('aiProviders.authModes.apiKey');
    case 'oauth_device':
      return t('aiProviders.authModes.oauthDevice');
    case 'oauth_browser':
      return t('aiProviders.authModes.oauthBrowser');
    case 'local':
      return t('aiProviders.authModes.local');
    default:
      return authMode;
  }
}

export function ProvidersSettings() {
  const { t } = useTranslation('settings');
  const { styles } = useProviderStyles();
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);
  const {
    statuses,
    accounts,
    vendors,
    defaultAccountId,
    loading,
    refreshProviderSnapshot,
    createAccount,
    removeAccount,
    updateAccount,
    setDefaultAccount,
    validateAccountApiKey,
  } = useProviderStore();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const existingVendorIds = new Set(accounts.map((account) => account.vendorId));
  const displayProviders = useMemo(
    () => buildProviderListItems(accounts, statuses, vendors, defaultAccountId),
    [accounts, statuses, vendors, defaultAccountId],
  );

  // Fetch providers on mount
  useEffect(() => {
    refreshProviderSnapshot();
  }, [refreshProviderSnapshot]);

  const handleAddProvider = async (
    type: ProviderType,
    name: string,
    apiKey: string,
    options?: { baseUrl?: string; model?: string; authMode?: ProviderAccount['authMode']; apiProtocol?: ProviderAccount['apiProtocol'] }
  ) => {
    const vendor = vendorMap.get(type);
    const id = buildProviderAccountId(type, null, vendors);
    const effectiveApiKey = resolveProviderApiKeyForSave(type, apiKey);
    try {
      await createAccount({
        id,
        vendorId: type,
        label: name,
        authMode: options?.authMode || vendor?.defaultAuthMode || (type === 'ollama' ? 'local' : 'api_key'),
        baseUrl: options?.baseUrl,
        apiProtocol: options?.apiProtocol,
        model: options?.model,
        enabled: true,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, effectiveApiKey);

      // Auto-set as default if no default is currently configured
      if (!defaultAccountId) {
        await setDefaultAccount(id);
      }

      setShowAddDialog(false);
      toast.success(t('aiProviders.toast.added'));
    } catch (error) {
      toast.error(`${t('aiProviders.toast.failedAdd')}: ${error}`);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    try {
      await removeAccount(providerId);
      toast.success(t('aiProviders.toast.deleted'));
    } catch (error) {
      toast.error(`${t('aiProviders.toast.failedDelete')}: ${error}`);
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      await setDefaultAccount(providerId);
      toast.success(t('aiProviders.toast.defaultUpdated'));
    } catch (error) {
      toast.error(`${t('aiProviders.toast.failedDefault')}: ${error}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h2 className={styles.sectionTitle}>
          {t('aiProviders.title', 'AI Providers')}
        </h2>
        <Button onClick={() => setShowAddDialog(true)} style={{ borderRadius: 9999, padding: '0 20px', height: 36, boxShadow: 'none', fontWeight: 500, fontSize: 13 }}>
          <Plus style={{ height: 16, width: 16, marginRight: 8 }} />
          {t('aiProviders.add')}
        </Button>
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 style={{ height: 24, width: 24, animation: 'spin 1s linear infinite' }} />
        </div>
      ) : displayProviders.length === 0 ? (
        <div className={styles.emptyState}>
          <Key className={styles.emptyIcon} style={{ height: 48, width: 48 }} />
          <h3 className={styles.emptyTitle}>{t('aiProviders.empty.title')}</h3>
          <p style={{ fontSize: 13, textAlign: 'center', marginBottom: 24, maxWidth: 384 }}>
            {t('aiProviders.empty.desc')}
          </p>
          <Button onClick={() => setShowAddDialog(true)} style={{ borderRadius: 9999, padding: '0 24px', height: 40, background: '#0a84ff', color: 'white', border: 'none' }}>
            <Plus style={{ height: 16, width: 16, marginRight: 8 }} />
            {t('aiProviders.empty.cta')}
          </Button>
        </div>
      ) : (
        <div className={styles.providerList}>
          {displayProviders.map((item) => (
            <ProviderCard
              key={item.account.id}
              item={item}
              allProviders={displayProviders}
              isDefault={item.account.id === defaultAccountId}
              isEditing={editingProvider === item.account.id}
              onEdit={() => setEditingProvider(item.account.id)}
              onCancelEdit={() => setEditingProvider(null)}
              onDelete={() => handleDeleteProvider(item.account.id)}
              onSetDefault={() => handleSetDefault(item.account.id)}
              onSaveEdits={async (payload) => {
                const updates: Partial<ProviderAccount> = {};
                if (payload.updates) {
                  if (payload.updates.baseUrl !== undefined) updates.baseUrl = payload.updates.baseUrl;
                  if (payload.updates.apiProtocol !== undefined) updates.apiProtocol = payload.updates.apiProtocol;
                  if (payload.updates.model !== undefined) updates.model = payload.updates.model;
                  if (payload.updates.fallbackModels !== undefined) updates.fallbackModels = payload.updates.fallbackModels;
                  if (payload.updates.fallbackProviderIds !== undefined) {
                    updates.fallbackAccountIds = payload.updates.fallbackProviderIds;
                  }
                }
                await updateAccount(
                  item.account.id,
                  updates,
                  payload.newApiKey
                );
                setEditingProvider(null);
              }}
              onValidateKey={(key, options) => validateAccountApiKey(item.account.id, key, options)}
              devModeUnlocked={devModeUnlocked}
            />
          ))}
        </div>
      )}

      {/* Add Provider Dialog */}
      {showAddDialog && (
        <AddProviderDialog
          existingVendorIds={existingVendorIds}
          vendors={vendors}
          onClose={() => setShowAddDialog(false)}
          onAdd={handleAddProvider}
          onValidateKey={(type, key, options) => validateAccountApiKey(type, key, options)}
          devModeUnlocked={devModeUnlocked}
        />
      )}
    </div>
  );
}

interface ProviderCardProps {
  item: ProviderListItem;
  allProviders: ProviderListItem[];
  isDefault: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onSaveEdits: (payload: { newApiKey?: string; updates?: Partial<ProviderConfig> }) => Promise<void>;
  onValidateKey: (
    key: string,
    options?: { baseUrl?: string; apiProtocol?: ProviderAccount['apiProtocol'] }
  ) => Promise<{ valid: boolean; error?: string }>;
  devModeUnlocked: boolean;
}



function ProviderCard({
  item,
  allProviders,
  isDefault,
  isEditing,
  onEdit,
  onCancelEdit,
  onDelete,
  onSetDefault,
  onSaveEdits,
  onValidateKey,
  devModeUnlocked,
}: ProviderCardProps) {
  const { t, i18n } = useTranslation('settings');
  const { styles } = useProviderStyles();
  const { account, vendor, status } = item;
  const [newKey, setNewKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(account.baseUrl || '');
  const [apiProtocol, setApiProtocol] = useState<ProviderAccount['apiProtocol']>(account.apiProtocol || 'openai-completions');
  const [modelId, setModelId] = useState(account.model || '');
  const [fallbackModelsText, setFallbackModelsText] = useState(
    normalizeFallbackModels(account.fallbackModels).join('\n')
  );
  const [fallbackProviderIds, setFallbackProviderIds] = useState<string[]>(
    normalizeFallbackProviderIds(account.fallbackAccountIds)
  );
  const [showKey, setShowKey] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [arkMode, setArkMode] = useState<ArkMode>('apikey');

  const typeInfo = PROVIDER_TYPE_INFO.find((t) => t.id === account.vendorId);
  const providerDocsUrl = getProviderDocsUrl(typeInfo, i18n.language);
  const showModelIdField = shouldShowProviderModelId(typeInfo, devModeUnlocked);
  const codePlanPreset = typeInfo?.codePlanPresetBaseUrl && typeInfo?.codePlanPresetModelId
    ? {
      baseUrl: typeInfo.codePlanPresetBaseUrl,
      modelId: typeInfo.codePlanPresetModelId,
    }
    : null;
  const effectiveDocsUrl = account.vendorId === 'ark' && arkMode === 'codeplan'
    ? (typeInfo?.codePlanDocsUrl || providerDocsUrl)
    : providerDocsUrl;
  const canEditModelConfig = Boolean(typeInfo?.showBaseUrl || showModelIdField);

  useEffect(() => {
    if (isEditing) {
      setNewKey('');
      setShowKey(false);
      setBaseUrl(account.baseUrl || '');
      setApiProtocol(account.apiProtocol || 'openai-completions');
      setModelId(account.model || '');
      setFallbackModelsText(normalizeFallbackModels(account.fallbackModels).join('\n'));
      setFallbackProviderIds(normalizeFallbackProviderIds(account.fallbackAccountIds));
      setArkMode(
        isArkCodePlanMode(
          account.vendorId,
          account.baseUrl,
          account.model,
          typeInfo?.codePlanPresetBaseUrl,
          typeInfo?.codePlanPresetModelId,
        ) ? 'codeplan' : 'apikey'
      );
    }
  }, [isEditing, account.baseUrl, account.fallbackModels, account.fallbackAccountIds, account.model, account.apiProtocol, account.vendorId, typeInfo?.codePlanPresetBaseUrl, typeInfo?.codePlanPresetModelId]);

  const fallbackOptions = allProviders.filter((candidate) => candidate.account.id !== account.id);

  const toggleFallbackProvider = (providerId: string) => {
    setFallbackProviderIds((current) => (
      current.includes(providerId)
        ? current.filter((id) => id !== providerId)
        : [...current, providerId]
    ));
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const payload: { newApiKey?: string; updates?: Partial<ProviderConfig> } = {};
      const normalizedFallbackModels = normalizeFallbackModels(fallbackModelsText.split('\n'));

      if (newKey.trim()) {
        setValidating(true);
        const result = await onValidateKey(newKey, {
          baseUrl: baseUrl.trim() || undefined,
          apiProtocol: (account.vendorId === 'custom' || account.vendorId === 'ollama') ? apiProtocol : undefined,
        });
        setValidating(false);
        if (!result.valid) {
          toast.error(result.error || t('aiProviders.toast.invalidKey'));
          setSaving(false);
          return;
        }
        payload.newApiKey = newKey.trim();
      }

      {
        if (showModelIdField && !modelId.trim()) {
          toast.error(t('aiProviders.toast.modelRequired'));
          setSaving(false);
          return;
        }

        const updates: Partial<ProviderConfig> = {};
        if (typeInfo?.showBaseUrl && (baseUrl.trim() || undefined) !== (account.baseUrl || undefined)) {
          updates.baseUrl = baseUrl.trim() || undefined;
        }
        if ((account.vendorId === 'custom' || account.vendorId === 'ollama') && apiProtocol !== account.apiProtocol) {
          updates.apiProtocol = apiProtocol;
        }
        if (showModelIdField && (modelId.trim() || undefined) !== (account.model || undefined)) {
          updates.model = modelId.trim() || undefined;
        }
        if (!fallbackModelsEqual(normalizedFallbackModels, account.fallbackModels)) {
          updates.fallbackModels = normalizedFallbackModels;
        }
        if (!fallbackProviderIdsEqual(fallbackProviderIds, account.fallbackAccountIds)) {
          updates.fallbackProviderIds = normalizeFallbackProviderIds(fallbackProviderIds);
        }
        if (Object.keys(updates).length > 0) {
          payload.updates = updates;
        }
      }

      // Keep Ollama key optional in UI, but persist a placeholder when
      // editing legacy configs that have no stored key.
      if (account.vendorId === 'ollama' && !status?.hasKey && !payload.newApiKey) {
        payload.newApiKey = resolveProviderApiKeyForSave(account.vendorId, '') as string;
      }

      if (!payload.newApiKey && !payload.updates) {
        onCancelEdit();
        setSaving(false);
        return;
      }

      await onSaveEdits(payload);
      setNewKey('');
      toast.success(t('aiProviders.toast.updated'));
    } catch (error) {
      toast.error(`${t('aiProviders.toast.failedUpdate')}: ${error}`);
    } finally {
      setSaving(false);
      setValidating(false);
    }
  };

  return (
    <div
      className={cn(
        'group',
        styles.providerCard,
        isDefault && styles.providerCardDefault,
      )}
    >
      <div className={styles.cardTopRow}>
        <div className={styles.cardLeft}>
          <div className={styles.providerIcon}>
            {getProviderIconUrl(account.vendorId) ? (
              <img
                src={getProviderIconUrl(account.vendorId)}
                alt={typeInfo?.name || account.vendorId}
                className={styles.providerIconImg}
                style={shouldInvertInDark(account.vendorId) ? { filter: 'invert(1)' } : undefined}
              />
            ) : (
              <span style={{ fontSize: 14 }}>{vendor?.icon || typeInfo?.icon || '⚙️'}</span>
            )}
          </div>
          <div className={styles.providerInfo}>
            <div className={styles.providerNameRow}>
              <span className={styles.providerName}>{account.label}</span>
              {isDefault && (
                <span className={styles.defaultBadge}>
                  <Check style={{ height: 12, width: 12 }} />
                  {t('aiProviders.card.default')}
                </span>
              )}
            </div>
            <div className={styles.providerMeta}>
              <span style={{ textTransform: 'capitalize' }}>{vendor?.name || account.vendorId}</span>
              <span className={styles.metaDot} />
              <span>{getAuthModeLabel(account.authMode, t)}</span>
              {account.model && (
                <>
                  <span className={styles.metaDot} />
                  <span className={styles.metaTruncate}>{account.model}</span>
                </>
              )}
              <span className={styles.metaDot} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {hasConfiguredCredentials(account, status) ? (
                  <><div className={cn(styles.statusDot, styles.statusDotGreen)} /> {t('aiProviders.card.configured')}</>
                ) : (
                  <><div className={cn(styles.statusDot, styles.statusDotRed)} /> {t('aiProviders.dialog.apiKeyMissing')}</>
                )}
              </span>
              {((account.fallbackModels?.length ?? 0) > 0 || (account.fallbackAccountIds?.length ?? 0) > 0) && (
                <>
                  <span className={styles.metaDot} />
                  <span className={styles.metaTruncate} style={{ maxWidth: 150 }} title={t('aiProviders.sections.fallback')}>
                    {t('aiProviders.sections.fallback')}: {[
                      ...normalizeFallbackModels(account.fallbackModels),
                      ...normalizeFallbackProviderIds(account.fallbackAccountIds)
                        .map((fallbackId) => allProviders.find((candidate) => candidate.account.id === fallbackId)?.account.label)
                        .filter(Boolean),
                    ].join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className={styles.cardActions}>
            {!isDefault && (
              <Button
                variant="ghost"
                size="icon"
                style={{ height: 32, width: 32, borderRadius: 9999, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                onClick={onSetDefault}
                title={t('aiProviders.card.setDefault')}
              >
                <Check style={{ height: 16, width: 16 }} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              style={{ height: 32, width: 32, borderRadius: 9999, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              onClick={onEdit}
              title={t('aiProviders.card.editKey')}
            >
              <Edit style={{ height: 16, width: 16 }} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              style={{ height: 32, width: 32, borderRadius: 9999, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
              onClick={onDelete}
              title={t('aiProviders.card.delete')}
            >
              <Trash2 style={{ height: 16, width: 16 }} />
            </Button>
          </div>
        )}
      </div>

      {isEditing && (
        <div className={styles.editArea}>
          {effectiveDocsUrl && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8, marginBottom: 8 }}>
              <a href={effectiveDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue}>
                {t('aiProviders.dialog.customDoc')}
                <ExternalLink style={{ height: 12, width: 12 }} />
              </a>
            </div>
          )}
          {canEditModelConfig && (
            <div className={styles.editSection}>
              <p className={isDefault ? styles.fieldLabelLight : styles.sectionLabel}>{t('aiProviders.sections.model')}</p>
              {typeInfo?.showBaseUrl && (
                <div className={styles.editSubSection}>
                  <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.baseUrl')}</Label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={getProtocolBaseUrlPlaceholder(apiProtocol)}
                    className={isDefault ? styles.monoInputDefault : styles.monoInput}
                  />
                </div>
              )}
              {showModelIdField && (
                <div className={styles.editSubSection} style={{ paddingTop: 8 }}>
                  <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.modelId')}</Label>
                  <Input
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder={typeInfo?.modelIdPlaceholder || 'provider/model-id'}
                    className={isDefault ? styles.monoInputDefault : styles.monoInput}
                  />
                </div>
              )}
              {account.vendorId === 'ark' && codePlanPreset && (
                <div className={styles.editSubSection} style={{ paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.codePlanPreset')}</Label>
                    {typeInfo?.codePlanDocsUrl && (
                      <a href={typeInfo.codePlanDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue}>
                        {t('aiProviders.dialog.codePlanDoc')}
                        <ExternalLink style={{ height: 12, width: 12 }} />
                      </a>
                    )}
                  </div>
                  <div className={styles.segmentGroup}>
                    <button
                      type="button"
                      onClick={() => {
                        setArkMode('apikey');
                        setBaseUrl(typeInfo?.defaultBaseUrl || '');
                        if (modelId.trim() === codePlanPreset.modelId) {
                          setModelId(typeInfo?.defaultModelId || '');
                        }
                      }}
                      className={cn(styles.segmentBtn, arkMode === 'apikey' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.authModes.apiKey')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArkMode('codeplan');
                        setBaseUrl(codePlanPreset.baseUrl);
                        setModelId(codePlanPreset.modelId);
                      }}
                      className={cn(styles.segmentBtn, arkMode === 'codeplan' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.dialog.codePlanMode')}
                    </button>
                  </div>
                  {arkMode === 'codeplan' && (
                    <p className={styles.helpText}>{t('aiProviders.dialog.codePlanPresetDesc')}</p>
                  )}
                </div>
              )}
              {account.vendorId === 'custom' && (
                <div className={styles.editSubSection} style={{ paddingTop: 8 }}>
                  <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.protocol', 'Protocol')}</Label>
                  <div className={styles.segmentGroup}>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('openai-completions')}
                      className={cn(styles.segmentBtn, apiProtocol === 'openai-completions' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.openaiCompletions', 'OpenAI Completions')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('openai-responses')}
                      className={cn(styles.segmentBtn, apiProtocol === 'openai-responses' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.openaiResponses', 'OpenAI Responses')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('anthropic-messages')}
                      className={cn(styles.segmentBtn, apiProtocol === 'anthropic-messages' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.anthropic', 'Anthropic')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className={styles.editSection}>
            <button onClick={() => setShowFallback(!showFallback)} className={styles.fallbackToggle}>
              <span>{t('aiProviders.sections.fallback')}</span>
              <ChevronDown style={{ height: 16, width: 16, transition: 'transform 0.2s', transform: showFallback ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {showFallback && (
              <div className={styles.fallbackContent}>
                <div className={styles.editSubSection}>
                  <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.fallbackModelIds')}</Label>
                  <textarea
                    value={fallbackModelsText}
                    onChange={(e) => setFallbackModelsText(e.target.value)}
                    placeholder={t('aiProviders.dialog.fallbackModelIdsPlaceholder')}
                    className={isDefault ? styles.fallbackTextareaDefault : styles.fallbackTextarea}
                  />
                  <p className={styles.helpText}>{t('aiProviders.dialog.fallbackModelIdsHelp')}</p>
                </div>
                <div className={styles.editSubSection} style={{ paddingTop: 4 }}>
                  <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.fallbackProviders')}</Label>
                  {fallbackOptions.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>{t('aiProviders.dialog.noFallbackOptions')}</p>
                  ) : (
                    <div className={isDefault ? styles.checkboxListDefault : styles.checkboxList}>
                      {fallbackOptions.map((candidate) => (
                        <label key={candidate.account.id} className={styles.checkboxRow}>
                          <input
                            type="checkbox"
                            checked={fallbackProviderIds.includes(candidate.account.id)}
                            onChange={() => toggleFallbackProvider(candidate.account.id)}
                            style={{ accentColor: '#3b82f6' }}
                          />
                          <span style={{ fontWeight: 500 }}>{candidate.account.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                            {candidate.account.model || candidate.vendor?.name || candidate.account.vendorId}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className={styles.editSection}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Label className={isDefault ? styles.fieldLabelLight : styles.sectionLabel}>{t('aiProviders.dialog.apiKey')}</Label>
                <p className={styles.helpText}>
                  {hasConfiguredCredentials(account, status)
                    ? t('aiProviders.dialog.apiKeyConfigured')
                    : t('aiProviders.dialog.apiKeyMissing')}
                </p>
              </div>
              {hasConfiguredCredentials(account, status) ? (
                <div className={styles.configuredBadge}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  {t('aiProviders.card.configured')}
                </div>
              ) : null}
            </div>
            {typeInfo?.apiKeyUrl && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <a href={typeInfo.apiKeyUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue13} tabIndex={-1}>
                  {t('aiProviders.oauth.getApiKey')} <ExternalLink style={{ height: 12, width: 12 }} />
                </a>
              </div>
            )}
            <div className={styles.editSubSection} style={{ paddingTop: 4 }}>
              <Label className={isDefault ? styles.fieldLabelLight : styles.fieldLabel}>{t('aiProviders.dialog.replaceApiKey')}</Label>
              <div className={styles.keyInputRow}>
                <div className={styles.keyInputWrap}>
                  <Input
                    type={showKey ? 'text' : 'password'}
                    placeholder={typeInfo?.requiresApiKey ? typeInfo?.placeholder : (typeInfo?.id === 'ollama' ? t('aiProviders.notRequired') : t('aiProviders.card.editKey'))}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className={isDefault ? styles.monoInputDefault : styles.monoInput}
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className={styles.eyeBtn}>
                    {showKey ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSaveEdits}
                  style={{
                    borderRadius: 12,
                    padding: '0 16px',
                    height: isDefault ? 40 : 44,
                    borderColor: 'rgba(0,0,0,0.1)',
                    background: isDefault ? 'white' : '#eeece3',
                    boxShadow: isDefault ? undefined : '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  disabled={
                    validating
                    || saving
                    || (
                      !newKey.trim()
                      && (baseUrl.trim() || undefined) === (account.baseUrl || undefined)
                      && (modelId.trim() || undefined) === (account.model || undefined)
                      && fallbackModelsEqual(normalizeFallbackModels(fallbackModelsText.split('\n')), account.fallbackModels)
                      && fallbackProviderIdsEqual(fallbackProviderIds, account.fallbackAccountIds)
                    )
                    || Boolean(showModelIdField && !modelId.trim())
                  }
                >
                  {validating || saving ? (
                    <Loader2 style={{ height: 16, width: 16, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Check style={{ height: 16, width: 16, color: '#22c55e' }} />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={onCancelEdit}
                  style={{
                    padding: 0,
                    borderRadius: 12,
                    height: isDefault ? 40 : 44,
                    width: isDefault ? 40 : 44,
                    border: isDefault ? undefined : '1px solid rgba(0,0,0,0.1)',
                    background: isDefault ? undefined : '#eeece3',
                    boxShadow: isDefault ? undefined : '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <X style={{ height: 16, width: 16 }} />
                </Button>
              </div>
              <p className={styles.helpText}>{t('aiProviders.dialog.replaceApiKeyHelp')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AddProviderDialogProps {
  existingVendorIds: Set<string>;
  vendors: ProviderVendorInfo[];
  onClose: () => void;
  onAdd: (
    type: ProviderType,
    name: string,
    apiKey: string,
    options?: { baseUrl?: string; model?: string; authMode?: ProviderAccount['authMode']; apiProtocol?: ProviderAccount['apiProtocol'] }
  ) => Promise<void>;
  onValidateKey: (
    type: string,
    apiKey: string,
    options?: { baseUrl?: string; apiProtocol?: ProviderAccount['apiProtocol'] }
  ) => Promise<{ valid: boolean; error?: string }>;
  devModeUnlocked: boolean;
}

function AddProviderDialog({
  existingVendorIds,
  vendors,
  onClose,
  onAdd,
  onValidateKey,
  devModeUnlocked,
}: AddProviderDialogProps) {
  const { t, i18n } = useTranslation('settings');
  const { styles } = useProviderStyles();
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiProtocol, setApiProtocol] = useState<ProviderAccount['apiProtocol']>('openai-completions');
  const [arkMode, setArkMode] = useState<ArkMode>('apikey');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // OAuth Flow State
  const [oauthFlowing, setOauthFlowing] = useState(false);
  const [oauthData, setOauthData] = useState<{
    mode: 'device';
    verificationUri: string;
    userCode: string;
    expiresIn: number;
  } | {
    mode: 'manual';
    authorizationUrl: string;
    message?: string;
  } | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [oauthError, setOauthError] = useState<string | null>(null);
  // For providers that support both OAuth and API key, let the user choose.
  // Default to the vendor's declared auth mode instead of hard-coding OAuth.
  const [authMode, setAuthMode] = useState<'oauth' | 'apikey'>('apikey');

  const typeInfo = PROVIDER_TYPE_INFO.find((t) => t.id === selectedType);
  const providerDocsUrl = getProviderDocsUrl(typeInfo, i18n.language);
  const showModelIdField = shouldShowProviderModelId(typeInfo, devModeUnlocked);
  const codePlanPreset = typeInfo?.codePlanPresetBaseUrl && typeInfo?.codePlanPresetModelId
    ? {
      baseUrl: typeInfo.codePlanPresetBaseUrl,
      modelId: typeInfo.codePlanPresetModelId,
    }
    : null;
  const effectiveDocsUrl = selectedType === 'ark' && arkMode === 'codeplan'
    ? (typeInfo?.codePlanDocsUrl || providerDocsUrl)
    : providerDocsUrl;
  const isOAuth = typeInfo?.isOAuth ?? false;
  const supportsApiKey = typeInfo?.supportsApiKey ?? false;
  const vendorMap = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const selectedVendor = selectedType ? vendorMap.get(selectedType) : undefined;
  const preferredOAuthMode = selectedVendor?.supportedAuthModes.includes('oauth_browser')
    ? 'oauth_browser'
    : (selectedVendor?.supportedAuthModes.includes('oauth_device')
      ? 'oauth_device'
      : (selectedType === 'google' ? 'oauth_browser' : null));
  // Effective OAuth mode: pure OAuth providers, or dual-mode with oauth selected
  const useOAuthFlow = isOAuth && (!supportsApiKey || authMode === 'oauth');

  useEffect(() => {
    if (!selectedVendor || !isOAuth || !supportsApiKey) {
      return;
    }
    setAuthMode(selectedVendor.defaultAuthMode === 'api_key' ? 'apikey' : 'oauth');
  }, [selectedVendor, isOAuth, supportsApiKey]);

  useEffect(() => {
    if (selectedType !== 'ark') {
      setArkMode('apikey');
      return;
    }
    setArkMode(
      isArkCodePlanMode(
        'ark',
        baseUrl,
        modelId,
        typeInfo?.codePlanPresetBaseUrl,
        typeInfo?.codePlanPresetModelId,
      ) ? 'codeplan' : 'apikey'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  // Keep refs to the latest values so event handlers see the current dialog state.
  const latestRef = React.useRef({ selectedType, typeInfo, onAdd, onClose, t });
  const pendingOAuthRef = React.useRef<{ accountId: string; label: string } | null>(null);
  useEffect(() => {
    latestRef.current = { selectedType, typeInfo, onAdd, onClose, t };
  });

  // Manage OAuth events
  useEffect(() => {
    const handleCode = (data: unknown) => {
      const payload = data as Record<string, unknown>;
      if (payload?.mode === 'manual') {
        setOauthData({
          mode: 'manual',
          authorizationUrl: String(payload.authorizationUrl || ''),
          message: typeof payload.message === 'string' ? payload.message : undefined,
        });
      } else {
        setOauthData({
          mode: 'device',
          verificationUri: String(payload.verificationUri || ''),
          userCode: String(payload.userCode || ''),
          expiresIn: Number(payload.expiresIn || 300),
        });
      }
      setOauthError(null);
    };

    const handleSuccess = async (data: unknown) => {
      setOauthFlowing(false);
      setOauthData(null);
      setManualCodeInput('');
      setValidationError(null);

      const { onClose: close, t: translate } = latestRef.current;
      const payload = (data as { accountId?: string } | undefined) || undefined;
      const accountId = payload?.accountId || pendingOAuthRef.current?.accountId;

      // device-oauth.ts already saved the provider config to the backend,
      // including the dynamically resolved baseUrl for the region (e.g. CN vs Global).
      // If we call add() here with undefined baseUrl, it will overwrite and erase it!
      // So we just fetch the latest list from the backend to update the UI.
      try {
        const store = useProviderStore.getState();
        await store.refreshProviderSnapshot();

        // OAuth sign-in should immediately become active default to avoid
        // leaving runtime on an API-key-only provider/model.
        if (accountId) {
          await store.setDefaultAccount(accountId);
        }
      } catch (err) {
        console.error('Failed to refresh providers after OAuth:', err);
      }

      pendingOAuthRef.current = null;
      close();
      toast.success(translate('aiProviders.toast.added'));
    };

    const handleError = (data: unknown) => {
      setOauthError((data as { message: string }).message);
      setOauthData(null);
      pendingOAuthRef.current = null;
    };

    const offCode = subscribeHostEvent('oauth:code', handleCode);
    const offSuccess = subscribeHostEvent('oauth:success', handleSuccess);
    const offError = subscribeHostEvent('oauth:error', handleError);

    return () => {
      offCode();
      offSuccess();
      offError();
    };
  }, []);

  const handleStartOAuth = async () => {
    if (!selectedType) return;

    if (selectedType === 'minimax-portal' && existingVendorIds.has('minimax-portal-cn')) {
      toast.error(t('aiProviders.toast.minimaxConflict'));
      return;
    }
    if (selectedType === 'minimax-portal-cn' && existingVendorIds.has('minimax-portal')) {
      toast.error(t('aiProviders.toast.minimaxConflict'));
      return;
    }

    setOauthFlowing(true);
    setOauthData(null);
    setManualCodeInput('');
    setOauthError(null);

    try {
      const vendor = vendorMap.get(selectedType);
      const supportsMultipleAccounts = vendor?.supportsMultipleAccounts ?? selectedType === 'custom';
      const accountId = supportsMultipleAccounts ? `${selectedType}-${crypto.randomUUID()}` : selectedType;
      const label = name || (typeInfo?.id === 'custom' ? t('aiProviders.custom') : typeInfo?.name) || selectedType;
      pendingOAuthRef.current = { accountId, label };
      await hostApiFetch('/api/providers/oauth/start', {
        method: 'POST',
        body: JSON.stringify({ provider: selectedType, accountId, label }),
      });
    } catch (e) {
      setOauthError(String(e));
      setOauthFlowing(false);
      pendingOAuthRef.current = null;
    }
  };

  const handleCancelOAuth = async () => {
    setOauthFlowing(false);
    setOauthData(null);
    setManualCodeInput('');
    setOauthError(null);
    pendingOAuthRef.current = null;
    await hostApiFetch('/api/providers/oauth/cancel', {
      method: 'POST',
    });
  };

  const handleSubmitManualOAuthCode = async () => {
    const value = manualCodeInput.trim();
    if (!value) return;
    try {
      await hostApiFetch('/api/providers/oauth/submit', {
        method: 'POST',
        body: JSON.stringify({ code: value }),
      });
      setOauthError(null);
    } catch (error) {
      setOauthError(String(error));
    }
  };

  const availableTypes = PROVIDER_TYPE_INFO.filter((type) => {
    const vendor = vendorMap.get(type.id);
    if (!vendor) {
      return !existingVendorIds.has(type.id) || type.id === 'custom';
    }
    return vendor.supportsMultipleAccounts || !existingVendorIds.has(type.id);
  });

  const handleAdd = async () => {
    if (!selectedType) return;

    if (selectedType === 'minimax-portal' && existingVendorIds.has('minimax-portal-cn')) {
      toast.error(t('aiProviders.toast.minimaxConflict'));
      return;
    }
    if (selectedType === 'minimax-portal-cn' && existingVendorIds.has('minimax-portal')) {
      toast.error(t('aiProviders.toast.minimaxConflict'));
      return;
    }

    setSaving(true);
    setValidationError(null);

    try {
      // Validate key first if the provider requires one and a key was entered
      const requiresKey = typeInfo?.requiresApiKey ?? false;
      if (requiresKey && !apiKey.trim()) {
        setValidationError(t('aiProviders.toast.invalidKey')); // reusing invalid key msg or should add 'required' msg? null checks
        setSaving(false);
        return;
      }
      if (requiresKey && apiKey) {
        const result = await onValidateKey(selectedType, apiKey, {
          baseUrl: baseUrl.trim() || undefined,
          apiProtocol: (selectedType === 'custom' || selectedType === 'ollama') ? apiProtocol : undefined,
        });
        if (!result.valid) {
          setValidationError(result.error || t('aiProviders.toast.invalidKey'));
          setSaving(false);
          return;
        }
      }

      const requiresModel = showModelIdField;
      if (requiresModel && !modelId.trim()) {
        setValidationError(t('aiProviders.toast.modelRequired'));
        setSaving(false);
        return;
      }

      await onAdd(
        selectedType,
        name || (typeInfo?.id === 'custom' ? t('aiProviders.custom') : typeInfo?.name) || selectedType,
        apiKey.trim(),
        {
          baseUrl: baseUrl.trim() || undefined,
          apiProtocol: (selectedType === 'custom' || selectedType === 'ollama') ? apiProtocol : undefined,
          model: resolveProviderModelForSave(typeInfo, modelId, devModeUnlocked),
          authMode: useOAuthFlow ? (preferredOAuthMode || 'oauth_device') : selectedType === 'ollama'
            ? 'local'
            : (isOAuth && supportsApiKey && authMode === 'apikey')
              ? 'api_key'
              : vendorMap.get(selectedType)?.defaultAuthMode || 'api_key',
        }
      );
    } catch {
      // error already handled via toast in parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.dialogOverlay}>
      <Card className={styles.dialogCard}>
        <CardHeader className={styles.dialogHeader}>
          <CardTitle className={styles.dialogTitle}>{t('aiProviders.dialog.title')}</CardTitle>
          <CardDescription className={styles.dialogDesc}>
            {t('aiProviders.dialog.desc')}
          </CardDescription>
          <Button
            variant="ghost"
            size="icon"
            className={styles.dialogCloseBtn}
            style={{ borderRadius: 9999, height: 32, width: 32 }}
            onClick={onClose}
          >
            <X style={{ height: 16, width: 16 }} />
          </Button>
        </CardHeader>
        <CardContent className={styles.dialogBody}>
          {!selectedType ? (
            <div className={styles.typeGrid}>
              {availableTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setSelectedType(type.id);
                    setName(type.id === 'custom' ? t('aiProviders.custom') : type.name);
                    setBaseUrl(type.defaultBaseUrl || '');
                    setModelId(type.defaultModelId || '');
                    setArkMode('apikey');
                  }}
                  className={styles.typeBtn}
                >
                  <div className={styles.typeBtnIcon}>
                    {getProviderIconUrl(type.id) ? (
                      <img
                        src={getProviderIconUrl(type.id)}
                        alt={type.name}
                        style={{ height: 24, width: 24, ...(shouldInvertInDark(type.id) ? { filter: 'invert(1)' } : {}) }}
                      />
                    ) : (
                      <span style={{ fontSize: 14 }}>{type.icon}</span>
                    )}
                  </div>
                  <p className={styles.typeBtnName}>{type.id === 'custom' ? t('aiProviders.custom') : type.name}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.sectionGap6} style={{ gap: 24 }}>
              <div className={styles.selectedProviderHeader}>
                <div className={styles.selectedProviderIcon}>
                  {getProviderIconUrl(selectedType!) ? (
                    <img
                      src={getProviderIconUrl(selectedType!)}
                      alt={typeInfo?.name}
                      style={{ height: 24, width: 24, ...(shouldInvertInDark(selectedType!) ? { filter: 'invert(1)' } : {}) }}
                    />
                  ) : (
                    <span style={{ fontSize: 14 }}>{typeInfo?.icon}</span>
                  )}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{typeInfo?.id === 'custom' ? t('aiProviders.custom') : typeInfo?.name}</p>
                  <button
                    onClick={() => {
                      setSelectedType(null);
                      setValidationError(null);
                      setBaseUrl('');
                      setModelId('');
                      setArkMode('apikey');
                    }}
                    style={{ fontSize: 13, color: '#3b82f6', fontWeight: 500, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  >
                    {t('aiProviders.dialog.change')}
                  </button>
                  {effectiveDocsUrl && (
                    <>
                      <span style={{ margin: '0 8px', opacity: 0.2 }}>|</span>
                      <a href={effectiveDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue13}>
                        {t('aiProviders.dialog.customDoc')}
                        <ExternalLink style={{ height: 12, width: 12 }} />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.sectionGap6} style={{ gap: 24, background: 'transparent', padding: 0 }}>
                <div className={styles.formGroup}>
                  <Label htmlFor="name" className={styles.fieldLabel}>{t('aiProviders.dialog.displayName')}</Label>
                  <Input
                    id="name"
                    placeholder={typeInfo?.id === 'custom' ? t('aiProviders.custom') : typeInfo?.name}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.monoInput}
                  />
                </div>

                {/* Auth mode toggle for providers supporting both */}
                {isOAuth && supportsApiKey && (
                  <div className={styles.authModeToggle}>
                    <button
                      onClick={() => setAuthMode('oauth')}
                      className={cn(styles.authModeBtn, authMode === 'oauth' && styles.authModeBtnActive)}
                    >
                      {t('aiProviders.oauth.loginMode')}
                    </button>
                    <button
                      onClick={() => setAuthMode('apikey')}
                      className={cn(styles.authModeBtn, authMode === 'apikey' && styles.authModeBtnActive)}
                    >
                      {t('aiProviders.oauth.apikeyMode')}
                    </button>
                  </div>
                )}

                {/* API Key input — shown for non-OAuth providers or when apikey mode is selected */}
                {(!isOAuth || (supportsApiKey && authMode === 'apikey')) && (
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Label htmlFor="apiKey" className={styles.fieldLabel}>{t('aiProviders.dialog.apiKey')}</Label>
                      {typeInfo?.apiKeyUrl && (
                        <a href={typeInfo.apiKeyUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue13} tabIndex={-1}>
                          {t('aiProviders.oauth.getApiKey')} <ExternalLink style={{ height: 12, width: 12 }} />
                        </a>
                      )}
                    </div>
                    <div className={styles.inputWithEye}>
                      <Input
                        id="apiKey"
                        type={showKey ? 'text' : 'password'}
                        placeholder={typeInfo?.id === 'ollama' ? t('aiProviders.notRequired') : typeInfo?.placeholder}
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setValidationError(null);
                        }}
                        className={styles.monoInput}
                        style={{ paddingRight: 40 }}
                      />
                      <button type="button" onClick={() => setShowKey(!showKey)} className={styles.eyeBtn}>
                        {showKey ? <EyeOff style={{ height: 16, width: 16 }} /> : <Eye style={{ height: 16, width: 16 }} />}
                      </button>
                    </div>
                    {validationError && (
                      <p className={styles.errorText}>{validationError}</p>
                    )}
                    <p className={styles.helpText}>{t('aiProviders.dialog.apiKeyStored')}</p>
                  </div>
                )}

                {typeInfo?.showBaseUrl && (
                  <div className={styles.formGroup}>
                    <Label htmlFor="baseUrl" className={styles.fieldLabel}>{t('aiProviders.dialog.baseUrl')}</Label>
                    <Input
                      id="baseUrl"
                      placeholder={getProtocolBaseUrlPlaceholder(apiProtocol)}
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className={styles.monoInput}
                    />
                  </div>
                )}

                {showModelIdField && (
                  <div className={styles.formGroup}>
                    <Label htmlFor="modelId" className={styles.fieldLabel}>{t('aiProviders.dialog.modelId')}</Label>
                    <Input
                      id="modelId"
                      placeholder={typeInfo?.modelIdPlaceholder || 'provider/model-id'}
                      value={modelId}
                      onChange={(e) => {
                        setModelId(e.target.value);
                        setValidationError(null);
                      }}
                      className={styles.monoInput}
                    />
                  </div>
                )}
                {selectedType === 'ark' && codePlanPreset && (
                  <div className={styles.formGroup}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <Label className={styles.fieldLabel}>{t('aiProviders.dialog.codePlanPreset')}</Label>
                      {typeInfo?.codePlanDocsUrl && (
                        <a href={typeInfo.codePlanDocsUrl} target="_blank" rel="noopener noreferrer" className={styles.linkBlue13} tabIndex={-1}>
                          {t('aiProviders.dialog.codePlanDoc')}
                          <ExternalLink style={{ height: 12, width: 12 }} />
                        </a>
                      )}
                    </div>
                    <div className={styles.segmentGroup}>
                      <button
                        type="button"
                        onClick={() => {
                          setArkMode('apikey');
                          setBaseUrl(typeInfo?.defaultBaseUrl || '');
                          if (modelId.trim() === codePlanPreset.modelId) {
                            setModelId(typeInfo?.defaultModelId || '');
                          }
                          setValidationError(null);
                        }}
                        className={cn(styles.segmentBtn, arkMode === 'apikey' && styles.segmentBtnActive)}
                      >
                        {t('aiProviders.authModes.apiKey')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setArkMode('codeplan');
                          setBaseUrl(codePlanPreset.baseUrl);
                          setModelId(codePlanPreset.modelId);
                          setValidationError(null);
                        }}
                        className={cn(styles.segmentBtn, arkMode === 'codeplan' && styles.segmentBtnActive)}
                      >
                        {t('aiProviders.dialog.codePlanMode')}
                      </button>
                    </div>
                    {arkMode === 'codeplan' && (
                      <p className={styles.helpText}>{t('aiProviders.dialog.codePlanPresetDesc')}</p>
                    )}
                  </div>
                )}
                {selectedType === 'custom' && (
                <div className={styles.formGroup}>
                  <Label className={styles.fieldLabel}>{t('aiProviders.dialog.protocol', 'Protocol')}</Label>
                  <div className={styles.segmentGroup}>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('openai-completions')}
                      className={cn(styles.segmentBtn, apiProtocol === 'openai-completions' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.openaiCompletions', 'OpenAI Completions')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('openai-responses')}
                      className={cn(styles.segmentBtn, apiProtocol === 'openai-responses' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.openaiResponses', 'OpenAI Responses')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiProtocol('anthropic-messages')}
                      className={cn(styles.segmentBtn, apiProtocol === 'anthropic-messages' && styles.segmentBtnActive)}
                    >
                      {t('aiProviders.protocols.anthropic', 'Anthropic')}
                    </button>
                  </div>
                </div>
                )}
                {/* Device OAuth Trigger — only shown when in OAuth mode */}
                {useOAuthFlow && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
                    <div className={styles.oauthBox}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#2563eb', marginBottom: 16, display: 'block' }}>
                        {t('aiProviders.oauth.loginPrompt')}
                      </p>
                      <Button
                        onClick={handleStartOAuth}
                        disabled={oauthFlowing}
                        style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600, background: '#0a84ff', color: 'white', border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      >
                        {oauthFlowing ? (
                          <><Loader2 style={{ height: 16, width: 16, marginRight: 8, animation: 'spin 1s linear infinite' }} />{t('aiProviders.oauth.waiting')}</>
                        ) : (
                          t('aiProviders.oauth.loginButton')
                        )}
                      </Button>
                    </div>

                    {/* OAuth Active State Modal / Inline View */}
                    {oauthFlowing && (
                      <div className={styles.oauthFlowArea} style={{ marginTop: 16 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(59,130,246,0.05)', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                        <div className={styles.oauthFlowInner}>
                          {oauthError ? (
                            <div style={{ color: '#ef4444', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                              <XCircle style={{ height: 40, width: 40 }} />
                              <p style={{ fontWeight: 600, fontSize: 14 }}>{t('aiProviders.oauth.authFailed')}</p>
                              <p style={{ fontSize: 13, opacity: 0.8 }}>{oauthError}</p>
                              <Button variant="outline" size="sm" onClick={handleCancelOAuth} style={{ marginTop: 8, borderRadius: 9999, padding: '0 24px', height: 36 }}>
                                Try Again
                              </Button>
                            </div>
                          ) : !oauthData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '24px 0' }}>
                              <Loader2 style={{ height: 40, width: 40, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ant-color-text-secondary)' }}>{t('aiProviders.oauth.requestingCode')}</p>
                            </div>
                          ) : oauthData.mode === 'manual' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <h3 style={{ fontWeight: 600, fontSize: 14 }}>Complete OpenAI Login</h3>
                                <p style={{ fontSize: 13, textAlign: 'left', background: 'rgba(0,0,0,0.05)', padding: 16, borderRadius: 12 }}>
                                  {oauthData.message || 'Open the authorization page, complete login, then paste the callback URL or code below.'}
                                </p>
                              </div>
                              <Button
                                variant="secondary"
                                style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600 }}
                                onClick={() => invokeIpc('shell:openExternal', oauthData.authorizationUrl)}
                              >
                                <ExternalLink style={{ height: 16, width: 16, marginRight: 8 }} />
                                Open Authorization Page
                              </Button>
                              <Input
                                placeholder="Paste callback URL or code"
                                value={manualCodeInput}
                                onChange={(e) => setManualCodeInput(e.target.value)}
                                className={styles.monoInput}
                              />
                              <Button
                                style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600, background: '#0a84ff', color: 'white', border: 'none' }}
                                onClick={handleSubmitManualOAuthCode}
                                disabled={!manualCodeInput.trim()}
                              >
                                Submit Code
                              </Button>
                              <Button variant="ghost" style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600 }} onClick={handleCancelOAuth}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <h3 style={{ fontWeight: 600, fontSize: 14 }}>{t('aiProviders.oauth.approveLogin')}</h3>
                                <div style={{ fontSize: 13, textAlign: 'left', marginTop: 8, background: 'rgba(0,0,0,0.05)', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <p>1. {t('aiProviders.oauth.step1')}</p>
                                  <p>2. {t('aiProviders.oauth.step2')}</p>
                                  <p>3. {t('aiProviders.oauth.step3')}</p>
                                </div>
                              </div>
                              <div className={styles.userCodeBox}>
                                <code style={{ fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.2em', fontWeight: 700 }}>
                                  {oauthData.userCode}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  style={{ height: 40, width: 40, borderRadius: 9999 }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(oauthData.userCode);
                                    toast.success(t('aiProviders.oauth.codeCopied'));
                                  }}
                                >
                                  <Copy style={{ height: 20, width: 20 }} />
                                </Button>
                              </div>
                              <Button
                                variant="secondary"
                                style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600 }}
                                onClick={() => invokeIpc('shell:openExternal', oauthData.verificationUri)}
                              >
                                <ExternalLink style={{ height: 16, width: 16, marginRight: 8 }} />
                                {t('aiProviders.oauth.openLoginPage')}
                              </Button>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--ant-color-text-secondary)', paddingTop: 8 }}>
                                <Loader2 style={{ height: 16, width: 16, color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
                                <span>{t('aiProviders.oauth.waitingApproval')}</span>
                              </div>
                              <Button variant="ghost" style={{ width: '100%', borderRadius: 9999, height: 42, fontWeight: 600 }} onClick={handleCancelOAuth}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.separator} />

              <div className={styles.dialogFooter}>
                <Button
                  onClick={handleAdd}
                  style={{
                    borderRadius: 9999,
                    padding: '0 32px',
                    height: 42,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#0a84ff',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    display: useOAuthFlow ? 'none' : undefined,
                  }}
                  disabled={!selectedType || saving || (showModelIdField && modelId.trim().length === 0)}
                >
                  {saving ? (
                    <Loader2 style={{ height: 16, width: 16, animation: 'spin 1s linear infinite', marginRight: 8 }} />
                  ) : null}
                  {t('aiProviders.dialog.add')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
