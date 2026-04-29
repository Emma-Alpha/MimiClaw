import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DOMTreeNode } from "../../../../../shared/browser-inspector";
import { useInspectorStore } from "@/stores/inspector";
import { useCodeChatStyles } from "../styles";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Collect the cssSelector of every ancestor of the target node inside the
 * tree so that TreeNode components on the path can force-expand themselves.
 */
function collectAncestorSelectors(
  node: DOMTreeNode,
  targetSelector: string,
  path: string[] = [],
): string[] | null {
  if (node.cssSelector === targetSelector) return path;
  for (const child of node.children) {
    const result = collectAncestorSelectors(child, targetSelector, [...path, node.cssSelector]);
    if (result) return result;
  }
  return null;
}

// ─── TreeNode ───────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: DOMTreeNode;
  selectedSelector: string | null;
  /** Set of ancestor cssSelectors that must be expanded to reveal the selected node */
  expandedAncestors: ReadonlySet<string>;
}

const TreeNode = memo<TreeNodeProps>(function TreeNode({ node, selectedSelector, expandedAncestors }) {
  const { styles, cx } = useCodeChatStyles();
  const highlightElement = useInspectorStore((s) => s.highlightElement);
  const removeHighlight = useInspectorStore((s) => s.removeHighlight);
  const selectElement = useInspectorStore((s) => s.selectElement);

  const hasChildren = node.children.length > 0;
  const isSelected = node.cssSelector === selectedSelector;
  const isAncestorOfSelected = expandedAncestors.has(node.cssSelector);

  // Auto-expand: depth < 2 by default, OR if this node is an ancestor of the selected element
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const autoExpand = node.depth < 2 || isAncestorOfSelected;
  const expanded = manualExpanded ?? autoExpand;

  // When this node becomes an ancestor of the selected element, force expand
  useEffect(() => {
    if (isAncestorOfSelected) {
      setManualExpanded(null); // reset manual override so auto-expand takes effect
    }
  }, [isAncestorOfSelected]);

  // Scroll selected node into view
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setManualExpanded((prev) => {
      const current = prev ?? autoExpand;
      return !current;
    });
  }, [autoExpand]);

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
        ref={rowRef}
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
        <TreeNode
          key={child.nodeId}
          node={child}
          selectedSelector={selectedSelector}
          expandedAncestors={expandedAncestors}
        />
      ))}
    </>
  );
});

// ─── DOMTreeView ────────────────────────────────────────────────────────────

export const DOMTreeView = memo(function DOMTreeView() {
  const { styles } = useCodeChatStyles();
  const domTree = useInspectorStore((s) => s.domTree);
  const domTreeLoading = useInspectorStore((s) => s.domTreeLoading);
  const selectedElement = useInspectorStore((s) => s.selectedElement);

  const selectedSelector = selectedElement?.cssSelector ?? null;

  // Compute the set of ancestor selectors that need to be expanded
  const expandedAncestors = useMemo<ReadonlySet<string>>(() => {
    if (!domTree || !selectedSelector) return new Set();
    const ancestors = collectAncestorSelectors(domTree, selectedSelector);
    return new Set(ancestors ?? []);
  }, [domTree, selectedSelector]);

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
      <TreeNode
        node={domTree}
        selectedSelector={selectedSelector}
        expandedAncestors={expandedAncestors}
      />
    </div>
  );
});
