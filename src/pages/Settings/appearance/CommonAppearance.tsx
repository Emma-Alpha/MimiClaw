import { Form, Icon, ImageSelect } from '@lobehub/ui';
import { Segmented } from 'antd';
import { Ban, Gauge, Monitor, Moon, Sun, Waves } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const themePreview = (mode: 'light' | 'dark' | 'system') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="60" viewBox="0 0 100 60" fill="none">
      <rect width="100" height="60" rx="12" fill="${mode === 'dark' ? '#171717' : '#F6F6F4'}"/>
      <rect x="0" y="0" width="100" height="16" rx="12" fill="${mode === 'dark' ? '#111827' : '#2F80FF'}"/>
      <circle cx="12" cy="8" r="2" fill="${mode === 'system' ? '#FFD84D' : mode === 'dark' ? '#9CA3AF' : '#FF8A34'}"/>
      <circle cx="20" cy="8" r="2" fill="${mode === 'system' ? '#B7E34B' : mode === 'dark' ? '#6B7280' : '#FFD84D'}"/>
      <circle cx="28" cy="8" r="2" fill="${mode === 'system' ? '#3B82F6' : mode === 'dark' ? '#4B5563' : '#49CC68'}"/>
      <rect x="8" y="24" width="18" height="28" rx="4" fill="${mode === 'dark' ? '#20242D' : '#FFFFFF'}" stroke="${mode === 'dark' ? '#30343D' : '#E5E7EB'}"/>
      <rect x="32" y="24" width="48" height="18" rx="4" fill="${mode === 'dark' ? '#20242D' : '#FFFFFF'}" stroke="${mode === 'dark' ? '#30343D' : '#E5E7EB'}"/>
      <rect x="54" y="46" width="20" height="8" rx="4" fill="${mode === 'dark' ? '#374151' : '#111827'}"/>
      ${mode === 'system' ? '<rect x="50" y="0" width="50" height="60" rx="12" fill="#111827" opacity="0.95"/>' : ''}
    </svg>
  `)}`;

const CommonAppearance = memo(() => {
  const { t } = useTranslation('settings');
  const {
    animationMode,
    contextMenuMode,
    language,
    launchAtStartup,
    responseLanguage,
    setAnimationMode,
    setContextMenuMode,
    setLanguage,
    setLaunchAtStartup,
    setResponseLanguage,
    setTheme,
    theme,
  } = useSettingsStore();

  return (
    <Form
      collapsible={false}
      initialValues={{
        animationMode,
        contextMenuMode,
        language,
        launchAtStartup,
        responseLanguage,
        theme,
      }}
      items={[
        {
          title: t('appearance.common.title'),
          children: [
            {
              children: (
                <ImageSelect
                  height={60}
                  value={theme}
                  width={100}
                  options={[
                    { icon: Sun, img: themePreview('light'), label: t('appearance.light'), value: 'light' },
                    { icon: Moon, img: themePreview('dark'), label: t('appearance.dark'), value: 'dark' },
                    { icon: Monitor, img: themePreview('system'), label: t('appearance.system'), value: 'system' },
                  ]}
                  onChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                />
              ),
              label: t('appearance.theme'),
              minWidth: undefined,
            },
            {
              children: (
                <Select
                  options={SUPPORTED_LANGUAGES.map((lang) => ({
                    label: lang.label,
                    value: lang.code,
                  }))}
                  value={language}
                  style={{ width: 220 }}
                  onChange={(value) => setLanguage(value as string)}
                />
              ),
              label: t('appearance.language'),
              minWidth: undefined,
            },
            {
              children: (
                <Segmented
                  options={[
                    {
                      icon: <Icon icon={Ban} size={16} />,
                      label: t('appearance.animationMode.disabled'),
                      value: 'disabled',
                    },
                    {
                      icon: <Icon icon={Gauge} size={16} />,
                      label: t('appearance.animationMode.agile'),
                      value: 'agile',
                    },
                    {
                      icon: <Icon icon={Waves} size={16} />,
                      label: t('appearance.animationMode.elegant'),
                      value: 'elegant',
                    },
                  ]}
                  value={animationMode}
                  onChange={(value) => setAnimationMode(value as 'disabled' | 'agile' | 'elegant')}
                />
              ),
              desc: t('appearance.animationMode.desc'),
              label: t('appearance.animationMode.title'),
              minWidth: undefined,
            },
            {
              children: (
                <Segmented
                  options={[
                    {
                      icon: <Icon icon={Ban} size={16} />,
                      label: t('appearance.contextMenuMode.disabled'),
                      value: 'disabled',
                    },
                    {
                      icon: <Icon icon={Monitor} size={16} />,
                      label: t('appearance.contextMenuMode.default'),
                      value: 'default',
                    },
                  ]}
                  value={contextMenuMode}
                  onChange={(value) => setContextMenuMode(value as 'disabled' | 'default')}
                />
              ),
              desc: t('appearance.contextMenuMode.desc'),
              label: t('appearance.contextMenuMode.title'),
              minWidth: undefined,
            },
            {
              children: (
                <Select
                  allowClear
                  options={SUPPORTED_LANGUAGES.map((lang) => ({
                    label: lang.label,
                    value: lang.code,
                  }))}
                  value={responseLanguage || undefined}
                  style={{ width: 220 }}
                  onChange={(value) => setResponseLanguage((value as string | undefined) ?? '')}
                />
              ),
              desc: t('appearance.responseLanguage.desc'),
              label: t('appearance.responseLanguage.title'),
              minWidth: undefined,
            },
            {
              children: (
                <Select
                  options={[
                    {
                      label: t('appearance.launchAtStartupDisabled'),
                      value: 'disabled',
                    },
                    {
                      label: t('appearance.launchAtStartupEnabled'),
                      value: 'enabled',
                    },
                  ]}
                  value={launchAtStartup ? 'enabled' : 'disabled'}
                  style={{ width: 220 }}
                  onChange={(value) => setLaunchAtStartup(value === 'enabled')}
                />
              ),
              desc: t('appearance.launchAtStartupDesc'),
              label: t('appearance.launchAtStartup'),
              minWidth: undefined,
            },
          ],
        },
      ]}
      itemsType="group"
      variant="filled"
    />
  );
});

export default CommonAppearance;
