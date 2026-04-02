import { Markdown } from '@lobehub/ui';
import { Brain, CheckCheck, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

function renderReasoningCard(payload: JizhiTextContent, item: HostJizhiMessageContentItem) {
  const reasonContent = payload.reasonContent?.trim() ?? '';
  if (!reasonContent) return null;

  const isThinking = payload.thinking === true;
  const durationLabel = formatThinkingDuration(payload.thinkingStart, payload.thinkingFinished);

  if (isThinking) {
    return (
      <div
        key={`${item.blockUUID}-reasoning`}
        className="overflow-hidden rounded-[24px] border border-[#CFE0FF] bg-[linear-gradient(180deg,#F8FBFF_0%,#EDF4FF_100%)] shadow-[0_10px_24px_rgba(38,103,216,0.06)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_100%)] dark:shadow-none"
      >
        <div className="flex items-center gap-2 border-b border-[#DCE8FF] px-4 py-3 text-[12px] font-medium text-[#2667D8] dark:border-white/10 dark:text-[#A9C6FF]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>极智正在思考</span>
        </div>
        <div className="whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-6 text-[#36527D] dark:text-white/70">
          {reasonContent}
        </div>
      </div>
    );
  }

  return (
    <details
      key={`${item.blockUUID}-reasoning`}
      open
      className="overflow-hidden rounded-[24px] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(248,250,252,0.92)_100%)] shadow-[0_10px_24px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.035)_100%)] dark:shadow-none"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-[12px] font-medium text-foreground/70">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
            <Brain className="h-3.5 w-3.5" />
          </span>
          <span>已完成思考</span>
        </span>
        {durationLabel ? (
          <span className="flex items-center gap-1 text-[11px] text-foreground/45">
            <CheckCheck className="h-3.5 w-3.5" />
            {durationLabel}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-black/5 px-4 py-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/70 dark:border-white/10">
        {reasonContent}
      </div>
    </details>
  );
}

function renderText(item: HostJizhiMessageContentItem) {
  const payload = parseItemContent<JizhiTextContent>(item);
  const content = payload?.content?.trim() ?? '';
  const reasoningCard = payload ? renderReasoningCard(payload, item) : null;

  if (!content && !reasoningCard) return null;

  return (
    <div key={item.blockUUID} className="space-y-3">
      {reasoningCard}
      {content ? (
        <div className="prose prose-sm max-w-none break-words text-[14px] leading-7 text-foreground dark:prose-invert prose-p:my-0 prose-pre:my-0 prose-headings:mb-3 prose-headings:mt-5 prose-ul:my-2 prose-ol:my-2 prose-li:my-1">
          <Markdown>{content}</Markdown>
        </div>
      ) : null}
    </div>
  );
}

function renderImages(item: HostJizhiMessageContentItem) {
  const payload = parseItemContent<JizhiImageContent>(item);
  const images = payload?.images ?? [];
  if (images.length === 0) return null;

  return (
    <div key={item.blockUUID} className="grid gap-3 sm:grid-cols-2">
      {images.map((image, index) => {
        const previewUrl = image.webp || image.imageUrl || '';
        const loading = image.status === 'processing';
        return (
          <a
            key={`${item.blockUUID}-${image.fileId ?? index}`}
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-[24px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.96)_100%)] shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08]"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="极智图片"
                className={cn(
                  'max-h-72 w-full object-cover',
                  loading && 'animate-pulse opacity-70',
                )}
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center text-foreground/45">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

function renderFiles(item: HostJizhiMessageContentItem) {
  const payload = parseItemContent<JizhiFileContent>(item);
  const files = payload?.files ?? [];
  if (files.length === 0) return null;

  return (
    <div key={item.blockUUID} className="grid gap-2">
      {files.map((file, index) => {
        const href = file.filePath || file.contentPath || '';
        return (
          <a
            key={`${item.blockUUID}-${file.fileId ?? index}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(248,250,252,0.96)_100%)] px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:border-black/12 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none dark:hover:bg-white/[0.08]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-black/5 dark:bg-white/10">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">
                {file.fileName || '未命名文件'}
              </span>
              <span className="block text-xs text-foreground/55">
                {formatFileSize(file.fileSize)}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function renderFallback(item: HostJizhiMessageContentItem) {
  return (
    <details
      key={item.blockUUID}
      className="rounded-[22px] border border-dashed border-black/10 bg-black/[0.02] p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
    >
      <summary className="cursor-pointer text-foreground/60">
        暂未适配的内容类型: {item.contentType}
      </summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-foreground/70">
        {item.content}
      </pre>
    </details>
  );
}

export function JizhiMessageContent({ message }: { message?: HostJizhiMessageContent }) {
  const items = message?.items ?? [];
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 text-[14px] leading-7">
      {items.map((item) => {
        if (item.contentType === 'text' || item.contentType === 'steps') {
          return renderText(item);
        }
        if (item.contentType === 'imageSet') {
          return renderImages(item);
        }
        if (item.contentType === 'fileSet') {
          return renderFiles(item);
        }
        return renderFallback(item);
      })}
    </div>
  );
}
