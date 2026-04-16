import {
  AssistantStandardAbove,
  AssistantStandardBelow,
} from './shared';
import type {
  AssistantProtocolAboveProps,
  AssistantProtocolBelowProps,
} from './types';

export function OpenAIAssistantAbove(props: AssistantProtocolAboveProps) {
  return <AssistantStandardAbove {...props} />;
}

export function OpenAIAssistantBelow(props: AssistantProtocolBelowProps) {
  return <AssistantStandardBelow {...props} />;
}
