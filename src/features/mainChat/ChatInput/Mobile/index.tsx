import { Flexbox } from '@lobehub/ui';
import { ChatInput, ChatInputActionBar } from '@lobehub/editor/react';
import { ChatInputActionBar as MimiActionBar } from '../ActionBar';
import { InputEditor } from '../InputEditor';
import { RuntimeConfig } from '../RuntimeConfig';
import { SendArea } from '../SendArea';
import { useChatInputContext } from '../ChatInputProvider';

export function MobileChatInput() {
  const { leftContent } = useChatInputContext();
  return (
    <div style={{ padding: '8px 12px 12px' }}>
      <Flexbox gap={6}>
        <ChatInput
          footer={
            <ChatInputActionBar
              left={leftContent ?? <MimiActionBar />}
              right={<SendArea />}
            />
          }
          maxHeight={240}
          minHeight={36}
        >
          <InputEditor />
        </ChatInput>
        <RuntimeConfig />
      </Flexbox>
    </div>
  );
}
