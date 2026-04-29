import { Flexbox, Form } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { NeutralColors, PrimaryColors } from '@4399ywkf/theme-system';

import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';

import Preview from './Preview';
import { ThemeSwatchesNeutral, ThemeSwatchesPrimary } from './ThemeSwatches';

const ApplicationAppearance = memo(() => {
  const { t } = useTranslation('settings');
  const neutralColor = useSettingsStore((state) => state.neutralColor);
  const primaryColor = useSettingsStore((state) => state.primaryColor);
  const translucentSidebar = useSettingsStore((state) => state.translucentSidebar);
  const setNeutralColor = useSettingsStore((state) => state.setNeutralColor);
  const setPrimaryColor = useSettingsStore((state) => state.setPrimaryColor);
  const setTranslucentSidebar = useSettingsStore((state) => state.setTranslucentSidebar);

  return (
    <>
      <Form.Group
        collapsible={false}
        title={t('appearance.app.title')}
        variant="filled"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 16px 16px' }}>
          <div style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('appearance.app.paletteTitle')}</div>
            </div>
            <Preview />
          </div>

          <Flexbox horizontal align={'center'} justify={'space-between'} gap={16}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('appearance.primaryColor.title')}</div>
              <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12, marginTop: 4 }}>
                {t('appearance.primaryColor.desc')}
              </div>
            </div>
            <ThemeSwatchesPrimary
              value={primaryColor as PrimaryColors | undefined}
              onChange={setPrimaryColor}
            />
          </Flexbox>

          <Flexbox horizontal align={'center'} justify={'space-between'} gap={16}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('appearance.neutralColor.title')}</div>
              <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12, marginTop: 4 }}>
                {t('appearance.neutralColor.desc')}
              </div>
            </div>
            <ThemeSwatchesNeutral
              value={neutralColor as NeutralColors | undefined}
              onChange={setNeutralColor}
            />
          </Flexbox>
        </div>
      </Form.Group>

      <Form.Group
        active={false}
        collapsible={false}
        desc={t('appearance.translucentSidebar.desc')}
        title={t('appearance.translucentSidebar.title')}
        variant="filled"
        extra={(
          <Switch
            checked={translucentSidebar}
            onChange={setTranslucentSidebar}
          />
        )}
      >
        {null}
      </Form.Group>
    </>
  );
});

export default ApplicationAppearance;
