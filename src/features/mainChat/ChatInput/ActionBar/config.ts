import type { ComponentType } from 'react';
import type { ChatInputActionKey } from '../types';

import { AgentModeAction } from './components/AgentModeAction';
import { ClearAction } from './components/ClearAction';
import { FileUploadAction } from './components/FileUploadAction';
import { HistoryAction } from './components/HistoryAction';
import { MainTokenAction } from './components/MainTokenAction';
import { MemoryAction } from './components/MemoryAction';
import { MentionAction } from './components/MentionAction';
import { ModelAction } from './components/ModelAction';
import { ParamsAction } from './components/ParamsAction';
import { PortalTokenAction } from './components/PortalTokenAction';
import { PromptTransformAction } from './components/PromptTransformAction';
import { SaveTopicAction } from './components/SaveTopicAction';
import { ScreenshotAction } from './components/ScreenshotAction';
import { SearchAction } from './components/SearchAction';
import { SttAction } from './components/SttAction';
import { ThinkingAction } from './components/ThinkingAction';
import { ToolsAction } from './components/ToolsAction';
import { TypoAction } from './components/TypoAction';

export const ACTION_COMPONENT_MAP: Partial<Record<ChatInputActionKey, ComponentType>> = {
  agentMode: AgentModeAction,
  clear: ClearAction,
  fileUpload: FileUploadAction,
  history: HistoryAction,
  mainToken: MainTokenAction,
  memory: MemoryAction,
  mention: MentionAction,
  model: ModelAction,
  params: ParamsAction,
  portalToken: PortalTokenAction,
  promptTransform: PromptTransformAction,
  saveTopic: SaveTopicAction,
  screenshot: ScreenshotAction,
  search: SearchAction,
  stt: SttAction,
  thinking: ThinkingAction,
  tools: ToolsAction,
  typo: TypoAction,
};
