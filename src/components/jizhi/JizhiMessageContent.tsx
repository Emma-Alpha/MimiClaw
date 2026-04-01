import { Markdown } from '@lobehub/ui';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  HostJizhiMessageContent,
  HostJizhiMessageContentItem,
} from '@/lib/jizhi-chat';

type JizhiTextContent = {
  content?: string;
  reasonContent?: string;
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

function renderText(item: HostJizhiMessageContentItem) {
  const payload = parseItemContent<JizhiTextContent>(item);
  const content = payload?.content?.trim() ?? '';
  const reasonContent = payload?.reasonContent?.trim() ?? '';

  if (!content && !reasonContent) return null;

  return (
    <div key={item.blockUUID} className="space-y-3">
      {reasonContent ? (
        <details className="rounded-2xl border border-black/5 bg-black/[0.03] p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <summary className="cursor-pointer text-xs text-foreground/55">
            推理过程
          </summary>
          <div className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/70">
            {reasonContent}
          </div>
        </details>
      ) : null}
      {content ? <Markdown>{content}</Markdown> : null}
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
            className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
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
            className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
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
      className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]"
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
    <div className="space-y-3">
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
