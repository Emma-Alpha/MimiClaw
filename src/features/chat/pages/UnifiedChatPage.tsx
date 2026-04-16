import { Navigate, useParams } from 'react-router-dom';
import { Chat as OpenClawChat } from '../modes/openclaw';
import { JizhiChat } from '../modes/jizhi';
import { XiaojiuChat } from '../modes/xiaojiu';
import { VoiceChatHistory } from '../modes/voice';

export type UnifiedChatKind = 'openclaw' | 'xiaojiu' | 'jizhi' | 'voice';

function normalizeKind(kind?: string): UnifiedChatKind | null {
  if (!kind || kind === 'openclaw' || kind === 'xiaojiu' || kind === 'jizhi' || kind === 'voice') {
    return (kind ?? 'openclaw') as UnifiedChatKind;
  }
  return null;
}

export function UnifiedChatPage() {
  const { kind } = useParams<{ kind?: string }>();
  const resolvedKind = normalizeKind(kind);

  if (!resolvedKind) {
    return <Navigate to="/chat/openclaw" replace />;
  }

  if (resolvedKind === 'openclaw') {
    return <OpenClawChat />;
  }

  if (resolvedKind === 'xiaojiu') {
    return <XiaojiuChat />;
  }

  if (resolvedKind === 'jizhi') {
    return <JizhiChat />;
  }

  return <VoiceChatHistory />;
}

export default UnifiedChatPage;
