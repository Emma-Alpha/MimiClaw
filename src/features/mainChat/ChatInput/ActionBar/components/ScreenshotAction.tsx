import { Camera } from 'lucide-react';
import { useCallback } from 'react';
import { useFileStore } from '@/stores/file';
import { ActionWrapper } from './ActionWrapper';

export function ScreenshotAction() {
  const stageBufferFile = useFileStore((s) => s.stageBufferFile);

  const handleClick = useCallback(async () => {
    try {
      const screenshot = await window.electron.captureScreenshot();
      const byteString = atob(screenshot.base64);
      const bytes = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        bytes[i] = byteString.charCodeAt(i);
      }
      const file = new File([bytes], screenshot.fileName, { type: screenshot.mimeType });
      await stageBufferFile(file);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    }
  }, [stageBufferFile]);

  // Only show on macOS
  if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('Mac')) {
    return null;
  }

  return <ActionWrapper icon={Camera} onClick={handleClick} title="Screenshot" />;
}
