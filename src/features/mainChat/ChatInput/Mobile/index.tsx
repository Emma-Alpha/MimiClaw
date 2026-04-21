import { Block, Flexbox } from '@lobehub/ui';
import { ChatInputActionBar } from '../ActionBar';
import { InputEditor } from '../InputEditor';
import { RuntimeConfig } from '../RuntimeConfig';
import { SendArea } from '../SendArea';

export function MobileChatInput() {
  return (
    <div style={{ padding: '8px 12px 12px' }}>
      <Block style={{ borderRadius: 16, padding: 10 }}>
        <Flexbox gap={10}>
          <RuntimeConfig />
          <ChatInputActionBar />
          <InputEditor />
          <SendArea />
        </Flexbox>
      </Block>
    </div>
  );
}
