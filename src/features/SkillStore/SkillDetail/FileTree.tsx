import { Icon } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { ChevronDown, ChevronRight, File, FolderIcon, FolderOpenIcon } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import type { SkillResourceTreeNode } from './types';

const treeStyles = createStaticStyles(({ css, cssVar }) => ({
  item: css`
    cursor: pointer;

    display: flex;
    gap: 6px;
    align-items: center;

    padding-block: 6px;
    padding-inline-end: 8px;
    border-radius: 6px;

    font-size: 13px;
    line-height: 1.4;

    &:hover {
      background: ${cssVar.colorFillTertiary};
    }
  `,
  itemSelected: css`
    color: ${cssVar.colorPrimary};
    background: ${cssVar.colorFillSecondary};
  `,
  label: css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

interface FileTreeProps {
  onSelectFile: (path: string) => void;
  resourceTree: SkillResourceTreeNode[];
  selectedFile: string;
}

const TreeNode = memo<{
  depth: number;
  isExpandedFolder: (_path: string) => boolean;
  node: SkillResourceTreeNode;
  onSelectFile: (_path: string) => void;
  onToggleFolder: (_path: string) => void;
  selectedFile: string;
}>(({ node, depth, selectedFile, onSelectFile, isExpandedFolder, onToggleFolder }) => {
  const isDir = node.type === 'directory';
  const isExpanded = isExpandedFolder(node.path);
  const isSelected = !isDir && selectedFile === node.path;

  const handleClick = () => {
    if (isDir) {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <>
      <div
        className={`${treeStyles.item} ${isSelected ? treeStyles.itemSelected : ''}`}
        style={{ paddingInlineStart: 8 + depth * 16 }}
        title={node.path}
        onClick={handleClick}
      >
        {isDir && <Icon icon={isExpanded ? ChevronDown : ChevronRight} size={14} />}
        {!isDir && <span style={{ flexShrink: 0, width: 14 }} />}
        <Icon icon={isDir ? (isExpanded ? FolderOpenIcon : FolderIcon) : File} size={16} />
        <span className={treeStyles.label}>{node.name}</span>
      </div>
      {isDir &&
        isExpanded &&
        node.children?.map((child) => (
          <TreeNode
            depth={depth + 1}
            isExpandedFolder={isExpandedFolder}
            key={child.path}
            node={child}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onToggleFolder={onToggleFolder}
          />
        ))}
    </>
  );
});

TreeNode.displayName = 'TreeNode';

const FileTree = memo<FileTreeProps>(({ resourceTree, selectedFile, onSelectFile }) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const allFolderPaths = useMemo(() => {
    const allDirs = new Set<string>();
    const collectDirs = (nodes: SkillResourceTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          allDirs.add(node.path);
          if (node.children) collectDirs(node.children);
        }
      }
    };
    collectDirs(resourceTree);
    return allDirs;
  }, [resourceTree]);

  const isExpandedFolder = useCallback(
    (path: string) => allFolderPaths.has(path) && !collapsedFolders.has(path),
    [allFolderPaths, collapsedFolders],
  );

  const handleToggleFolder = useCallback((path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const isSkillMdSelected = selectedFile === 'SKILL.md';
  const hasResources = useMemo(() => resourceTree.length > 0, [resourceTree]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        className={`${treeStyles.item} ${isSkillMdSelected ? treeStyles.itemSelected : ''}`}
        style={{ paddingInlineStart: 8 }}
        onClick={() => onSelectFile('SKILL.md')}
      >
        <span style={{ flexShrink: 0, width: 14 }} />
        <Icon icon={File} size={16} />
        <span className={treeStyles.label}>SKILL.md</span>
      </div>
      {hasResources &&
        resourceTree.map((node) => (
          <TreeNode
            depth={0}
            isExpandedFolder={isExpandedFolder}
            key={node.path}
            node={node}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onToggleFolder={handleToggleFolder}
          />
        ))}
    </div>
  );
});

FileTree.displayName = 'FileTree';

export default FileTree;
