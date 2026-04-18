import semver from 'semver';

export type ParsedUpdatePolicy = {
  minimumVersion?: string;
  forceUpdateModalWhenAvailable?: boolean;
  allowDismiss?: boolean;
  title?: string;
  message?: string;
  learnMoreUrl?: string;
};

export type UpdateReleaseTier = 'patch' | 'minor' | 'major' | 'unknown';

export function parseUpdatePolicy(raw: unknown): ParsedUpdatePolicy | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out: ParsedUpdatePolicy = {};
  if (typeof o.minimumVersion === 'string' && o.minimumVersion.trim()) {
    out.minimumVersion = o.minimumVersion.trim();
  }
  if (o.forceUpdateModalWhenAvailable === true) {
    out.forceUpdateModalWhenAvailable = true;
  }
  if (o.allowDismiss === true) {
    out.allowDismiss = true;
  }
  if (typeof o.title === 'string' && o.title.trim()) {
    out.title = o.title.trim();
  }
  if (typeof o.message === 'string' && o.message.trim()) {
    out.message = o.message.trim();
  }
  if (typeof o.learnMoreUrl === 'string' && o.learnMoreUrl.startsWith('https:')) {
    out.learnMoreUrl = o.learnMoreUrl.trim();
  }
  return out;
}

/** Returns a semver-valid string or null if the version cannot be compared. */
export function comparableAppVersion(version: string): string | null {
  const cleaned = semver.clean(version.trim());
  return cleaned && semver.valid(cleaned) ? cleaned : null;
}

export function isVersionBelow(current: string, minimum: string): boolean {
  const a = comparableAppVersion(current);
  const b = comparableAppVersion(minimum);
  if (!a || !b) return false;
  return semver.lt(a, b);
}

export function getUpdateReleaseTier(current: string, target: string): UpdateReleaseTier | null {
  const from = comparableAppVersion(current);
  const to = comparableAppVersion(target);

  if (!from || !to) {
    return current.trim() === target.trim() ? null : 'unknown';
  }

  if (semver.eq(from, to)) return null;
  if (semver.major(from) !== semver.major(to)) return 'major';
  if (semver.minor(from) !== semver.minor(to)) return 'minor';
  if (semver.patch(from) !== semver.patch(to)) return 'patch';

  return 'unknown';
}
