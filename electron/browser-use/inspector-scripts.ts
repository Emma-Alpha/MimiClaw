/**
 * Inspector injection scripts.
 *
 * Each function returns a self-executing IIFE string that will be evaluated
 * inside the inspected page via CDP `Runtime.evaluate`.
 *
 * Communication back to the main process uses a CDP binding:
 *   window.__mimiInspector(jsonString)
 *
 * All mutable state lives under `window.__mimiInspectorState` so scripts can
 * be torn down cleanly.
 */

// ─── Shared helpers injected into every script that needs them ──────────────

/**
 * Returns JS source for `buildSelector(el)` — used by both the picker and
 * the DOM-tree builder so their CSS selectors always match.
 */
function sharedBuildSelectorSource(): string {
  return `
  function buildSelector(el) {
    if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
    var parts = [];
    var cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      var seg = cur.tagName.toLowerCase();
      if (cur.id) { seg += '#' + cur.id; parts.unshift(seg); break; }
      if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (cls) seg += '.' + cls;
      }
      var parent = cur.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === cur.tagName; });
        if (siblings.length > 1) seg += ':nth-child(' + (Array.from(parent.children).indexOf(cur) + 1) + ')';
      }
      parts.unshift(seg);
      cur = parent;
    }
    return parts.join(' > ');
  }`;
}

/**
 * Tags that the element picker should skip (bubble up past).
 * These are inline formatting / structural / invisible tags that are rarely
 * the element the user actually wants to inspect.
 */
const SKIP_TAGS = new Set([
  'br', 'wbr', 'hr', 'script', 'style', 'link', 'meta', 'head', 'html',
  'noscript', 'template', 'slot',
]);

const INLINE_TAGS = new Set([
  'span', 'em', 'strong', 'b', 'i', 'u', 's', 'small', 'sub', 'sup',
  'abbr', 'code', 'kbd', 'var', 'mark', 'del', 'ins', 'q', 'cite',
  'dfn', 'time', 'data', 'ruby', 'rt', 'rp', 'bdi', 'bdo',
]);

function sharedBubbleUpSource(): string {
  const skipJson = JSON.stringify([...SKIP_TAGS]);
  const inlineJson = JSON.stringify([...INLINE_TAGS]);
  return `
  var __skipTags = new Set(${skipJson});
  var __inlineTags = new Set(${inlineJson});

  function bubbleUp(el) {
    var cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      var tag = cur.tagName.toLowerCase();
      if (__skipTags.has(tag)) { cur = cur.parentElement; continue; }
      // Skip inline tags unless they have meaningful attributes
      if (__inlineTags.has(tag) && !cur.id && !cur.getAttribute('role') && !cur.getAttribute('data-testid')) {
        cur = cur.parentElement;
        continue;
      }
      return cur;
    }
    return el; // fallback: return original
  }`;
}

// ─── Element Picker ─────────────────────────────────────────────────────────

export function getPickerScript(): string {
  return `(function() {
  if (window.__mimiInspectorState?.pickerActive) return;

  var state = window.__mimiInspectorState = window.__mimiInspectorState || {};
  state.pickerActive = true;

  ${sharedBuildSelectorSource()}
  ${sharedBubbleUpSource()}

  // ── Overlay element ──
  var overlay = document.createElement('div');
  overlay.id = '__mimi-inspector-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #3a96dd;background:rgba(58,150,221,0.08);transition:all 0.05s ease;display:none;';
  document.body.appendChild(overlay);

  // ── Label element ──
  var label = document.createElement('div');
  label.id = '__mimi-inspector-label';
  label.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#3a96dd;color:#fff;font:11px/1.4 monospace;padding:2px 6px;border-radius:3px;white-space:nowrap;display:none;';
  document.body.appendChild(label);

  var lastTarget = null;
  var rafId = 0;

  function collectElementData(el) {
    var rect = el.getBoundingClientRect();
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: (typeof el.className === 'string' ? el.className : '') || '',
      textContent: (el.textContent || '').trim().slice(0, 100),
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      cssSelector: buildSelector(el),
      attributes: attrs,
    };
  }

  function updateOverlay(el) {
    var rect = el.getBoundingClientRect();
    overlay.style.left = rect.x + 'px';
    overlay.style.top = rect.y + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';

    // Label content
    var text = el.tagName.toLowerCase();
    if (el.id) text += '#' + el.id;
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.trim().split(/\\s+/).slice(0, 3);
      if (cls.length) text += '.' + cls.join('.');
    }
    label.textContent = text;

    // Position label above or below
    var labelY = rect.y > 24 ? rect.y - 22 : rect.bottom + 4;
    label.style.left = Math.max(0, rect.x) + 'px';
    label.style.top = labelY + 'px';
    label.style.display = 'block';
  }

  function onMouseMove(e) {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
      var raw = document.elementFromPoint(e.clientX, e.clientY);
      if (!raw || raw === overlay || raw === label || raw === document.documentElement) {
        overlay.style.display = 'none';
        label.style.display = 'none';
        lastTarget = null;
        return;
      }
      // Bubble up past trivial inline/structural tags
      var el = bubbleUp(raw);
      if (el === lastTarget) return;
      lastTarget = el;

      updateOverlay(el);

      // Send hover event
      try {
        window.__mimiInspector(JSON.stringify({ type: 'element-hovered', data: collectElementData(el) }));
      } catch (_) {}
    });
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var raw = document.elementFromPoint(e.clientX, e.clientY);
    if (!raw || raw === overlay || raw === label) return;
    var el = bubbleUp(raw);

    try {
      window.__mimiInspector(JSON.stringify({ type: 'element-selected', data: collectElementData(el) }));
    } catch (_) {}
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      try {
        window.__mimiInspector(JSON.stringify({ type: 'picker-cancelled' }));
      } catch (_) {}
    }
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  state.pickerCleanup = function() {
    cancelAnimationFrame(rafId);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.remove();
    label.remove();
    state.pickerActive = false;
    lastTarget = null;
  };
})();`;
}

export function getPickerCleanupScript(): string {
  return `(function() {
  const state = window.__mimiInspectorState;
  if (state && state.pickerCleanup) {
    state.pickerCleanup();
    delete state.pickerCleanup;
  }
})();`;
}

// ─── Element Highlight (for tree hover) ─────────────────────────────────────

export function getHighlightScript(selector: string): string {
  const escaped = JSON.stringify(selector);
  return `(function() {
  const state = window.__mimiInspectorState = window.__mimiInspectorState || {};

  // Remove previous highlight
  const prev = document.getElementById('__mimi-inspector-highlight');
  if (prev) prev.remove();

  const el = document.querySelector(${escaped});
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const hl = document.createElement('div');
  hl.id = '__mimi-inspector-highlight';
  hl.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;border:2px dashed #5eb2f6;background:rgba(94,178,246,0.1);'
    + 'left:' + rect.x + 'px;top:' + rect.y + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;';
  document.body.appendChild(hl);
})();`;
}

export function getRemoveHighlightScript(): string {
  return `(function() {
  const el = document.getElementById('__mimi-inspector-highlight');
  if (el) el.remove();
})();`;
}

// ─── DOM Tree Builder ───────────────────────────────────────────────────────

export function getDOMTreeScript(maxDepth: number = 6): string {
  return `(function() {
  var nextId = 1;
  var MAX_DEPTH = ${maxDepth};
  var MAX_CHILDREN = 100;

  ${sharedBuildSelectorSource()}

  function walk(el, depth) {
    if (depth > MAX_DEPTH) return null;
    if (!el || el.nodeType !== 1) return null;
    // Skip inspector overlay elements
    if (el.id && el.id.startsWith('__mimi-inspector')) return null;

    var children = [];
    var childElements = el.children;
    var count = Math.min(childElements.length, MAX_CHILDREN);
    for (var i = 0; i < count; i++) {
      var child = walk(childElements[i], depth + 1);
      if (child) children.push(child);
    }

    return {
      nodeId: nextId++,
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: (typeof el.className === 'string' ? el.className : '') || '',
      children: children,
      childCount: childElements.length,
      depth: depth,
      cssSelector: buildSelector(el),
    };
  }

  var root = document.getElementById('root') || document.body;
  return walk(root, 0);
})()`;
}

// ─── Computed Styles ────────────────────────────────────────────────────────

export function getComputedStylesScript(selector: string): string {
  const escaped = JSON.stringify(selector);
  return `(function() {
  const el = document.querySelector(${escaped});
  if (!el) return null;

  const cs = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  function px(v) { return parseFloat(v) || 0; }

  const groups = [
    {
      label: 'Layout',
      properties: [
        { name: 'display', value: cs.display },
        { name: 'position', value: cs.position },
        { name: 'width', value: cs.width },
        { name: 'height', value: cs.height },
        { name: 'top', value: cs.top },
        { name: 'right', value: cs.right },
        { name: 'bottom', value: cs.bottom },
        { name: 'left', value: cs.left },
        { name: 'z-index', value: cs.zIndex },
        { name: 'overflow', value: cs.overflow },
        { name: 'flex-direction', value: cs.flexDirection },
        { name: 'justify-content', value: cs.justifyContent },
        { name: 'align-items', value: cs.alignItems },
        { name: 'gap', value: cs.gap },
      ],
    },
    {
      label: 'Typography',
      properties: [
        { name: 'font-family', value: cs.fontFamily },
        { name: 'font-size', value: cs.fontSize },
        { name: 'font-weight', value: cs.fontWeight },
        { name: 'line-height', value: cs.lineHeight },
        { name: 'color', value: cs.color },
        { name: 'text-align', value: cs.textAlign },
        { name: 'letter-spacing', value: cs.letterSpacing },
        { name: 'text-decoration', value: cs.textDecoration },
        { name: 'white-space', value: cs.whiteSpace },
      ],
    },
    {
      label: 'Background',
      properties: [
        { name: 'background-color', value: cs.backgroundColor },
        { name: 'background-image', value: cs.backgroundImage },
        { name: 'background-size', value: cs.backgroundSize },
        { name: 'background-position', value: cs.backgroundPosition },
      ],
    },
    {
      label: 'Border',
      properties: [
        { name: 'border', value: cs.border },
        { name: 'border-radius', value: cs.borderRadius },
        { name: 'outline', value: cs.outline },
      ],
    },
    {
      label: 'Effects',
      properties: [
        { name: 'opacity', value: cs.opacity },
        { name: 'box-shadow', value: cs.boxShadow },
        { name: 'transform', value: cs.transform },
        { name: 'transition', value: cs.transition },
        { name: 'cursor', value: cs.cursor },
        { name: 'visibility', value: cs.visibility },
      ],
    },
  ];

  const boxModel = {
    margin: [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)],
    border: [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)],
    padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
    content: { width: rect.width, height: rect.height },
  };

  return {
    selector: ${escaped},
    groups: groups,
    boxModel: boxModel,
  };
})()`;
}

// ─── Area Screenshot ────────────────────────────────────────────────────────

export function getAreaScreenshotScript(): string {
  return `(function() {
  if (window.__mimiInspectorState?.areaActive) return;

  const state = window.__mimiInspectorState = window.__mimiInspectorState || {};
  state.areaActive = true;

  const selectionBox = document.createElement('div');
  selectionBox.id = '__mimi-inspector-area';
  selectionBox.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px dashed #3a96dd;background:rgba(58,150,221,0.1);display:none;';
  document.body.appendChild(selectionBox);

  // Dimming overlay
  const dimOverlay = document.createElement('div');
  dimOverlay.id = '__mimi-inspector-area-dim';
  dimOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;cursor:crosshair;';
  document.body.appendChild(dimOverlay);

  let startX = 0, startY = 0, dragging = false;

  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }

  function onMouseMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selectionBox.style.left = x + 'px';
    selectionBox.style.top = y + 'px';
    selectionBox.style.width = w + 'px';
    selectionBox.style.height = h + 'px';
  }

  function onMouseUp(e) {
    if (!dragging) return;
    e.preventDefault();
    e.stopPropagation();
    dragging = false;

    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    cleanup();

    if (w > 5 && h > 5) {
      try {
        window.__mimiInspector(JSON.stringify({
          type: 'area-selected',
          data: { x: x, y: y, width: w, height: h },
        }));
      } catch (_) {}
    } else {
      try {
        window.__mimiInspector(JSON.stringify({ type: 'picker-cancelled' }));
      } catch (_) {}
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      try {
        window.__mimiInspector(JSON.stringify({ type: 'picker-cancelled' }));
      } catch (_) {}
    }
  }

  function cleanup() {
    dimOverlay.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);
    document.removeEventListener('keydown', onKeyDown, true);
    selectionBox.remove();
    dimOverlay.remove();
    state.areaActive = false;
    delete state.areaCleanup;
  }

  dimOverlay.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keydown', onKeyDown, true);

  state.areaCleanup = cleanup;
})();`;
}

export function getAreaScreenshotCleanupScript(): string {
  return `(function() {
  const state = window.__mimiInspectorState;
  if (state && state.areaCleanup) {
    state.areaCleanup();
  }
})();`;
}
