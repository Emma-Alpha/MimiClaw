import type { ChatState } from './types';

export type ChatSet = (
  partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>),
  replace?: false,
) => void;

export type ChatGet = () => ChatState;
