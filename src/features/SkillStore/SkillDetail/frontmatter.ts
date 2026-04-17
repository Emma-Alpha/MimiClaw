export function extractFrontmatterField(markdown: string, key: string): string | undefined {
  const frontmatterMatch = markdown.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return undefined;
  const body = frontmatterMatch[1];
  const matcher = new RegExp(`^\\s*${key}\\s*:\\s*["']?([^"'\\n]+)["']?\\s*$`, 'm');
  const matched = body.match(matcher);
  return matched?.[1]?.trim();
}

export function normalizeSkillIcon(rawIcon: string | undefined): string | undefined {
  if (!rawIcon) return undefined;
  const trimmed = rawIcon.trim();
  if (!trimmed) return undefined;

  // support YAML value like: icon: ![logo](https://example.com/logo.png)
  const markdownImageMatch = trimmed.match(/^!\[[^\]]*]\((.+)\)$/);
  if (markdownImageMatch) {
    const target = markdownImageMatch[1]?.trim();
    return target || undefined;
  }

  return trimmed;
}

const DIRECT_ICON_RE = /^(https?:\/\/|data:image\/|blob:|file:\/\/)/i;
const WINDOWS_ABS_PATH_RE = /^[a-zA-Z]:[\\/]/;

function toFileUrl(pathLike: string): string {
  const normalized = pathLike.replaceAll('\\', '/');
  if (normalized.startsWith('file://')) return normalized;
  if (WINDOWS_ABS_PATH_RE.test(pathLike)) {
    return `file:///${normalized}`;
  }
  if (normalized.startsWith('/')) {
    return `file://${normalized}`;
  }
  return `file://${normalized}`;
}

function toFileBaseUrl(pathLike: string): string {
  const fileUrl = toFileUrl(pathLike);
  return fileUrl.endsWith('/') ? fileUrl : `${fileUrl}/`;
}

export function resolveSkillIcon(iconValue: string | undefined, baseDir?: string): string | undefined {
  const normalizedIcon = normalizeSkillIcon(iconValue);
  if (!normalizedIcon) return undefined;
  if (DIRECT_ICON_RE.test(normalizedIcon)) return normalizedIcon;
  if (WINDOWS_ABS_PATH_RE.test(normalizedIcon) || normalizedIcon.startsWith('/')) {
    return toFileUrl(normalizedIcon);
  }
  if ((normalizedIcon.startsWith('./') || normalizedIcon.startsWith('../')) && baseDir) {
    try {
      return new URL(normalizedIcon, toFileBaseUrl(baseDir)).toString();
    } catch {
      return normalizedIcon;
    }
  }
  return normalizedIcon;
}
