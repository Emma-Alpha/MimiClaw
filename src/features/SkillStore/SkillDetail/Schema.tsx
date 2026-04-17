import { Flexbox, Skeleton } from '@lobehub/ui';
import { createStaticStyles, cssVar } from 'antd-style';
import { memo, useMemo, useState } from 'react';
import { useDetailContext } from './DetailContext';
import ContentViewer from './ContentViewer';
import FileTree from './FileTree';
import type { SkillResourceTreeNode } from './types';

const schemaStyles = createStaticStyles(({ css }) => ({
  divider: css`
    flex-shrink: 0;
    width: 1px;
    background: ${cssVar.colorBorderSecondary};
  `,
  left: css`
    overflow-y: auto;
    flex-shrink: 0;
    width: 240px;
    padding: 8px;
  `,
  right: css`
    container-type: size;
    overflow: auto;
    flex: 1;
  `,
}));

const buildContentMap = (nodes: SkillResourceTreeNode[]) => {
  const map: Record<string, string> = {};
  const walk = (items: SkillResourceTreeNode[]) => {
    for (const node of items) {
      if (node.type === 'file') {
        map[node.path] = node.content || '';
      } else if (node.children) {
        walk(node.children);
      }
    }
  };
  walk(nodes);
  return map;
};

const Schema = memo(() => {
  const { loading, resourceTree, skillContent } = useDetailContext();
  const [selectedFile, setSelectedFile] = useState('SKILL.md');
  const contentMap = useMemo(() => buildContentMap(resourceTree), [resourceTree]);

  if (loading) {
    return (
      <Flexbox gap={16}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Flexbox>
    );
  }

  return (
    <Flexbox gap={8}>
      <Flexbox
        horizontal
        style={{
          border: `1px solid ${cssVar.colorBorderSecondary}`,
          borderRadius: 8,
          height: 430,
          overflow: 'hidden',
        }}
      >
        <div className={schemaStyles.left}>
          <FileTree
            resourceTree={resourceTree}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>
        <div className={schemaStyles.divider} />
        <div className={schemaStyles.right} key={selectedFile}>
          <ContentViewer
            contentMap={contentMap}
            selectedFile={selectedFile}
            skillContent={skillContent}
          />
        </div>
      </Flexbox>
    </Flexbox>
  );
});

Schema.displayName = 'Schema';

export default Schema;
