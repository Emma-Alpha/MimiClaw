import { Center, Flexbox, Form, Highlighter, Markdown, Mermaid, SliderWithInput, highlighterThemes, mermaidThemes } from '@lobehub/ui';
import { Segmented } from 'antd';
import { memo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HighlighterProps, MermaidProps } from '@lobehub/ui';

import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';

const markdownSample = '这里是 LobeHub。从一句话开始，把目标说清楚就行';

const codeSample = `
const person = { name: "Alice", age: 30 };
type PersonType = typeof person;

type Animal = { name: string };
const dog = { name: "Buddy", breed: "Golden Retriever" } satisfies Animal;
`;

const mermaidSample = `sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice-)John: See you later!
`;

const transitionPreviewStyles = (mode: 'none' | 'fadeIn' | 'smooth') =>
  ({
    opacity: mode === 'none' ? 1 : undefined,
    transform: mode === 'smooth' ? 'translateY(0)' : undefined,
    transition: mode === 'none' ? 'none' : mode === 'fadeIn' ? 'opacity 0.25s ease' : 'transform 0.3s ease, opacity 0.3s ease',
  }) satisfies CSSProperties;

const ChatAppearance = memo(() => {
  const { t } = useTranslation('settings');
  const enableAutoScrollOnStreaming = useSettingsStore((state) => state.enableAutoScrollOnStreaming);
  const fontSize = useSettingsStore((state) => state.fontSize);
  const highlighterTheme = useSettingsStore((state) => state.highlighterTheme);
  const mermaidTheme = useSettingsStore((state) => state.mermaidTheme);
  const transitionMode = useSettingsStore((state) => state.transitionMode);
  const setEnableAutoScrollOnStreaming = useSettingsStore((state) => state.setEnableAutoScrollOnStreaming);
  const setFontSize = useSettingsStore((state) => state.setFontSize);
  const setHighlighterTheme = useSettingsStore((state) => state.setHighlighterTheme);
  const setMermaidTheme = useSettingsStore((state) => state.setMermaidTheme);
  const setTransitionMode = useSettingsStore((state) => state.setTransitionMode);

  return (
    <>
      <Form.Group
        collapsible={false}
        desc={t('appearance.chat.transitionMode.desc')}
        title={t('appearance.chat.transitionMode.title')}
        variant="filled"
        extra={
          <Segmented
            options={[
              { label: t('appearance.chat.transitionMode.none'), value: 'none' },
              { label: t('appearance.chat.transitionMode.fadeIn'), value: 'fadeIn' },
              { label: t('appearance.chat.transitionMode.smooth'), value: 'smooth' },
            ]}
            value={transitionMode}
            onChange={(value) => setTransitionMode(value as 'none' | 'fadeIn' | 'smooth')}
          />
        }
      >
        <div style={{ padding: '0 16px 16px' }}>
          <div
            style={{
              background: 'var(--ant-color-bg-container)',
              border: '1px solid var(--ant-color-border-secondary)',
              borderRadius: 16,
              padding: 20,
              ...transitionPreviewStyles(transitionMode),
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Features</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Key Highlights</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <div>🌐 Multi-model: GPT-4/Gemini/Ollama</div>
              <div>🖼️ Vision: <code>gpt-4-vision</code> integration</div>
              <div>🛠️ Plugins: Function Calling & real-time data</div>
            </div>
          </div>
        </div>
      </Form.Group>

      <Form.Group
        active={false}
        collapsible={false}
        desc={t('appearance.chat.autoScroll.desc')}
        title={t('appearance.chat.autoScroll.title')}
        variant="filled"
        extra={
          <Switch
            checked={enableAutoScrollOnStreaming}
            onChange={setEnableAutoScrollOnStreaming}
          />
        }
      >
        {null}
      </Form.Group>

      <Form.Group
        collapsible={false}
        desc={t('appearance.chat.fontSize.desc')}
        title={t('appearance.chat.fontSize.title')}
        variant="filled"
        extra={
          <SliderWithInput
            marks={{
              12: { label: 'A', style: { fontSize: 12, marginTop: 4 } },
              14: { label: t('appearance.chat.fontSize.standard'), style: { fontSize: 14, marginTop: 4 } },
              18: { label: 'A', style: { fontSize: 18, marginTop: 4 } },
            }}
            max={18}
            min={12}
            step={1}
            style={{ width: 240 }}
            value={fontSize}
            onChange={(value) => setFontSize(Number(value))}
          />
        }
      >
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 16, overflow: 'hidden' }}>
            <Center style={{ padding: 20 }}>
              <Markdown fontSize={fontSize} variant={'chat'}>
                {markdownSample}
              </Markdown>
            </Center>
          </div>
        </div>
      </Form.Group>

      <Form.Group
        collapsible={false}
        title={t('appearance.chat.highlighterTheme.title')}
        variant="filled"
        extra={
          <Select
            options={highlighterThemes.map((item) => ({
              label: item.displayName,
              value: item.id,
            }))}
            style={{ minWidth: 220 }}
            value={highlighterTheme}
            onChange={(value) => setHighlighterTheme(value as string)}
          />
        }
      >
        <div style={{ padding: '0 16px 16px' }}>
          <Highlighter
            copyable={false}
            language={'ts'}
            showLanguage={false}
            theme={highlighterTheme as NonNullable<HighlighterProps['theme']>}
          >
            {codeSample}
          </Highlighter>
        </div>
      </Form.Group>

      <Form.Group
        collapsible={false}
        title={t('appearance.chat.mermaidTheme.title')}
        variant="filled"
        extra={
          <Select
            options={mermaidThemes.map((item) => ({
              label: item.displayName,
              value: item.id,
            }))}
            style={{ minWidth: 220 }}
            value={mermaidTheme}
            onChange={(value) => setMermaidTheme(value as string)}
          />
        }
      >
        <div style={{ padding: '0 16px 16px' }}>
          <Center style={{ minHeight: 280 }}>
            <Flexbox width={480}>
              <Mermaid theme={mermaidTheme as NonNullable<MermaidProps['theme']>}>
                {mermaidSample}
              </Mermaid>
            </Flexbox>
          </Center>
        </div>
      </Form.Group>
    </>
  );
});

export default ChatAppearance;
