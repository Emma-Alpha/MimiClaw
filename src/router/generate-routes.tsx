/**
 * Convention-based route generation from file system.
 *
 * Conventions (Next.js App Router style):
 *   page.tsx    → route entry point (default export)
 *   _layout.tsx → layout wrapper for the group (default export, renders <Outlet />)
 *   (group)/    → route group, no URL segment
 *   [param]/    → dynamic segment → :param
 *   _prefix/    → private folder, excluded from routing
 */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import type { ComponentType } from 'react';
import { REDIRECTS } from './redirects';

// ---------------------------------------------------------------------------
// Glob discovery — resolved at build time by Vite
// ---------------------------------------------------------------------------

const pageModules = import.meta.glob<{ default: ComponentType }>(
  '../pages/**/page.tsx',
  { eager: true },
);

const layoutModules = import.meta.glob<{ default: ComponentType }>(
  '../pages/**/_layout.tsx',
  { eager: true },
);

// ---------------------------------------------------------------------------
// Routes that need catch-all wildcard matching (e.g. /settings/*)
// ---------------------------------------------------------------------------

const WILDCARD_ROUTES = new Set(['/settings', '/setup']);

// ---------------------------------------------------------------------------
// Path parsing
// ---------------------------------------------------------------------------

interface ParsedRoute {
  /** URL path, e.g. "/chat/:kind" */
  path: string;
  /** Page component (default export of page.tsx) */
  Component: ComponentType;
  /** Route group name, e.g. "main" for (main)/ — null if top-level */
  group: string | null;
  /** Original glob key for debugging */
  _source: string;
}

function filePathToRoutePath(filePath: string): { urlPath: string; group: string | null } {
  // Strip glob prefix and page.tsx suffix
  // "../pages/(main)/models/page.tsx" → "(main)/models"
  let segment = filePath.replace(/^\.\.\/pages\//, '').replace(/\/page\.tsx$/, '');

  // Extract group name: "(main)/models" → group="main", segment="models"
  const groupMatch = segment.match(/^\(([^)]+)\)\//);
  const group = groupMatch ? groupMatch[1] : null;

  // Remove all group segments from path
  segment = segment.replace(/\([^)]+\)\//g, '');

  // Convert dynamic segments: "[kind]" → ":kind"
  segment = segment.replace(/\[([^\]]+)\]/g, ':$1');

  let urlPath = '/' + segment;

  // Append wildcard if needed
  if (WILDCARD_ROUTES.has(urlPath)) {
    urlPath += '/*';
  }

  return { urlPath, group };
}

function discoverRoutes(): ParsedRoute[] {
  const routes: ParsedRoute[] = [];

  for (const [filePath, mod] of Object.entries(pageModules)) {
    const Component = mod.default;
    if (!Component) {
      console.warn(`[router] ${filePath} has no default export — skipped`);
      continue;
    }

    const { urlPath, group } = filePathToRoutePath(filePath);
    routes.push({ path: urlPath, Component, group, _source: filePath });
  }

  return routes;
}

function findLayout(group: string): ComponentType | undefined {
  const key = `../pages/(${group})/_layout.tsx`;
  return layoutModules[key]?.default;
}

// ---------------------------------------------------------------------------
// Legacy redirect that preserves search params
// ---------------------------------------------------------------------------

function LegacyCodeQuickChatRedirect() {
  const location = useLocation();
  return <Navigate to={`/chat/code${location.search}`} replace />;
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function AppRoutes() {
  const routes = discoverRoutes();

  // Partition by group
  const grouped = new Map<string | null, ParsedRoute[]>();
  for (const route of routes) {
    const list = grouped.get(route.group) ?? [];
    list.push(route);
    grouped.set(route.group, list);
  }

  return (
    <Routes>
      {/* Static redirects */}
      {REDIRECTS.map((r) => (
        <Route key={r.from} path={r.from} element={<Navigate to={r.to} replace />} />
      ))}

      {/* Legacy redirect preserving search params */}
      <Route path="/code-agent/quick-chat" element={<LegacyCodeQuickChatRedirect />} />

      {/* Standalone routes (no group → no layout) */}
      {grouped.get(null)?.map((r) => (
        <Route key={r.path} path={r.path} element={<r.Component />} />
      ))}

      {/* Grouped routes with layout wrappers */}
      {Array.from(grouped.entries())
        .filter(([key]) => key !== null)
        .map(([group, groupRoutes]) => {
          const Layout = findLayout(group!);
          if (!Layout) {
            // No layout file found — render routes without wrapper
            return groupRoutes.map((r) => (
              <Route key={r.path} path={r.path} element={<r.Component />} />
            ));
          }
          return (
            <Route key={`group:${group}`} element={<Layout />}>
              {groupRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={<r.Component />} />
              ))}
            </Route>
          );
        })}
    </Routes>
  );
}
