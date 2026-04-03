import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
    DEFAULT_LANGUAGE_CODE,
    SUPPORTED_LANGUAGE_CODES,
    resolveSupportedLanguage,
    type LanguageCode,
} from '../../shared/language';
import { NAMESPACES, resources } from './resources';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
] as const satisfies ReadonlyArray<{ code: LanguageCode; label: string }>;

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: resolveSupportedLanguage(
            typeof navigator !== 'undefined' ? navigator.language : undefined,
            DEFAULT_LANGUAGE_CODE,
        ),
        fallbackLng: DEFAULT_LANGUAGE_CODE,
        supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
        defaultNS: 'common',
        ns: [...NAMESPACES],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
