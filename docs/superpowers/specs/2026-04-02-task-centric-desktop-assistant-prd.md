# PRD: Task-Centric General Desktop Assistant

## Suggested Issue Title

Task-Centric Desktop Assistant: turn one instruction into a trackable, resumable, result-oriented task

## Problem Statement

Users can already access many powerful capabilities in the product, including chat, voice, channels, skills, cron, agents, and code assistance. The current experience is capable, but it is still organized primarily around sessions, feature pages, and tool surfaces rather than around the user's real job to be done.

From the user's perspective, the product still feels too much like an AI control panel or chat client:

- I can talk to the assistant, but it is not always clear whether I am having a conversation or delegating a real task.
- I can access many features, but it is not obvious what the primary path is.
- I can get responses, but the product does not consistently present a clear, verifiable result with explicit next steps.
- I can use voice, but voice currently feels like a separate mode rather than another way to assign work to the same assistant.
- I can revisit sessions, but the product does not yet center "the thing I asked the assistant to do" as the primary recoverable object.

For a general desktop assistant, this creates a positioning and product-usage gap. The intended user should feel like they are assigning work to a responsible assistant that can understand the request, make low-risk progress on its own, ask for confirmation when needed, produce a verifiable result, and remain trackable afterward. Today, the product is strong on capability breadth but weaker on task ownership, completion framing, and task continuation.

## Solution

Evolve the product into a task-centric general desktop assistant while preserving a chat-first interaction model.

The key product shift is:

- The interface still looks and feels like chat.
- Sending a user instruction automatically creates a task entity behind the scenes.
- A thread should default to one task.
- The assistant should behave like the responsible owner of that task, not just a conversational responder.
- The chat timeline should primarily function as a visible work log and execution flow, while still preserving a natural conversational shell.
- The assistant should default to low-risk forward progress, show a short task receipt and plan, surface inline confirmation cards for risky actions, and finish with a verifiable result plus explicit remaining confirmation items.
- The sidebar and history should prioritize tasks that need attention instead of merely listing recent conversations.
- Voice should be treated as another input path into the same task system, especially for task kickoff and lightweight follow-ups.

This solution keeps the product general-purpose while still allowing strong vertical capabilities through task templates, suggested actions, and domain-specific execution paths.

## User Stories

1. As a desktop worker, I want to type one instruction and have it immediately become a task, so that I do not need to understand task management concepts before getting started.
2. As a desktop worker, I want the assistant to acknowledge what it understood and how it will begin, so that I can trust it is solving the right problem.
3. As a desktop worker, I want the assistant to start low-risk work without forcing a clarification round every time, so that the product feels proactive instead of conversationally slow.
4. As a desktop worker, I want high-risk actions to require explicit confirmation, so that I can trust the assistant around my files, content, and external systems.
5. As a desktop worker, I want the main interaction to still feel like chat, so that the product remains approachable and low-friction.
6. As a desktop worker, I want the chat stream to clearly show progress as work is being done, so that I can see what the assistant is actually doing.
7. As a desktop worker, I want the chat stream to behave like a work log, so that I can recover context later without rereading vague back-and-forth conversation.
8. As a desktop worker, I want each thread to correspond to one task by default, so that progress, output, and confirmation state do not get mixed together.
9. As a desktop worker, I want the assistant to produce a clear primary result, so that I know what the task actually delivered.
10. As a desktop worker, I want a task to support secondary outputs as attachments or related results, so that realistic multi-output work can still fit the model.
11. As a desktop worker, I want the product to show me whether a task is waiting on me, still running, completed, failed, or paused, so that I know what needs attention.
12. As a desktop worker, I want the sidebar to prioritize tasks that need progress, so that I can resume important work quickly.
13. As a desktop worker, I want every task row to show title, status, recent progress, and last activity, so that I can decide what to open without guessing.
14. As a desktop worker, I want task titles to be auto-generated from intent but editable later, so that the product stays lightweight while still remaining organized.
15. As a desktop worker, I want completion to mean a verifiable result was delivered, so that "done" never just means "the assistant replied."
16. As a desktop worker, I want tasks to remain resumable after completion or pause, so that I can continue iterating instead of starting over.
17. As a desktop worker, I want failed tasks to preserve context and state, so that recovery is possible without rebuilding the task from scratch.
18. As a desktop worker, I want the assistant to recommend a few likely next actions after delivery, so that momentum continues naturally.
19. As a desktop worker, I want those next actions to be mostly clickable system actions instead of vague prose suggestions, so that continuation is fast and reliable.
20. As a desktop worker, I want suggested actions to be grounded in task state and output type, so that the interface feels predictable.
21. As a desktop worker, I want the assistant to tell me when it is expanding context in low-risk ways, so that I stay informed without being interrupted too often.
22. As a desktop worker, I want the assistant to limit its default context to nearby, task-relevant material, so that it does not feel invasive.
23. As a desktop worker, I want voice input to create and continue the same kinds of tasks as text input, so that voice feels like a natural input method rather than a separate product.
24. As a desktop worker, I want voice to be especially good at quick task kickoff and lightweight follow-up, so that I can assign work when typing is inconvenient.
25. As a developer, I want code change tasks to produce a clear code-oriented result and continuation actions, so that the assistant feels built for real implementation work.
26. As an operations user, I want research, summarization, document preparation, and formatting tasks to produce a visible result I can verify and refine, so that the assistant feels useful beyond chat.
27. As an HR user, I want structured output and explicit next steps after drafting or organizing hiring materials, so that I can continue operational work quickly.
28. As an artist or audio-related user, I want media-adjacent tasks to still fit the same task system, so that the product can support file-centric and review-centric work as naturally as text work.
29. As a new user, I want a single strong input box with a few high-frequency starter tasks, so that the homepage feels focused rather than overwhelming.
30. As a new user, I want the homepage quick actions to reflect common jobs rather than internal product capabilities, so that I immediately understand what the assistant is for.
31. As a returning user, I want the homepage to retain a stable structure while lightly personalizing suggestions, so that it becomes smarter without becoming unpredictable.
32. As a product team member, I want the activation metric to reflect a user getting a real result and continuing once, so that optimization is aligned with actual value.
33. As a product team member, I want task-oriented telemetry around creation, confirmation, completion, continuation, and abandonment, so that we can learn whether the new model is working.
34. As a system designer, I want the model to stay general-purpose while supporting stronger vertical task templates, so that the product can serve broad desktop use while still differentiating in specific domains.
35. As a system designer, I want the transition from session-centric architecture to task-centric behavior to preserve current feature coverage, so that the product can evolve without breaking existing capabilities.

## Implementation Decisions

- Introduce a first-class task entity that sits above existing chat and voice sessions rather than replacing them immediately.
- Keep the front-end interaction chat-first, but treat "send" as automatic task creation.
- Define one thread as one task by default.
- Preserve the current natural conversation shell while shifting message semantics toward execution flow and work-log visibility.
- Add a task state model with the following initial states:
  1. `pending`
  2. `running`
  3. `awaiting_confirmation`
  4. `completed`
  5. `failed`
  6. `paused`
- Treat completion as delivery of a verifiable result plus an explicit list of any remaining confirmation items.
- Add a short task receipt phase after task creation. The receipt must include:
  - the assistant's understanding of the task
  - the immediate plan
  - any assumptions or confirmation boundaries
- Use a risk policy with three levels:
  - execute directly for low-risk actions
  - inform without interrupting for low-risk context expansion
  - require explicit confirmation for destructive, external, costly, or irreversible actions
- Hard-code the first version of mandatory confirmation categories:
  1. deleting or overwriting existing files
  2. bulk local modifications
  3. external send, publish, or channel sync actions
  4. actions with real cost or irreversible side effects
- Add inline confirmation cards inside the chat flow rather than using modal-first confirmation UX.
- Create a stable set of system-generated next actions derived from task state and result type, with model-generated suggestions only as supplemental guidance.
- Define the first result taxonomy as:
  1. text result
  2. file result
  3. table or structured-data result
  4. code-change result
  5. media result
  6. awaiting-confirmation result
- Use one primary result plus optional secondary results for every task.
- Let the system determine the primary result from task intent and current outcome, with model input allowed but not authoritative.
- Reorganize sidebar ranking around task urgency instead of pure recency, with ordering biased toward:
  1. awaiting confirmation
  2. running
  3. paused
  4. pending
  5. completed
  6. failed
- Ensure each task row exposes the minimum scan set:
  - generated title
  - current state
  - recent progress summary
  - last activity time
- Auto-generate task titles from the first instruction or the system's interpretation, while allowing manual rename later.
- Keep quick-start entry UX centered on one unified input box.
- Restrict homepage quick actions to four to six items.
- Choose homepage quick actions based on high-frequency user tasks rather than internal feature surfaces.
- Use a fixed homepage skeleton plus lightweight personalization from recent task history.
- Keep cold-start recommendations broadly useful, with role-based preferences only lightly influencing ranking.
- Treat voice as another input channel into the same task system rather than a separate product mode.
- Bias voice UX toward task kickoff and lightweight follow-up instead of long-running exclusive voice sessions.
- Introduce a task execution coordination layer that maps user instructions, existing session history, result typing, system actions, and confirmation boundaries into a stable task lifecycle.
- Maintain compatibility with current chat sessions, voice sessions, and existing host API boundaries while adding a task layer that can progressively absorb more behavior over time.
- Add product telemetry for:
  - task created
  - task receipt shown
  - task moved to confirmation
  - task completed
  - task resumed
  - next action clicked
  - task abandoned
  - activation achieved
- Use the new activation definition:
  - user receives a first verifiable result
  - user continues the same task once more

### Proposed Modules

- `Task Entity and State Layer`
  - Owns the task schema, lifecycle, result references, confirmation state, recent progress summary, and task/session relationships.
- `Task Execution Coordinator`
  - Accepts a new instruction, creates or resumes a task, emits the task receipt, classifies risk, and orchestrates state transitions.
- `Chat Execution Flow Renderer`
  - Renders chat as an execution-oriented work log while preserving conversational readability.
- `Task Sidebar and History Layer`
  - Replaces session-first navigation logic with task-first ordering and summaries while preserving session compatibility.
- `System Actions and Confirmation Layer`
  - Generates deterministic next actions, risk-aware confirmations, and output-type-driven continuation affordances.
- `Voice Task Entry Layer`
  - Bridges voice kickoff and lightweight follow-up into the same task model and execution flow.
- `Task Telemetry and Activation Layer`
  - Records user progress against the new task-centric success model.

## Testing Decisions

- Good tests should verify externally visible behavior and durable contracts rather than internal implementation details.
- Good tests should be stable under refactors of rendering internals, store structure, or event plumbing as long as user-visible behavior remains correct.
- Good tests should validate state transitions, sorting rules, confirmation boundaries, visible summaries, and action availability.
- Good tests should prefer task lifecycle outcomes and rendered interaction affordances over brittle snapshots of intermediate implementation structure.

### Modules To Test

- `Task Entity and State Layer`
  - Verify legal state transitions, completion rules, pause and resume behavior, failure preservation, and summary generation.
- `Task Execution Coordinator`
  - Verify send-creates-task behavior, short task receipt emission, low-risk auto-progress, confirmation gating, and correct result typing.
- `Task Sidebar and History Layer`
  - Verify urgency-first ordering, generated titles, progress summary display rules, and task-thread mapping behavior.
- `System Actions and Confirmation Layer`
  - Verify deterministic next-action generation from state and result type, as well as hard confirmation rules for risky actions.
- `Voice Task Entry Layer`
  - Verify voice-created tasks, shared task lifecycle behavior with text input, and lightweight follow-up behavior.
- `Task Telemetry and Activation Layer`
  - Verify event emission for task creation, completion, continuation, and activation qualification.

### Prior Art In The Codebase

- Existing store-level tests already validate chat session behavior, state transitions, cleanup logic, and history loading behavior.
- Existing input and page tests already validate high-level user interactions, send behavior, fetch-and-refresh flows, and page-visible state.
- Existing route and service tests already validate host API boundaries and behavior-driven contracts in the main-process layer.
- Existing telemetry tests already validate analytics lifecycle behavior and provide a pattern for event-focused assertions.

## Out of Scope

- A full replacement of all existing session infrastructure in the first iteration.
- A fully generalized project or workspace system for all users.
- Multi-task threads as a first-class behavior.
- Deep role-based homepages or heavy industry-specific navigation.
- Arbitrary user-defined task state machines.
- Full workflow automation across every channel integration on day one.
- Rich project-level collaboration, assignment, or multi-user task ownership.
- A comprehensive voice-only operating mode replacing the screen-first desktop workflow.
- Unlimited result type customization in the first version.
- Reworking every existing feature page into the new task model in the first release.

## Further Notes

- This PRD intentionally keeps the product positioned as a general desktop assistant.
- Domain-specific strength should come from templates, result handling, and execution paths rather than from changing the core positioning.
- The current product already has strong breadth. This work is about sharpening the core promise and making that breadth feel coherent.
- The assistant should feel like a responsible owner of a delegated task, not just a chat model with tools.
- The migration path should be additive first. The task layer should coexist with current session constructs long enough to avoid a brittle rewrite.
- Voice should be folded into the same mental model as text as early as possible to avoid long-term product fragmentation.
