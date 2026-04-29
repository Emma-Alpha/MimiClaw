import { memo, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { BoxModel, CSSInspectorGroup, CSSInspectorProperty } from "../../../../../shared/browser-inspector";
import { useInspectorStore } from "@/stores/inspector";
import { useCodeChatStyles } from "../styles";

// ─── Box Model Diagram ──────────────────────────────────────────────────────

const BoxModelDiagram = memo<{ boxModel: BoxModel }>(function BoxModelDiagram({ boxModel }) {
  const { styles } = useCodeChatStyles();
  const { margin, border, padding, content } = boxModel;

  return (
    <div className={styles.inspectorBoxModel}>
      <div className={styles.inspectorBoxModelContainer}>
        {/* Margin */}
        <div className={styles.inspectorBoxModelLayer} style={{ background: "rgba(246,178,107,0.15)" }}>
          <span className={styles.inspectorBoxModelLabel}>margin</span>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{margin[3]}</span>
            <span>{margin[0]}</span>
            <span>{margin[1]}</span>
          </div>
          {/* Border */}
          <div className={styles.inspectorBoxModelLayer} style={{ background: "rgba(252,212,123,0.2)" }}>
            <span className={styles.inspectorBoxModelLabel}>border</span>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{border[3]}</span>
              <span>{border[0]}</span>
              <span>{border[1]}</span>
            </div>
            {/* Padding */}
            <div className={styles.inspectorBoxModelLayer} style={{ background: "rgba(147,196,125,0.2)" }}>
              <span className={styles.inspectorBoxModelLabel}>padding</span>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{padding[3]}</span>
                <span>{padding[0]}</span>
                <span>{padding[1]}</span>
              </div>
              {/* Content */}
              <div className={styles.inspectorBoxModelContent}>
                {Math.round(content.width)} x {Math.round(content.height)}
              </div>
              <div style={{ textAlign: "center" }}>{padding[2]}</div>
            </div>
            <div style={{ textAlign: "center" }}>{border[2]}</div>
          </div>
          <div style={{ textAlign: "center" }}>{margin[2]}</div>
        </div>
      </div>
    </div>
  );
});

// ─── CSS Group ──────────────────────────────────────────────────────────────

const CSSGroup = memo<{ group: CSSInspectorGroup }>(function CSSGroup({ group }) {
  const { styles } = useCodeChatStyles();
  const [expanded, setExpanded] = useState(true);

  const toggle = useCallback(() => setExpanded((p) => !p), []);

  // Filter out default/initial values for cleaner display
  const meaningful = group.properties.filter((p: CSSInspectorProperty) => {
    const v = p.value;
    return v && v !== "none" && v !== "normal" && v !== "auto" && v !== "0px" && v !== "static" && v !== "visible" && v !== "row";
  });

  if (meaningful.length === 0) return null;

  return (
    <div className={styles.inspectorCssGroup}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: group toggle */}
      <div className={styles.inspectorCssGroupHeader} onClick={toggle}>
        {expanded ? <ChevronDown size={10} style={{ marginRight: 4 }} /> : <ChevronRight size={10} style={{ marginRight: 4 }} />}
        {group.label} ({meaningful.length})
      </div>
      {expanded && meaningful.map((prop: CSSInspectorProperty) => (
        <div key={prop.name} className={styles.inspectorCssProp}>
          <span className={styles.inspectorCssPropName}>{prop.name}</span>
          <span className={styles.inspectorCssPropValue}>{prop.value}</span>
        </div>
      ))}
    </div>
  );
});

// ─── Main Panel ─────────────────────────────────────────────────────────────

export const CSSInspectorPanel = memo(function CSSInspectorPanel() {
  const { styles } = useCodeChatStyles();
  const selectedElement = useInspectorStore((s) => s.selectedElement);
  const elementStyles = useInspectorStore((s) => s.elementStyles);
  const elementStylesLoading = useInspectorStore((s) => s.elementStylesLoading);

  if (!selectedElement) {
    return (
      <div className={styles.inspectorCssPanel} style={{ padding: "12px", color: "#999", fontSize: 12 }}>
        Select an element to inspect its styles
      </div>
    );
  }

  // Badge: <tagName#id.class>
  const badge = [
    selectedElement.tagName,
    selectedElement.id ? `#${selectedElement.id}` : "",
    selectedElement.className ? `.${selectedElement.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "",
  ].join("");

  return (
    <div className={styles.inspectorCssPanel}>
      <div className={styles.inspectorSelectedBadge}>{"<"}{badge}{">"}</div>

      {elementStylesLoading && (
        <div style={{ padding: "8px 10px", fontSize: 12, color: "#999" }}>Loading styles...</div>
      )}

      {elementStyles && (
        <>
          <BoxModelDiagram boxModel={elementStyles.boxModel} />
          {elementStyles.groups.map((group: CSSInspectorGroup) => (
            <CSSGroup key={group.label} group={group} />
          ))}
        </>
      )}
    </div>
  );
});
