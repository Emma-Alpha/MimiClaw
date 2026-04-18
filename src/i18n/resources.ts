import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES,
  type LanguageCode,
} from '../../shared/language';
import defaultResources from './locales/default';

export const NAMESPACES = [
  'common',
  'settings',
  'dashboard',
  'chat',
  'channels',
  'agents',
  'plugins',
  'skills',
  'cron',
  'setup',
] as const;

type Namespace = (typeof NAMESPACES)[number];
type TranslationValue =
  | string
  | number
  | boolean
  | null
  | TranslationObject
  | TranslationValue[];

type TranslationObject = {
  [key: string]: TranslationValue;
};

type LocaleResources = Record<Namespace, TranslationObject>;
type LocaleOverrides = Partial<Record<Namespace, TranslationObject>>;

const localeModules = import.meta.glob<{ default: TranslationObject }>('./locales/*/*.json', {
  eager: true,
});

function isPlainObject(value: unknown): value is TranslationObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base: TranslationObject, override?: TranslationObject): TranslationObject {
  if (!override) {
    return { ...base };
  }

  const merged: TranslationObject = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const currentValue = merged[key];
    merged[key] =
      isPlainObject(currentValue) && isPlainObject(value)
        ? deepMerge(currentValue, value)
        : value;
  }

  return merged;
}

function readLocaleOverrides(locale: string): LocaleOverrides {
  const overrides: LocaleOverrides = {};

  for (const [modulePath, moduleValue] of Object.entries(localeModules)) {
    const match = modulePath.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
    if (!match) {
      continue;
    }

    const [, moduleLocale, namespace] = match;
    if (moduleLocale !== locale || !NAMESPACES.includes(namespace as Namespace)) {
      continue;
    }

    overrides[namespace as Namespace] = moduleValue.default;
  }

  return overrides;
}

function createLocaleResources(locale: LanguageCode): LocaleResources {
  const overrides =
    locale === DEFAULT_LANGUAGE_CODE ? undefined : readLocaleOverrides(locale);

  return Object.fromEntries(
    NAMESPACES.map((namespace) => [
      namespace,
      deepMerge(defaultResources[namespace], overrides?.[namespace]),
    ]),
  ) as LocaleResources;
}

export const resources = Object.fromEntries(
  SUPPORTED_LANGUAGE_CODES.map((locale) => [locale, createLocaleResources(locale)]),
) as Record<LanguageCode, LocaleResources>;
