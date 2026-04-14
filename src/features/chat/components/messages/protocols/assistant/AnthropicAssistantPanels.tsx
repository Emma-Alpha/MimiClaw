import {
  AssistantStandardAbove,
  AssistantStandardBelow,
} from './shared';
import type {
  AssistantProtocolAboveProps,
  AssistantProtocolBelowProps,
} from './types';

export function AnthropicAssistantAbove(props: AssistantProtocolAboveProps) {
  return <AssistantStandardAbove {...props} />;
}

export function AnthropicAssistantBelow(props: AssistantProtocolBelowProps) {
  return <AssistantStandardBelow {...props} />;
}
