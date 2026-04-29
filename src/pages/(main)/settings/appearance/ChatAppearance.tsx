import { Center, Flexbox, Form, Highlighter, Markdown, Mermaid, SliderWithInput, highlighterThemes, mermaidThemes } from '@lobehub/ui';
import { Segmented } from 'antd';
import { memo, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HighlighterProps, MermaidProps } from '@lobehub/ui';

import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { TransitionMode } from '@/stores/settings';
import { useSettingsStore } from '@/stores/settings';

const markdownSample = '这里是 LobeHub。从一句话开始，把目标说清楚就行';
const transitionMarkdownSample = `
### Features

**Key Highlights**
- Multi-model: GPT-4/Gemini/Ollama
- Vision: \`gpt-4-vision\` integration
- Plugins: Function Calling & real-time data
`;

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

const STREAM_CHUNK_SIZE = 4;
const STREAM_INTERVAL = 25;

interface ChatTransitionPreviewProps {
  mode: TransitionMode;
}

const transitionPreviewStyles = (mode: TransitionMode, isVisible: boolean) =>
  ({
    opacity: mode === 'none' || isVisible ? 1 : 0,
    transform: mode === 'smooth' ? (isVisible ? 'translateY(0)' : 'translateY(8px)') : undefined,
    transition:
      mode === 'none'
        ? 'none'
        : mode === 'fadeIn'
          ? 'opacity 0.25s ease'
          : 'transform 0.3s ease, opacity 0.3s ease',
  }) satisfies CSSProperties;

const ChatTransitionPreview = memo<ChatTransitionPreviewProps>(({ mode }) => {
  const [streamedContent, setStreamedContent] = useState(
    mode === 'none' ? transitionMarkdownSample : '',
  );
  const [isVisible, setIsVisible] = useState(mode === 'none');

  useEffect(() => {
    if (mode === 'none') return;

    const frameId = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    let currentPosition = 0;
    const intervalId = window.setInterval(() => {
      currentPosition += STREAM_CHUNK_SIZE;
      const nextContent = transitionMarkdownSample.slice(0, currentPosition);
      setStreamedContent(nextContent);

      if (currentPosition >= transitionMarkdownSample.length) {
        window.clearInterval(intervalId);
      }
    }, STREAM_INTERVAL);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(intervalId);
    };
  }, [mode]);

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div
        style={{
          background: 'var(--ant-color-bg-container)',
          border: '1px solid var(--ant-color-border-secondary)',
          borderRadius: 16,
          minHeight: 180,
          padding: 20,
          ...transitionPreviewStyles(mode, isVisible),
        }}
      >
        <Markdown animated={mode === 'fadeIn'} variant={'chat'}>
          {streamedContent || ' '}
        </Markdown>
      </div>
    </div>
  );
});

const HighlighterPreview = memo(({ theme }: { theme: NonNullable<HighlighterProps['theme']> }) => {
  return (
    <Highlighter copyable={false} language={'ts'} showLanguage={false} theme={theme}>
      {codeSample}
    </Highlighter>
  );
});

const MermaidPreview = memo(({ theme }: { theme: NonNullable<MermaidProps['theme']> }) => {
  return (
    <Center style={{ minHeight: 280 }}>
      <Flexbox width={480}>
        <Mermaid theme={theme}>{mermaidSample}</Mermaid>
      </Flexbox>
    </Center>
  );
});

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
            onChange={(value) => setTransitionMode(value as TransitionMode)}
          />
        }
      >
        <ChatTransitionPreview key={transitionMode} mode={transitionMode} />
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
            <Center
              style={{
                '--mimi-markdown-font-size-override': `${fontSize}px`,
                padding: 20,
              } as CSSProperties}
            >
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
          <HighlighterPreview
            key={highlighterTheme}
            theme={highlighterTheme as NonNullable<HighlighterProps['theme']>}
          />
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
          <MermaidPreview
            key={mermaidTheme}
            theme={mermaidTheme as NonNullable<MermaidProps['theme']>}
          />
        </div>
      </Form.Group>
    </>
  );
});

export default ChatAppearance;
