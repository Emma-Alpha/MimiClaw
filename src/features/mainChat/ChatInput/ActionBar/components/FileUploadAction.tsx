import { Paperclip } from 'lucide-react';
import { useCallback } from 'react';
import { useChatInputContext } from '../../ChatInputProvider';
import { ActionWrapper } from './ActionWrapper';

export function FileUploadAction() {
  const { pickFiles } = useChatInputContext();

  const handleClick = useCallback(() => {
    void pickFiles();
  }, [pickFiles]);

  return <ActionWrapper icon={Paperclip} onClick={handleClick} title="Upload files" />;
}
