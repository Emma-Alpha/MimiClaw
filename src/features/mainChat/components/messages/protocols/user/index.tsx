import type { MessageProtocol } from '../../types';
import { AnthropicUserTextBubble } from './AnthropicUserTextBubble';
import { GenericUserTextBubble } from './GenericUserTextBubble';
import { OpenAIUserTextBubble } from './OpenAIUserTextBubble';
import type { UserTextBubbleProps } from './types';

export function renderUserTextBubble(
  protocol: MessageProtocol,
  props: UserTextBubbleProps,
) {
  switch (protocol) {
    case 'anthropic': {
      return <AnthropicUserTextBubble {...props} />;
    }
    case 'openai': {
      return <OpenAIUserTextBubble {...props} />;
    }
    default: {
      return <GenericUserTextBubble {...props} />;
    }
  }
}
