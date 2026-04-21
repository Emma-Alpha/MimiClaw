import { toast } from 'sonner';
import type { ActionHandlerContext } from '../context';

export async function handleSttAction({
  isSttEnabled,
  isSttRecording,
  isSttTranscribing,
  toggleRecording,
}: ActionHandlerContext) {
  if (!isSttEnabled) {
    toast.error('Speech-to-text is disabled in labs settings');
    return;
  }
  if (isSttTranscribing) return;
  await toggleRecording();
  toast.success(isSttRecording ? 'Transcribing speech…' : 'Listening…');
}
