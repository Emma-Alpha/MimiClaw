import type { FC } from 'react';
import {
  AtSign,
  Bot,
  Brain,
  Eraser,
  History,
  Mic,
  Paperclip,
  PlusSquare,
  Search,
  Settings2,
  Sparkles,
  Wand2,
  Wrench,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ChatInputActionKey } from '../types';

export interface ActionMeta {
  icon: FC<LucideProps>;
  title: string;
}

export const ACTION_META_MAP: Partial<Record<ChatInputActionKey, ActionMeta>> = {
  agentMode: { icon: Bot, title: 'Agent mode' },
  clear: { icon: Eraser, title: 'Clear topic' },
  fileUpload: { icon: Paperclip, title: 'Upload files' },
  history: { icon: History, title: 'History' },
  mainToken: { icon: Sparkles, title: 'Token usage' },
  memory: { icon: Brain, title: 'Memory' },
  mention: { icon: AtSign, title: 'Mention agent' },
  model: { icon: Settings2, title: 'Model' },
  params: { icon: Settings2, title: 'Parameters' },
  portalToken: { icon: Sparkles, title: 'Portal token usage' },
  promptTransform: { icon: Wand2, title: 'Prompt transform' },
  saveTopic: { icon: PlusSquare, title: 'Save topic' },
  search: { icon: Search, title: 'Search' },
  stt: { icon: Mic, title: 'Speech to text' },
  tools: { icon: Wrench, title: 'Tools' },
  typo: { icon: Sparkles, title: 'Typo' },
};
