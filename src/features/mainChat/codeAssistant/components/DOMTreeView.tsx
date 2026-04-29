import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, useCallback, useState } from "react";
import type { DOMTreeNode } from "../../../../../shared/browser-inspector";
import { useInspectorStore } from "@/stores/inspector";
import { useCodeChatStyles } from "../styles";

interface TreeNodeProps {
  node: DOMTreeNode;
  selectedSelector: string | null;
}

const TreeNode = memo<TreeNodeProps>(function TreeNode({ node, selectedSelector }) {
  const { styles, cx } = useCodeChatStyles();
  const [expanded, setExpanded] = useState(node.depth < 2);
  const highlightElement = useInspectorStore((s) => s.highlightElement);
  const removeHighlight = useInspectorStore((s) => s.removeHighlight);
  const selectElement = useInspectorStore((s) => s.selectElement);

  const hasChildren = node.children.length > 0;
  const isSelected = node.cssSelector === selectedSelector;

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  const handleMouseEnter = useCallback(() => {
    void highlightElement(node.cssSelector);
  }, [highlightElement, node.cssSelector]);

  const handleMouseLeave = useCallback(() => {
    void removeHighlight();
  }, [removeHighlight]);

  const handleClick = useCallback(() => {
    selectElement({
      tagName: node.tagName,
      id: node.id,
      className: node.className,
      textContent: "",
      boundingRect: { x: 0, y: 0, width: 0, height: 0 },
      cssSelector: node.cssSelector,
      attributes: {},
    });
  }, [selectElement, node]);

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: tree node row */}
      <div
        className={cx(styles.inspectorDomTreeRow, isSelected && styles.inspectorDomTreeRowSelected)}
        style={{ paddingLeft: 8 + node.depth * 14 }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: expand toggle */}
        <span className={styles.inspectorDomTreeToggle} onClick={hasChildren ? handleToggle : undefined}>
          {hasChildren ? (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : null}
        </span>
        <span>
          <span className={styles.inspectorDomTreeTag}>{"<"}{node.tagName}</span>
          {node.id && <span className={styles.inspectorDomTreeId}>#{node.id}</span>}
          {node.className && (
            <span className={styles.inspectorDomTreeClass}>
              .{node.className.trim().split(/\s+/).slice(0, 2).join(".")}
            </span>
          )}
          <span className={styles.inspectorDomTreeTag}>{">"}</span>
        </span>
      </div>
      {expanded && hasChildren && node.children.map((child: DOMTreeNode) => (
        <TreeNode key={child.nodeId} node={child} selectedSelector={selectedSelector} />
      ))}
    </>
  );
});

export const DOMTreeView = memo(function DOMTreeView() {
  const { styles } = useCodeChatStyles();
  const domTree = useInspectorStore((s) => s.domTree);
  const domTreeLoading = useInspectorStore((s) => s.domTreeLoading);
  const selectedElement = useInspectorStore((s) => s.selectedElement);

  if (domTreeLoading) {
    return (
      <div className={styles.inspectorDomTree} style={{ padding: "12px", color: "#999", fontSize: 12 }}>
        Loading DOM tree...
      </div>
    );
  }

  if (!domTree) {
    return (
      <div className={styles.inspectorDomTree} style={{ padding: "12px", color: "#999", fontSize: 12 }}>
        No DOM tree loaded
      </div>
    );
  }

  return (
    <div className={styles.inspectorDomTree}>
      <TreeNode node={domTree} selectedSelector={selectedElement?.cssSelector ?? null} />
    </div>
  );
});
