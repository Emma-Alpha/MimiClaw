import { Navigate, useParams } from 'react-router-dom';
import { CodeChat } from '@/features/codeAssistant';

export type UnifiedChatKind = 'code';

function normalizeKind(kind?: string): UnifiedChatKind | null {
  if (!kind || kind === 'code') {
    return 'code';
  }
  return null;
}

export function UnifiedChatPage() {
  const { kind } = useParams<{ kind?: string }>();
  const resolvedKind = normalizeKind(kind);

  if (!resolvedKind) {
    return <Navigate to="/chat/code" replace />;
  }

  return <CodeChat embeddedCodeAssistant />;
}

export default UnifiedChatPage;
