import { ActionIcon, Block, Center, Flexbox, Text } from '@lobehub/ui';
import { createStyles, cssVar } from 'antd-style';
import { Trash2Icon } from 'lucide-react';
import { memo } from 'react';
import { useFileStore } from '@/stores/file';
import type { ChatUploadFile } from '@/stores/file/types';

const useStyles = createStyles(({ css }) => ({
  actions: css`
    position: absolute;
    z-index: 10;
    inset-block-start: -4px;
    inset-inline-end: -4px;
    border-radius: 5px;
    background: ${cssVar.colorBgElevated};
    box-shadow:
      0 0 0 0.5px ${cssVar.colorFillSecondary} inset,
      ${cssVar.boxShadowTertiary};
  `,
  container: css`
    user-select: none;
    position: relative;
    width: 180px;
    height: 64px;
    border-radius: 8px;
  `,
  preview: css`
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 4px;
  `,
}));

type ContextItemProps = ChatUploadFile;

export const ContextItem = memo<ContextItemProps>((props) => {
  const { styles } = useStyles();
  const { fileName, mimeType, preview, id, status } = props;
  const removeChatUploadFile = useFileStore((s) => s.removeChatUploadFile);

  const isImage = mimeType.startsWith('image/');

  return (
    <Block horizontal align={'center'} className={styles.container} variant={'outlined'}>
      <Center flex={1} height={64} padding={4} style={{ maxWidth: 64 }}>
        {isImage && preview ? (
          <img src={preview} alt={fileName} className={styles.preview} />
        ) : (
          <div style={{
            background: cssVar.colorBgTextHover,
            width: '100%',
            height: '100%',
            borderRadius: 4,
          }} />
        )}
      </Center>
      <Flexbox flex={1} gap={4} style={{ paddingBottom: 4, paddingInline: 4 }}>
        <Text
          style={{ fontSize: 12, maxWidth: 88 }}
          ellipsis={{
            tooltip: fileName,
          }}
        >
          {fileName}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {status === 'staging' ? 'Uploading...' : status === 'error' ? 'Error' : 'Ready'}
        </Text>
      </Flexbox>
      <Flexbox className={styles.actions}>
        <ActionIcon
          color={'red'}
          icon={Trash2Icon}
          size={'small'}
          title="Delete"
          onClick={() => {
            removeChatUploadFile(id);
          }}
        />
      </Flexbox>
    </Block>
  );
});
