import { Button, Flexbox, Modal, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { AlertTriangle, Check, Copy, Loader2 } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import appLogo from '@/assets/logo.png';
import type {
  MarketplacePlugin,
  PluginRequirement,
  PreflightCheckResult,
  PreflightResponse,
} from '@/types/claude-plugin';

const useStyles = createStyles(({ css, token }) => ({
  body: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 8px 0 4px;
  `,
  iconRow: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  `,
  iconBox: css`
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: ${token.colorFillSecondary};
    border: 1px solid ${token.colorBorderSecondary};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `,
  iconBoxBrand: css`
    background: #000;
    color: #fff;
  `,
  dots: css`
    display: flex;
    align-items: center;
    gap: 4px;
    span {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: ${token.colorBorderSecondary};
    }
  `,
  titleArea: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-align: center;
  `,
  title: css`
    font-size: 22px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  subtitle: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
  `,
  card: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 16px;
    padding: 4px 16px;
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 0;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    &:last-child {
      border-bottom: none;
    }
  `,
  sectionRow: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  `,
  pluginName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  metadataLine: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.7;
  `,
  sectionTitle: css`
    font-size: 13px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  description: css`
    font-size: 13px;
    color: ${cssVar.colorTextSecondary};
    line-height: 1.65;
    max-height: 160px;
    overflow-y: auto;
    padding-right: 4px;
    white-space: pre-wrap;
  `,
  chipsRow: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid ${token.colorBorderSecondary};
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    color: ${cssVar.colorTextSecondary};
  `,
  chipMarketplace: css`
    background: ${token.colorFillSecondary};
  `,
  installButton: css`
    width: 100%;
    height: 44px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
  `,
  // Preflight failure view
  warnHeader: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  `,
  warnIcon: css`
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: ${token.colorWarningBg};
    color: ${token.colorWarning};
    display: flex;
    align-items: center;
    justify-content: center;
  `,
  reqList: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  reqItem: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 12px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  reqHeader: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  reqName: css`
    font-size: 14px;
    font-weight: 600;
    color: ${cssVar.colorText};
  `,
  reqStatusOk: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${cssVar.colorSuccess};
  `,
  reqStatusBad: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: ${cssVar.colorError};
  `,
  reqHint: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
  `,
  cmdRow: css`
    display: flex;
    align-items: stretch;
    gap: 8px;
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    padding: 8px 10px;
    font-family: ${token.fontFamilyCode};
    font-size: 12px;
  `,
  cmdText: css`
    flex: 1;
    color: ${cssVar.colorText};
    word-break: break-all;
  `,
}));

interface InstallPluginModalProps {
  open: boolean;
  plugin: MarketplacePlugin;
  onClose: () => void;
  onConfirmInstall: () => Promise<void> | void;
  runPreflight: (
    requirements: PluginRequirement[],
  ) => Promise<PreflightResponse>;
}

type PlatformLabel = 'darwin' | 'win32' | 'linux';

function pickInstallCommand(
  result: PreflightCheckResult,
  platform: PlatformLabel,
): string | undefined {
  return result.installCommand?.[platform];
}

const PreflightSection = ({
  preflight,
  onCopyCommand,
}: {
  preflight: PreflightResponse;
  onCopyCommand: (cmd: string) => void;
}) => {
  const { styles } = useStyles();
  const failures = preflight.results.filter((r) => !r.ok);

  return (
    <Flexbox gap={20}>
      <div className={styles.warnHeader}>
        <span className={styles.warnIcon}>
          <AlertTriangle size={22} />
        </span>
        <span className={styles.title}>缺少运行依赖</span>
        <span className={styles.subtitle}>
          安装此插件之前，请先在你的电脑上安装以下依赖
        </span>
      </div>

      <div className={styles.reqList}>
        {failures.map((req) => {
          const cmd = pickInstallCommand(req, preflight.platform);
          const label = req.label || req.name;
          const reason =
            req.reason === 'version-too-old'
              ? `当前版本 ${req.version || '未知'}，需要更高版本`
              : '未在 PATH 中找到';
          return (
            <div className={styles.reqItem} key={req.name}>
              <div className={styles.reqHeader}>
                <span className={styles.reqName}>{label}</span>
                <span className={styles.reqStatusBad}>
                  <AlertTriangle size={12} />
                  {reason}
                </span>
              </div>
              {cmd ? (
                <>
                  <span className={styles.reqHint}>
                    在终端里运行下面的命令安装：
                  </span>
                  <div className={styles.cmdRow}>
                    <code className={styles.cmdText}>{cmd}</code>
                    <Button
                      icon={<Copy size={12} />}
                      onClick={() => onCopyCommand(cmd)}
                      size="small"
                      type="text"
                    >
                      复制
                    </Button>
                  </div>
                </>
              ) : (
                <span className={styles.reqHint}>
                  暂无内置安装指引，请参考依赖的官方文档
                </span>
              )}
            </div>
          );
        })}
      </div>

      {preflight.results.some((r) => r.ok) && (
        <Flexbox gap={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            已就绪：
          </Text>
          <div className={styles.chipsRow}>
            {preflight.results
              .filter((r) => r.ok)
              .map((r) => (
                <span className={styles.chip} key={r.name}>
                  <Check size={11} style={{ marginRight: 4 }} />
                  {(r.label || r.name) +
                    (r.version ? ` ${r.version}` : '')}
                </span>
              ))}
          </div>
        </Flexbox>
      )}
    </Flexbox>
  );
};

const InstallPluginModal = memo<InstallPluginModalProps>(
  ({ open, plugin, onClose, onConfirmInstall, runPreflight }) => {
    const { styles, cx } = useStyles();
    const [phase, setPhase] = useState<'details' | 'missing-deps'>('details');
    const [installing, setInstalling] = useState(false);
    const [checking, setChecking] = useState(false);
    const [preflight, setPreflight] = useState<PreflightResponse | null>(null);

    useEffect(() => {
      if (open) {
        setPhase('details');
        setInstalling(false);
        setChecking(false);
        setPreflight(null);
      }
    }, [open]);

    const developer = plugin.developerName || plugin.author;
    const category = plugin.categories?.join(', ');
    const showLongDesc = Boolean(
      plugin.longDescription &&
        plugin.longDescription !== plugin.description,
    );
    const aboutText = showLongDesc
      ? plugin.longDescription
      : plugin.description;
    const skillNames = useMemo(
      () => plugin.skills?.map((s) => s.name) ?? [],
      [plugin.skills],
    );
    const capabilityChips = plugin.capabilities ?? [];
    const requirements = useMemo(
      () => plugin.requirements ?? [],
      [plugin.requirements],
    );

    const handleCopyCommand = useCallback((cmd: string) => {
      navigator.clipboard.writeText(cmd).then(
        () => toast.success('已复制安装命令'),
        () => toast.error('复制失败'),
      );
    }, []);

    const proceedInstall = useCallback(async () => {
      setInstalling(true);
      try {
        await onConfirmInstall();
        onClose();
      } catch (err) {
        toast.error(`安装失败：${String(err)}`);
      } finally {
        setInstalling(false);
      }
    }, [onConfirmInstall, onClose]);

    const handleInstallClick = useCallback(async () => {
      if (phase === 'missing-deps') {
        setChecking(true);
        try {
          const result = await runPreflight(requirements);
          setPreflight(result);
          if (result.ok) {
            await proceedInstall();
          }
        } catch (err) {
          toast.error(`依赖检查失败：${String(err)}`);
        } finally {
          setChecking(false);
        }
        return;
      }

      if (requirements.length === 0) {
        await proceedInstall();
        return;
      }

      setChecking(true);
      try {
        const result = await runPreflight(requirements);
        setPreflight(result);
        if (result.ok) {
          await proceedInstall();
        } else {
          setPhase('missing-deps');
        }
      } catch (err) {
        toast.error(`依赖检查失败：${String(err)}`);
      } finally {
        setChecking(false);
      }
    }, [phase, requirements, runPreflight, proceedInstall]);

    const buttonLabel = useMemo(() => {
      if (installing) return `正在安装 ${plugin.name}`;
      if (checking) return '正在检查依赖…';
      if (phase === 'missing-deps') return '我已安装依赖，重新检查';
      return `安装 ${plugin.name}`;
    }, [installing, checking, phase, plugin.name]);

    return (
      <Modal
        centered
        footer={null}
        maskClosable={!installing && !checking}
        onCancel={installing || checking ? undefined : onClose}
        open={open}
        title={null}
        width={560}
        closable={!installing && !checking}
      >
        <div className={styles.body}>
          {/* Dual-icon header */}
          <div className={styles.iconRow}>
            <span className={cx(styles.iconBox, styles.iconBoxBrand)}>
              <img alt="MimiClaw" src={appLogo} />
            </span>
            <span className={styles.dots} aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className={styles.iconBox}>
              {plugin.icon ? (
                <img alt={plugin.name} src={plugin.icon} />
              ) : (
                <Text strong style={{ fontSize: 22 }}>
                  {plugin.name.slice(0, 1)}
                </Text>
              )}
            </span>
          </div>

          {/* Title */}
          <div className={styles.titleArea}>
            <span className={styles.title}>
              {phase === 'missing-deps'
                ? `完成设置 ${plugin.name}`
                : `安装 ${plugin.name}`}
            </span>
            {developer && (
              <span className={styles.subtitle}>由 {developer} 开发</span>
            )}
          </div>

          {phase === 'missing-deps' && preflight ? (
            <PreflightSection
              preflight={preflight}
              onCopyCommand={handleCopyCommand}
            />
          ) : (
            <div className={styles.card}>
              {/* Header section: name + marketplace tag */}
              <div className={styles.section}>
                <div className={styles.sectionRow}>
                  <span className={styles.pluginName}>{plugin.name}</span>
                  {plugin.marketplace && (
                    <span
                      className={cx(styles.chip, styles.chipMarketplace)}
                    >
                      {plugin.marketplace}
                    </span>
                  )}
                </div>
                {(developer || category) && (
                  <div className={styles.metadataLine}>
                    {developer && <div>由 {developer} 提供</div>}
                    {category && <div>类别：{category}</div>}
                  </div>
                )}
              </div>

              {/* About */}
              {aboutText && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>关于</span>
                  <div className={styles.description}>{aboutText}</div>
                </div>
              )}

              {/* Includes (skills) */}
              {skillNames.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>包含内容</span>
                  <Flexbox gap={6}>
                    <Text
                      style={{ fontSize: 11, letterSpacing: 0.5 }}
                      type="secondary"
                    >
                      技能
                    </Text>
                    <div className={styles.chipsRow}>
                      {skillNames.map((name) => (
                        <span className={styles.chip} key={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </Flexbox>
                </div>
              )}

              {/* Capabilities */}
              {capabilityChips.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>功能</span>
                  <div className={styles.chipsRow}>
                    {capabilityChips.map((cap) => (
                      <span className={styles.chip} key={cap}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            className={styles.installButton}
            disabled={installing || checking}
            icon={
              installing || checking ? (
                <Loader2 className="animate-spin" size={14} />
              ) : undefined
            }
            onClick={handleInstallClick}
            type="primary"
          >
            {buttonLabel}
          </Button>
        </div>
      </Modal>
    );
  },
);

InstallPluginModal.displayName = 'InstallPluginModal';

export default InstallPluginModal;
