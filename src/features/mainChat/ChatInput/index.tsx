import { useEffect, useState } from 'react';
import { ChatInputProvider, type ChatInputProviderProps } from './ChatInputProvider';
import { DesktopChatInput } from './Desktop';
import { MobileChatInput } from './Mobile';
import { StoreUpdater } from './StoreUpdater';

export type MainChatInputProps = ChatInputProviderProps;

export function ChatInput(props: MainChatInputProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <ChatInputProvider {...props}>
      <StoreUpdater />
      {isMobile ? <MobileChatInput /> : <DesktopChatInput />}
    </ChatInputProvider>
  );
}
