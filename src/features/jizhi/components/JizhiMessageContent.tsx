import { Brain, CheckCheck, FileText, Image as ImageIcon, Loader2, Terminal } from 'lucide-react';
import { createStyles } from 'antd-style';
import { MessageMarkdown } from '@/components/MessageMarkdown';
import {
  useEnhancedMarkdownProps,
  type EnhancedMarkdownProps,
} from '@/lib/markdown-enhancements';
import type {
  HostJizhiMessageContent,
  HostJizhiMessageContentItem,
} from '@/lib/jizhi-chat';

type JizhiTextContent = {
  content?: string;
  reasonContent?: string;
  thinking?: boolean;
  thinkingStart?: number;
  thinkingFinished?: number;
};

type JizhiImageContent = {
  images?: Array<{
    fileId?: string | number;
    webp?: string;
    imageUrl?: string;
    width?: number;
    height?: number;
    status?: string;
    error?: string;
  }>;
};

type JizhiFileContent = {
  files?: Array<{
    fileId?: number;
    filePath?: string;
    contentPath?: string;
    fileName?: string;
    fileSize?: number;
  }>;
};

const useStyles = createStyles(({ token, css }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    font-size: 14px;
    line-height: 1.75;
  `,
  // Reasoning card - thinking state
  reasoningThinking: css`
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid #CFE0FF;
    background: linear-gradient(180deg, #F8FBFF 0%, #EDF4FF 100%);
    box-shadow: 0 10px 24px rgba(38, 103, 216, 0.06);
  `,
  reasoningThinkingHeader: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #DCE8FF;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 500;
    color: #2667D8;
  `,
  reasoningThinkingBody: css`
    white-space: pre-wrap;
    word-break: break-word;
    padding: 12px 16px;
    font-size: 13px;
    line-height: 1.5;
    color: #36527D;
  `,
  // Reasoning card - done state (details/summary)
  reasoningDone: css`
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(0,0,0,0.06);
    background: linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(248,250,252,0.92) 100%);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  `,
  reasoningDoneSummary: css`
    display: flex;
    cursor: pointer;
    list-style: none;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    text-align: left;
  `,
  reasoningDoneSummaryLeft: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: ${token.colorTextSecondary};
  `,
  reasoningDoneSummaryIcon: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.05);
  `,
  reasoningDoneSummaryRight: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: ${token.colorTextTertiary};
  `,
  reasoningDoneBody: css`
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding: 12px 16px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.5;
    color: ${token.colorTextSecondary};
  `,
  // Text block
  textBlock: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  proseWrapper: css`
    word-break: break-word;
    font-size: 14px;
    line-height: 1.75;
    color: ${token.colorText};
  `,
  // Image grid
  imageGrid: css`
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, 1fr);
  `,
  imageCard: css`
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(0,0,0,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.96) 100%);
    box-shadow: 0 10px 28px rgba(15,23,42,0.05);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    text-decoration: none;
    display: block;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
    }
  `,
  imageCardImg: css`
    max-height: 288px;
    width: 100%;
    object-fit: cover;
  `,
  imageCardImgLoading: css`
    animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;
    opacity: 0.7;
    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }
  `,
  imageCardEmpty: css`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    color: ${token.colorTextTertiary};
  `,
  // File grid
  fileGrid: css`
    display: grid;
    gap: 8px;
  `,
  fileCard: css`
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 22px;
    border: 1px solid rgba(0,0,0,0.08);
    background: linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.96) 100%);
    padding: 12px 14px;
    box-shadow: 0 8px 20px rgba(15,23,42,0.04);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    text-decoration: none;

    &:hover {
      border-color: rgba(0,0,0,0.12);
      box-shadow: 0 12px 28px rgba(15,23,42,0.07);
    }
  `,
  fileIconWrap: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: rgba(0,0,0,0.05);
    flex-shrink: 0;
  `,
  fileMeta: css`
    min-width: 0;
    flex: 1;
  `,
  fileName: css`
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--mimi-font-size-sm);
    color: ${token.colorText};
  `,
  fileSize: css`
    display: block;
    font-size: var(--mimi-font-size-xs);
    color: ${token.colorTextTertiary};
  `,
  // Debug block
  debugBlock: css`
    overflow: hidden;
    border-radius: 20px;
    border: 1px solid rgba(217,180,103,0.4);
    background: rgba(255,251,235,0.3);
  `,
  debugSummary: css`
    display: flex;
    cursor: pointer;
    list-style: none;
    select: none;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
  `,
  debugIconWrap: css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    border-radius: 6px;
    background: rgba(217,180,103,0.25);
  `,
  debugTitle: css`
    font-size: 11.5px;
    font-weight: 600;
    color: #92620A;
  `,
  debugBadge: css`
    margin-left: 4px;
    border-radius: 999px;
    background: rgba(217,180,103,0.25);
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 500;
    color: #92620A;
  `,
  debugExpandHint: css`
    margin-left: auto;
    font-size: 10.5px;
    color: ${token.colorTextTertiary};
  `,
  debugSectionsWrap: css`
    border-top: 1px solid rgba(217,180,103,0.2);
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  debugSection: css`
    overflow: hidden;
    border-radius: 14px;
    border: 1px solid rgba(0,0,0,0.06);
  `,
  debugSectionSummary: css`
    display: flex;
    cursor: pointer;
    list-style: none;
    select: none;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
  `,
  debugSectionBody: css`
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    padding: 8px 12px 12px;
    font-size: 10.5px;
    line-height: 1.6;
    font-family: ${token.fontFamilyCode};
  `,
  // Fallback block
  fallbackBlock: css`
    border-radius: 22px;
    border: 1px dashed ${token.colorBorderSecondary};
    background: ${token.colorFillTertiary};
    padding: 12px;
    font-size: var(--mimi-font-size-sm);
  `,
  fallbackSummary: css`
    cursor: pointer;
    color: ${token.colorTextSecondary};
  `,
  fallbackBody: css`
    margin-top: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    font-size: 11px;
    line-height: 1.25;
    color: ${token.colorTextSecondary};
  `,
}));

function parseItemContent<T>(item: HostJizhiMessageContentItem): T | null {
  try {
    return JSON.parse(item.content) as T;
  } catch {
    return null;
  }
}

function formatFileSize(size?: number): string {
  if (typeof size !== 'number' || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatThinkingDuration(start?: number, end?: number): string {
  if (!start || !end || end <= start) return '';
  const durationSeconds = Math.max(1, Math.round((end - start) / 1000));
  return `${durationSeconds} 秒`;
}

type SectionStyle = { badge: string; border: string; bg: string; text: string; titleBg: string };

const DEBUG_SECTION_STYLES: Record<string, SectionStyle> = {
  '完整请求数据': {
    badge: 'bg-sky-100 text-sky-700',
    border: 'border-sky-100',
    bg: 'bg-sky-50/60',
    text: 'text-sky-900',
    titleBg: 'bg-sky-50',
  },
  '系统提示词': {
    badge: 'bg-violet-100 text-violet-700',
    border: 'border-violet-100',
    bg: 'bg-violet-50/60',
    text: 'text-violet-900',
    titleBg: 'bg-violet-50',
  },
};
const DEFAULT_DEBUG_SECTION_STYLE: SectionStyle = {
  badge: '',
  border: '',
  bg: '',
  text: '',
  titleBg: '',
};

type DebugSection = { title: string; content: string };

function parseDebugSections(reasonContent: string): DebugSection[] {
  const matches = [...reasonContent.matchAll(/^# (.+?)\n([\s\S]*?)(?=\n^# |\s*$)/gm)];
  const sections: DebugSection[] = matches
    .map((match) => {
      const title = match[1]?.trim() ?? '';
      const raw = (match[2] ?? '').trim()
        .replace(/^````(?:json)?\s*\n?/, '')
        .replace(/\n?````\s*$/, '')
        .trim();
      return { title, content: raw };
    })
    .filter((s) => s.title.length > 0);

  if (sections.length === 0 && reasonContent.trim()) {
    sections.push({ title: '详情', content: reasonContent.trim() });
  }
  return sections;
}

function isDebugBlock(item: HostJizhiMessageContentItem): boolean {
  return item.blockUUID.startsWith('block_debug_') || item.sseMode === 'result';
}

function renderReasoningCard(
  payload: JizhiTextContent,
  item: HostJizhiMessageContentItem,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  const reasonContent = payload.reasonContent?.trim() ?? '';
  if (!reasonContent) return null;

  const isThinking = payload.thinking === true;
  const durationLabel = formatThinkingDuration(payload.thinkingStart, payload.thinkingFinished);

  if (isThinking) {
    return (
      <div key={`${item.blockUUID}-reasoning`} className={styles.reasoningThinking}>
        <div className={styles.reasoningThinkingHeader}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          <span>极智正在思考</span>
        </div>
        <div className={styles.reasoningThinkingBody}>{reasonContent}</div>
      </div>
    );
  }

  return (
    <details key={`${item.blockUUID}-reasoning`} open className={styles.reasoningDone}>
      <summary className={styles.reasoningDoneSummary}>
        <span className={styles.reasoningDoneSummaryLeft}>
          <span className={styles.reasoningDoneSummaryIcon}>
            <Brain style={{ width: 14, height: 14 }} />
          </span>
          <span>已完成思考</span>
        </span>
        {durationLabel ? (
          <span className={styles.reasoningDoneSummaryRight}>
            <CheckCheck style={{ width: 14, height: 14 }} />
            {durationLabel}
          </span>
        ) : null}
      </summary>
      <div className={styles.reasoningDoneBody}>{reasonContent}</div>
    </details>
  );
}

function renderText(
  item: HostJizhiMessageContentItem,
  markdownProps: EnhancedMarkdownProps,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  const payload = parseItemContent<JizhiTextContent>(item);
  const content = payload?.content?.trim() ?? '';
  const reasoningCard = payload ? renderReasoningCard(payload, item, styles) : null;

  if (!content && !reasoningCard) return null;

  return (
    <div key={item.blockUUID} className={styles.textBlock}>
      {reasoningCard}
      {content ? (
        <div className={styles.proseWrapper}>
          <MessageMarkdown markdownProps={markdownProps}>{content}</MessageMarkdown>
        </div>
      ) : null}
    </div>
  );
}

function renderImages(
  item: HostJizhiMessageContentItem,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  const payload = parseItemContent<JizhiImageContent>(item);
  const images = payload?.images ?? [];
  if (images.length === 0) return null;

  return (
    <div key={item.blockUUID} className={styles.imageGrid}>
      {images.map((image, index) => {
        const previewUrl = image.webp || image.imageUrl || '';
        const loading = image.status === 'processing';
        return (
          <a
            key={`${item.blockUUID}-${image.fileId ?? index}`}
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.imageCard}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="极智图片"
                className={loading ? styles.imageCardImgLoading : styles.imageCardImg}
              />
            ) : (
              <div className={styles.imageCardEmpty}>
                <ImageIcon style={{ width: 20, height: 20 }} />
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

function renderFiles(
  item: HostJizhiMessageContentItem,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  const payload = parseItemContent<JizhiFileContent>(item);
  const files = payload?.files ?? [];
  if (files.length === 0) return null;

  return (
    <div key={item.blockUUID} className={styles.fileGrid}>
      {files.map((file, index) => {
        const href = file.filePath || file.contentPath || '';
        return (
          <a
            key={`${item.blockUUID}-${file.fileId ?? index}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={styles.fileCard}
          >
            <span className={styles.fileIconWrap}>
              <FileText style={{ width: 16, height: 16 }} />
            </span>
            <span className={styles.fileMeta}>
              <span className={styles.fileName}>{file.fileName || '未命名文件'}</span>
              <span className={styles.fileSize}>{formatFileSize(file.fileSize)}</span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function renderDebugBlock(
  item: HostJizhiMessageContentItem,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  const payload = parseItemContent<JizhiTextContent>(item);
  const reasonContent = payload?.reasonContent?.trim() ?? '';
  if (!reasonContent) return null;

  const sections = parseDebugSections(reasonContent);
  void DEBUG_SECTION_STYLES;
  void DEFAULT_DEBUG_SECTION_STYLE;

  return (
    <details key={item.blockUUID} className={styles.debugBlock}>
      <summary className={styles.debugSummary}>
        <span className={styles.debugIconWrap}>
          <Terminal style={{ width: 12, height: 12, color: '#92620A' }} />
        </span>
        <span className={styles.debugTitle}>调试信息</span>
        <span className={styles.debugBadge}>{sections.length} 段</span>
        <span className={styles.debugExpandHint}>展开</span>
      </summary>
      <div className={styles.debugSectionsWrap}>
        {sections.map((section) => (
          <details key={section.title} className={styles.debugSection}>
            <summary className={styles.debugSectionSummary}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(0,0,0,0.05)' }}>
                {section.title}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ant-color-text-tertiary)' }}>展开</span>
            </summary>
            <pre className={styles.debugSectionBody}>{section.content}</pre>
          </details>
        ))}
      </div>
    </details>
  );
}

function renderFallback(
  item: HostJizhiMessageContentItem,
  styles: ReturnType<typeof useStyles>['styles'],
) {
  return (
    <details key={item.blockUUID} className={styles.fallbackBlock}>
      <summary className={styles.fallbackSummary}>
        暂未适配的内容类型: {item.contentType}
      </summary>
      <pre className={styles.fallbackBody}>{item.content}</pre>
    </details>
  );
}

export function JizhiMessageContent({ message }: { message?: HostJizhiMessageContent }) {
  const markdownProps = useEnhancedMarkdownProps();
  const { styles } = useStyles();
  const items = message?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className={styles.root}>
      {items.map((item) => {
        if ((item.contentType === 'text' || item.contentType === 'steps') && isDebugBlock(item)) {
          return renderDebugBlock(item, styles);
        }
        if (item.contentType === 'text' || item.contentType === 'steps') {
          return renderText(item, markdownProps, styles);
        }
        if (item.contentType === 'imageSet') {
          return renderImages(item, styles);
        }
        if (item.contentType === 'fileSet') {
          return renderFiles(item, styles);
        }
        return renderFallback(item, styles);
      })}
    </div>
  );
}
