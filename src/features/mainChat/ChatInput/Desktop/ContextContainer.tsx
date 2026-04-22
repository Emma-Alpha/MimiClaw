import { Flexbox, ScrollShadow } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { memo } from 'react';
import { fileChatSelectors, useFileStore } from '@/stores/file';
import { ContextItem } from './ContextItem';

const useStyles = createStyles(({ css }) => ({
  container: css`
    overflow-x: auto;
    width: 100%;
    padding-block: 8px;
  `,
}));

export const ContextContainer = memo(() => {
  const { styles } = useStyles();
  const inputFilesList = useFileStore(fileChatSelectors.chatUploadFileList);
  const showFileList = useFileStore(fileChatSelectors.chatUploadFileListHasItem);

  if (!inputFilesList.length || !showFileList) return null;

  return (
    <Flexbox paddingInline={8}>
      <ScrollShadow
        hideScrollBar
        horizontal
        className={styles.container}
        orientation={'horizontal'}
        size={8}
      >
        <Flexbox horizontal gap={8}>
          {inputFilesList.map((item) => (
            <ContextItem key={item.id} {...item} />
          ))}
        </Flexbox>
      </ScrollShadow>
    </Flexbox>
  );
});
