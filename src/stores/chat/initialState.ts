/**
 * Composed initial state for the chat store.
 *
 * Each slice owns its own state type and initial values.
 * This file combines them into a single ChatStoreState.
 */
import { type TimelineState, initialTimelineState } from './slices/timeline/initialState';
import { type SessionConfigState, initialSessionConfigState } from './slices/sessionConfig/initialState';

export type ChatStoreState = TimelineState & SessionConfigState;

export const initialState: ChatStoreState = {
  ...initialTimelineState,
  ...initialSessionConfigState,
};
