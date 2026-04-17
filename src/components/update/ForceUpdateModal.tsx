/**
 * Full-screen update prompt (optional blocking). Driven by useUpdateStore.forcedUpdateModal.
 */
import { useCallback, useMemo } from "react";
import { Loader2, ArrowUpCircle, X, AlertCircle } from "lucide-react";
import { createStyles } from "antd-style";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useUpdateStore } from "@/stores/update";
import { useTranslation } from "react-i18next";
import updateBg from "@/assets/update-bg.png";

const useStyles = createStyles(({ css, token }) => ({
  backdrop: css`
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    padding: 24px;
    animation: fadeIn 0.3s ease;

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  cardWrap: css`
    position: relative;
    animation: zoomIn 0.3s ease;

    @keyframes zoomIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
  closeBtn: css`
    position: absolute;
    top: -12px;
    right: -12px;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    background: ${token.colorBgContainer};
    box-shadow: ${token.boxShadowSecondary};
    border: 1px solid ${token.colorBorderSecondary};
    color: ${token.colorTextSecondary};
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &:hover {
      background: ${token.colorFillTertiary};
      color: ${token.colorText};
    }
  `,
  card: css`
    position: relative;
    width: 100%;
    max-width: 480px;
    border-radius: 24px;
    background: ${token.colorBgContainer};
    box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `,
  illustrationArea: css`
    position: relative;
    width: 100%;
    height: 260px;
    background: linear-gradient(to bottom, rgba(186, 230, 253, 0.8), transparent);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;

    [data-theme="dark"] & {
      background: linear-gradient(to bottom, rgba(12, 74, 110, 0.2), transparent);
    }
  `,
  illustrationImg: css`
    width: 100%;
    height: auto;
    transform: scale(1.2);
    transform-origin: top;
    mix-blend-mode: multiply;

    [data-theme="dark"] & {
      mix-blend-mode: normal;
    }
  `,
  gradientMask: css`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 128px;
    background: linear-gradient(to top, ${token.colorBgContainer}, transparent);
    pointer-events: none;
  `,
  body: css`
    padding: 0 32px 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  `,
  title: css`
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: ${token.colorText};
  `,
  message: css`
    margin-top: 12px;
    font-size: 14px;
    color: ${token.colorTextSecondary};
    white-space: pre-wrap;
    line-height: 1.625;
    padding: 0 8px;
    max-width: 400px;
  `,
  versionBadge: css`
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    border: 1px solid ${token.colorPrimaryBorder};
    background: ${token.colorPrimaryBg};
    padding: 6px 16px;
    font-size: 14px;
    font-weight: 600;
    color: ${token.colorPrimary};
    margin-top: 20px;
  `,
  progressBox: css`
    width: 100%;
    margin-top: 28px;
    border-radius: 16px;
    background: ${token.colorFillTertiary};
    padding: 20px;
    border: 1px solid ${token.colorBorderSecondary};
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  progressHeader: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: ${token.colorText};
    opacity: 0.8;
  `,
  progressLabel: css`
    font-weight: 500;
  `,
  progressPercent: css`
    font-weight: 700;
    font-size: 14px;
  `,
  actions: css`
    width: 100%;
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  primaryBtn: css`
    width: 100%;
    height: 52px;
    font-size: 14px;
    border-radius: 16px;
    font-weight: 500;
  `,
  errorBox: css`
    width: 100%;
    margin-top: 20px;
    border-radius: 12px;
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
    color: ${token.colorErrorText};
    padding: 12px 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    line-height: 1.5;
    text-align: left;
    word-break: break-word;
  `,
}));

export function ForceUpdateModal() {
  const { t } = useTranslation("settings");
  const { styles } = useStyles();
  const modal = useUpdateStore((s) => s.forcedUpdateModal);
  const status = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const progress = useUpdateStore((s) => s.progress);
  const error = useUpdateStore((s) => s.error);
  const dismissForcedUpdateModal = useUpdateStore((s) => s.dismissForcedUpdateModal);
  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const installUpdate = useUpdateStore((s) => s.installUpdate);

  const primaryAction = useCallback(() => {
    if (status === "downloaded") { void installUpdate(); return; }
    if (status === "available") { void downloadUpdate(); return; }
    // After an error we retry by re-checking, which will re-emit
    // 'available' and let the user download/install again.
    void checkForUpdates();
  }, [status, checkForUpdates, downloadUpdate, installUpdate]);

  const primaryLabel = useMemo(() => {
    if (status === "downloaded") return t("updates.action.install");
    if (status === "available") return t("updates.action.download");
    if (status === "checking" || status === "downloading") {
      return status === "checking" ? t("updates.action.checking") : t("updates.action.downloading");
    }
    if (status === "error") return t("updates.forceModal.check");
    return t("updates.forceModal.check");
  }, [status, t]);

  const showProgress = status === "downloading" && progress != null;

  if (!modal) return null;

  const title = modal.title ?? t("updates.forceModal.titleDefault");
  const message = modal.message ?? (
    modal.reason === "below-minimum"
      ? t("updates.forceModal.belowMinimum")
      : t("updates.forceModal.newVersion")
  );

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-update-title"
    >
      <style>{`
        @keyframes float-illustration {
          0%, 100% { transform: scale(1.2) translateY(0px); }
          50% { transform: scale(1.2) translateY(-6px); }
        }
      `}</style>

      <div className={styles.cardWrap}>
        {!modal.blockDismiss && (
          <button type="button" onClick={() => dismissForcedUpdateModal()} className={styles.closeBtn}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}

        <div className={styles.card}>
          <div className={styles.illustrationArea}>
            <div
              style={{
                width: '100%',
                marginTop: '-30px',
                animation: 'float-illustration 4s ease-in-out infinite',
              }}
            >
              <img
                src={updateBg}
                alt="Update Illustration"
                className={styles.illustrationImg}
              />
            </div>
            <div className={styles.gradientMask} />
          </div>

          <div className={styles.body}>
            <h2 id="force-update-title" className={styles.title}>{title}</h2>
            <p className={styles.message}>{message}</p>

            {updateInfo?.version && (
              <span className={styles.versionBadge}>
                {t("updates.forceModal.target", { version: updateInfo.version })}
              </span>
            )}

            {showProgress && (
              <div className={styles.progressBox}>
                <div className={styles.progressHeader}>
                  <span className={styles.progressLabel}>{t("updates.action.downloading")}</span>
                  <span className={styles.progressPercent}>{Math.round(progress.percent)}%</span>
                </div>
                <Progress value={progress.percent} />
              </div>
            )}

            {status === "error" && error && (
              <div className={styles.errorBox} role="alert">
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            <div className={styles.actions}>
              <Button
                type="primary"
                className={styles.primaryBtn}
                onClick={primaryAction}
                disabled={status === "checking" || status === "downloading"}
              >
                {status === "checking" || status === "downloading" ? (
                  <>
                    <Loader2 style={{ marginRight: 8, width: 20, height: 20 }} className="animate-spin" />
                    {primaryLabel}
                  </>
                ) : (
                  <>
                    <ArrowUpCircle style={{ marginRight: 8, width: 20, height: 20 }} />
                    {primaryLabel}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
