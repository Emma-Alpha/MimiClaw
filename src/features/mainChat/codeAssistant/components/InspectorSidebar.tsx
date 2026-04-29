import { memo, useCallback, useRef, useState } from "react";
import { useCodeChatStyles } from "../styles";
import { DOMTreeView } from "./DOMTreeView";
import { CSSInspectorPanel } from "./CSSInspectorPanel";

const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 500;

function clampWidth(w: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(w)));
}

export const InspectorSidebar = memo(function InspectorSidebar() {
  const { styles } = useCodeChatStyles();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [domTreeExpanded, setDomTreeExpanded] = useState(true);
  const [cssExpanded, setCssExpanded] = useState(true);

  const resizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      // Dragging left → sidebar grows
      const deltaX = startXRef.current - moveEvent.clientX;
      setWidth(clampWidth(startWidthRef.current + deltaX));
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [width]);

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: resize handle */}
      <div className={styles.inspectorSidebarResizeHandle} onMouseDown={handleResizeStart} />
      <div className={styles.inspectorSidebar} style={{ width }}>
        {/* DOM Tree Section */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: section toggle */}
        <div className={styles.inspectorSectionHeader} onClick={() => setDomTreeExpanded((p) => !p)}>
          <span>{domTreeExpanded ? "▼" : "▶"} DOM Tree</span>
        </div>
        {domTreeExpanded && <DOMTreeView />}

        {/* CSS Inspector Section */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: section toggle */}
        <div className={styles.inspectorSectionHeader} onClick={() => setCssExpanded((p) => !p)}>
          <span>{cssExpanded ? "▼" : "▶"} CSS Inspector</span>
        </div>
        {cssExpanded && <CSSInspectorPanel />}
      </div>
    </>
  );
});
