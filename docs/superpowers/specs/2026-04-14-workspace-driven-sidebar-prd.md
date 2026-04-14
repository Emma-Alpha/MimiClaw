# PRD: Workspace-Driven Sidebar Refactor (Thread / OpenClaw / Realtime Voice)

## Suggested Issue Title

Workspace-driven sidebar refactor: replace session-first left navigation with fixed categories and workspace-centric thread management

## Problem Statement

Current left sidebar interaction is session-first, with CLI sessions tied to a single configured workspace root. This causes three practical product issues:

- CLI workflow is constrained by one workspace at a time, reducing Git scope flexibility and requiring repeated workspace switching.
- Left navigation is not organized around the user's primary unit of work (workspace), so context recovery is inefficient.
- The current information architecture mixes multiple conversation sources with inconsistent behavior and weak predictability.

From the user's perspective, the app should behave more like a workspace-driven coding surface. However, this product has an explicit model split requirement:

- Keep fixed first-level categories.
- Rename model-facing concepts for clarity (`OpenClaw`, `实时语音`).
- Remove explicit `CLI` category naming from left navigation.

The user also explicitly deprioritizes file tree delivery in this iteration and wants a stable, compact list interaction: session title + relative usage time.

## Solution

Refactor the left sidebar into a fixed 3-category model:

1. `线程`
2. `OpenClaw`
3. `实时语音`

The sidebar becomes category-first and workspace-driven:

- `线程` contains custom workspaces.
- Each workspace expands to show only session rows (`title + relative time`).
- `OpenClaw` and `实时语音` are fixed categories with their own session sources.
- Workspace click only expands/collapses (no direct navigation).
- Session click always navigates to the target session.

The implementation keeps existing backend capability boundaries and introduces multi-workspace state in frontend persisted settings, with URL-based workspace context for code-agent deep linking.

## User Stories

1. As a coding user, I want the left sidebar to be organized by stable categories, so that navigation remains predictable.
2. As a coding user, I want to see `线程`, `OpenClaw`, and `实时语音` as fixed first-level entries, so that I can quickly orient myself.
3. As a coding user, I want the `CLI` label removed from left navigation, so that the product language matches intended UX.
4. As a coding user, I want `线程` to hold multiple workspaces, so that I can work across repositories without repeated global reconfiguration.
5. As a coding user, I want each workspace to be expandable/collapsible, so that I can scan many workspaces without visual overload.
6. As a coding user, I want workspace node click to only toggle expand/collapse, so that navigation remains intentional.
7. As a coding user, I want workspace sessions to be shown under the workspace, so that context stays grouped.
8. As a coding user, I want each session row to display title and relative usage time, so that I can identify recency at a glance.
9. As a coding user, I want session row click to open the exact session, so that recovery is one step.
10. As a coding user, I want a global new-thread action to target my current active context, so that creation is fast.
11. As a coding user, I want workspace hover actions (`new thread`, menu), so that I can act without navigating away.
12. As a coding user, I want fixed categories to support hover new-thread action too, so that behavior is consistent.
13. As a coding user, I want `OpenClaw` to map to existing chat sessions, so that existing work remains intact.
14. As a coding user, I want `实时语音` to map to existing voice sessions, so that voice history remains intact.
15. As a coding user, I want custom workspaces sorted by recent usage, so that active projects surface first.
16. As a coding user, I want fixed categories to remain top-level anchors, so that custom workspace growth does not destabilize layout.
17. As a coding user, I want all three categories to be collapsible and default expanded, so that I can personalize density.
18. As a coding user, I want to add a workspace from the `线程` header, so that workspace onboarding is discoverable.
19. As a coding user, I want workspace add to use directory picker, so that path entry errors are avoided.
20. As a coding user, I want duplicate workspace add attempts to focus existing entry, so that the list stays clean.
21. As a coding user, I want workspace identity to be stable even if display name changes, so that mappings do not break.
22. As a coding user, I want workspace IDs derived from normalized path hash, so that identity is deterministic.
23. As a coding user, I want legacy single-workspace config auto-migrated, so that upgrade is non-disruptive.
24. As a coding user, I want URL workspace context to take precedence when deep linking, so that links are reliable.
25. As a coding user, I want URL workspace context written back into current state, so that app state stays coherent.
26. As a coding user, I want invalid or inaccessible workspaces to remain visible but marked unavailable, so that I can remediate explicitly.
27. As a coding user, I want unavailable workspaces to disable new-thread action, so that failure is prevented upfront.
28. As a coding user, I want unavailable workspaces removable via menu, so that cleanup is low friction.
29. As a coding user, I want empty workspace state to show `无线程`, so that status is explicit.
30. As a coding user, I want long session lists to default to 5 items with expand/collapse, so that list height stays controlled.
31. As a coding user, I want relative time format (`刚刚`, `分`, `小时`, `天`), so that time is scannable.
32. As a coding user, I want OpenClaw deletion behavior preserved and limited, so that risk is controlled.
33. As a coding user, I want thread and voice sessions not to expose delete from sidebar for now, so that accidental destructive actions are reduced.
34. As a coding user, I want `线程` workspace sessions loaded once globally on mount, so that initial browse is complete.
35. As a coding user, I want subsequent refresh to be interaction-driven only, so that idle filesystem scans are avoided.
36. As a coding user, I want workspace expand and workspace title click to trigger refresh, so that I can pull latest data explicitly.
37. As a coding user, I want existing OpenClaw/voice sync behavior retained, so that non-thread behavior does not regress.
38. As a coding user, I want search to remain available, so that large histories remain navigable.
39. As a coding user, I want search to filter in place by category, so that structure is preserved while searching.
40. As a coding user, I want empty-state copy to differ by category (`无对话/无语音会话/无线程`), so that meaning is unambiguous.
41. As a coding user, I want custom workspace menu to include rename, remove-from-list, and open-in-finder, so that management is complete.
42. As a coding user, I want remove-from-list to never delete disk content, so that operation is safe.
43. As a coding user, I want fixed categories to remain non-removable and non-renamable, so that IA consistency is guaranteed.
44. As a coding user, I want `极智/小九` removed from this sidebar IA, so that the left nav is strictly the chosen 3-category model.
45. As a coding user, I want global new-thread to open new voice dialog when active context is realtime voice, so that intent maps to capability.
46. As a coding user, I want global new-thread in OpenClaw context to create a new chat thread, so that behavior is intuitive.
47. As a coding user, I want global new-thread in workspace context to open code-agent new thread with workspace URL context, so that coding starts immediately.
48. As a coding user, I want workspace list persistence across restarts, so that setup is one-time.
49. As a coding user, I want collapsed/expanded state persistence for categories and workspaces, so that layout preference remains stable.
50. As a coding user, I want unmatched locale keys to safely fallback via default values in this phase, so that partial i18n rollout does not break UI.

## Implementation Decisions

- Adopt a fixed three-category information architecture in the sidebar: `线程`, `OpenClaw`, `实时语音`.
- Remove explicit `CLI` first-level category naming from sidebar UX.
- Place all custom code workspaces under `线程`.
- Keep `OpenClaw` and `实时语音` as fixed category nodes.
- Category nodes are collapsible and default expanded.
- Workspace node interaction is toggle-only (expand/collapse); navigation is session-row-driven.
- Session rows are rendered as compact items with title + relative time only.
- Session list pagination behavior is local UI truncation: show first 5, with per-section expand/collapse.
- Keep in-place search filtering by category section.
- Use category-specific empty-state copy: `无对话`, `无语音会话`, `无线程`.
- Remove `极智`/`小九` from this sidebar IA.
- Use deterministic workspace identity with hash ID:
  - key source: normalized absolute workspace path
  - hash function: `sha256`
  - display ID: truncated hash string
- Persist workspace list and sidebar state in renderer persisted settings state.
- Run one-time migration from legacy single workspace root into new thread workspace list.
- Initial load behavior for thread workspaces:
  - one full workspace-session fetch on sidebar mount
  - no background polling
  - refresh only on explicit user interaction (workspace expand or workspace title click)
- Keep existing refresh/sync behavior for OpenClaw and realtime voice data sources.
- Routing contract for thread sessions:
  - use URL workspace context and session context for code-agent navigation
  - URL workspace context is authoritative
  - authoritative URL context is written back into current workspace state
- New thread actions:
  - global new-thread targets active context
  - active context derives from most recent user interaction context
  - workspace hover `new thread` opens code-agent new-thread state with workspace URL context
  - OpenClaw hover `new thread` creates a new chat session
  - realtime voice hover `new thread` opens voice dialog entry flow
- Workspace menu contract (custom workspaces only):
  - rename
  - remove from list (non-destructive)
  - open in file manager
- Invalid workspace handling:
  - keep visible
  - mark unavailable
  - disable new-thread action
  - allow removal via menu
- Deletion policy in sidebar rows:
  - allow deletion only for OpenClaw sessions (existing behavior alignment)
  - no delete controls for thread/voice session rows in this iteration
- Localization rollout decision for this iteration:
  - prioritize Chinese key updates
  - use code-level default fallback values for non-updated locales

### Proposed Deep Modules

- `Sidebar Information Architecture Layer`
  - Owns fixed category model, section ordering, expand/collapse state, and category rendering contracts.
- `Thread Workspace Registry`
  - Owns custom workspace persistence, deterministic identity, migration, duplicate detection, and recent-usage ordering.
- `Workspace Session Aggregator`
  - Owns session fetch orchestration for thread workspaces, interaction-triggered refresh, and unavailable workspace classification.
- `Unified Sidebar Action Router`
  - Maps row and button actions to navigation and thread-creation behaviors across contexts.
- `Sidebar Search Projection`
  - Applies in-place filtering while preserving category and workspace grouping semantics.
- `Sidebar State Persistence Boundary`
  - Encapsulates persisted UI state (expanded/collapsed, active context, workspace metadata) and protects rendering layer from storage details.

## Testing Decisions

- Good tests must validate externally visible behavior and stable UI contracts rather than component internals.
- Good tests must assert navigation, visible grouping, action availability, and persistence outcomes.
- Good tests must avoid coupling to transient styling implementation.

### Modules to Test

- `Sidebar Information Architecture Layer`
  - Verify fixed category presence, order, and collapse behavior.
- `Thread Workspace Registry`
  - Verify add/remove/rename semantics, deterministic ID generation, duplicate handling, and migration from legacy workspace state.
- `Workspace Session Aggregator`
  - Verify one-time initial full fetch, interaction-triggered refresh, and no polling behavior.
- `Unified Sidebar Action Router`
  - Verify click behavior across category rows, workspace rows, and session rows.
  - Verify context-aware global new-thread behavior.
- `Sidebar Search Projection`
  - Verify in-place filtered rendering while retaining category structure.
- `Unavailable Workspace UX Contract`
  - Verify unavailable marking, disabled actions, and recoverable removal.

### Prior Art for Testing

- Existing store-level tests for chat/session state transitions and history loading behavior.
- Existing page-level interaction tests for route navigation and sidebar-triggered actions.
- Existing host-API boundary tests validating behavior-driven contracts for data fetch and side-effect actions.

## Out of Scope

- File tree rendering under workspace nodes.
- Open-file explorer inside sidebar.
- Cross-category drag-and-drop organization.
- Session deletion support for thread and realtime voice entries.
- Locale-complete copy updates for all languages in this phase.
- Any backend protocol redesign for voice session lifecycle.
- New workspace-wide analytics and telemetry schema changes.
- Re-introducing `极智/小九` into this specific sidebar IA.

## Further Notes

- This PRD intentionally optimizes for predictable navigation and workspace-centered coding flow over feature breadth.
- The design keeps compatibility with existing backend route and session models while changing sidebar orchestration and persistence strategy.
- The iteration is intentionally constrained to session-list UX for thread workspaces; file-tree capability is deferred to a later phase.
