import {
  AssistantStandardAbove,
  AssistantStandardBelow,
} from './shared';
import type {
  AssistantProtocolAboveProps,
  AssistantProtocolBelowProps,
} from './types';

export function GenericAssistantAbove(props: AssistantProtocolAboveProps) {
  return <AssistantStandardAbove {...props} />;
}

export function GenericAssistantBelow(props: AssistantProtocolBelowProps) {
  return <AssistantStandardBelow {...props} />;
}
