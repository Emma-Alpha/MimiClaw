import { Form, Icon, ImageSelect } from '@lobehub/ui';
import { Segmented } from 'antd';
import { Ban, Gauge, Monitor, Moon, Sun, Waves } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import themeAutoImage from '@/assets/settings/theme_auto.webp';
import themeDarkImage from '@/assets/settings/theme_dark.webp';
import themeLightImage from '@/assets/settings/theme_light.webp';

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
                    { icon: Sun, img: themeLightImage, label: t('appearance.light'), value: 'light' },
                    { icon: Moon, img: themeDarkImage, label: t('appearance.dark'), value: 'dark' },
                    { icon: Monitor, img: themeAutoImage, label: t('appearance.system'), value: 'system' },
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
