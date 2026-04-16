import type { ComponentType } from 'react';

import type { MessageProtocol } from '../../types';
import {
  AnthropicAssistantAbove,
  AnthropicAssistantBelow,
} from './AnthropicAssistantPanels';
import {
  GenericAssistantAbove,
  GenericAssistantBelow,
} from './GenericAssistantPanels';
import {
  OpenAIAssistantAbove,
  OpenAIAssistantBelow,
} from './OpenAIAssistantPanels';
import type {
  AssistantProtocolAboveProps,
  AssistantProtocolBelowProps,
} from './types';

export interface AssistantProtocolComponents {
  Above: ComponentType<AssistantProtocolAboveProps>;
  Below: ComponentType<AssistantProtocolBelowProps>;
}

export function getAssistantProtocolComponents(
  protocol: MessageProtocol,
): AssistantProtocolComponents {
  switch (protocol) {
    case 'anthropic': {
      return { Above: AnthropicAssistantAbove, Below: AnthropicAssistantBelow };
    }
    case 'openai': {
      return { Above: OpenAIAssistantAbove, Below: OpenAIAssistantBelow };
    }
    default: {
      return { Above: GenericAssistantAbove, Below: GenericAssistantBelow };
    }
  }
}
