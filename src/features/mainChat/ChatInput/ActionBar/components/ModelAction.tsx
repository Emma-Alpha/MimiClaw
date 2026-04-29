import { ModelIcon } from '@lobehub/icons';
import { createStyles } from 'antd-style';
import { Check } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Popover } from 'antd';
import { fetchCodeAgentModels, type CodeAgentModelInfo } from '@/lib/code-agent';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';

const useStyles = createStyles(({ css, token }) => ({
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    transition: background 120ms ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillSecondary};
    }
  `,
  itemLabel: css`
    flex: 1;
    font-size: 13px;
    color: ${token.colorText};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  panel: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 220px;
    max-height: 300px;
    overflow-y: auto;
  `,
  title: css`
    padding: 4px 10px 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: ${token.colorTextQuaternary};
  `,
  trigger: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: ${token.borderRadiusSM}px;
    cursor: pointer;
    transition: all 150ms ${token.motionEaseOut};

    &:hover {
      background: ${token.colorFillTertiary};
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  `,
}));

export const ModelAction = memo(() => {
  const { styles } = useStyles();
  const codeAgent = useSettingsStore((s) => s.codeAgent);
  const setCodeAgent = useSettingsStore((s) => s.setCodeAgent);
  // Top-level store field — Zustand guaranteed to detect changes
  const sessionModel = useChatStore((s) => s.sessionModel);
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<CodeAgentModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const currentModel = sessionModel || codeAgent?.model || '';

  const handleFetchModels = useCallback(async () => {
    const baseUrl = codeAgent?.baseUrl?.trim();
    const apiKey = codeAgent?.apiKey?.trim();
    if (!baseUrl || !apiKey) return;

    setLoading(true);
    try {
      const result = await fetchCodeAgentModels(baseUrl, apiKey);
      setModels(result);
    } catch {
      toast.error('Failed to fetch model list');
    } finally {
      setLoading(false);
    }
  }, [codeAgent?.apiKey, codeAgent?.baseUrl]);

  useEffect(() => {
    if (open && models.length === 0) {
      void handleFetchModels();
    }
  }, [open, handleFetchModels, models.length]);

  const handleSelectModel = useCallback((modelId: string) => {
    if (!codeAgent) return;
    const chatState = useChatStore.getState();
    if (chatState.sessionId) {
      chatState.setSessionModel(modelId);
    } else {
      setCodeAgent({ ...codeAgent, model: modelId });
    }
    setOpen(false);
    toast.success(`Model: ${modelId}`);
  }, [codeAgent, setCodeAgent]);

  // Always show current model in list even if fetch didn't include it
  const displayModels = useMemo(() => {
    if (models.length === 0 && currentModel) {
      return [{ id: currentModel, name: currentModel }];
    }
    return models;
  }, [currentModel, models]);

  const popoverContent = (
    <div className={styles.panel}>
      <div className={styles.title}>
        {loading ? 'Loading...' : 'Models'}
      </div>
      {displayModels.map((model) => (
        <div
          className={styles.item}
          key={model.id}
          onClick={() => handleSelectModel(model.id)}
        >
          <ModelIcon model={model.id} size={20} />
          <span className={styles.itemLabel}>{model.name || model.id}</span>
          {model.id === currentModel && <Check size={14} />}
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      onOpenChange={setOpen}
      open={open}
      placement="top"
      trigger={['click']}
    >
      <div className={styles.trigger} title={currentModel || 'Model'}>
        <ModelIcon model={currentModel} size={24} />
      </div>
    </Popover>
  );
});

ModelAction.displayName = 'ModelAction';
