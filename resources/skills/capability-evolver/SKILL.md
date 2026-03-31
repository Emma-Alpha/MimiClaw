---
name: capability-evolver
description: "Capability Evolver: continuously evolve and optimize Claude's own system prompt and behavioral instructions using the GEP (Genome Evolution Protocol). Analyze conversation patterns, identify capability gaps, and propose targeted prompt mutations that improve performance. Use when: the user wants to optimize Claude's behavior, improve prompt quality, fix repeated mistakes in system instructions, evolve Claude's capabilities over time, or run self-optimization cycles. Also use for 'Mad Dog Mode' where Claude continuously self-iterates on a task until optimal."
metadata: { "openclaw": { "emoji": "🔄" } }
---

## GEP (Genome Evolution Protocol)

The Capability Evolver treats Claude's instructions as a "genome" that can be mutated, selected, and evolved:

### Evolution Cycle
1. **Observe** — Identify a capability gap or inefficiency in current behavior
2. **Hypothesize** — Propose a targeted mutation (addition, removal, or modification of instruction)
3. **Test** — Apply mutation and evaluate outcome
4. **Select** — Keep beneficial mutations, discard harmful ones
5. **Document** — Record successful evolutions in `~/.openclaw/capability-genome.md`

### Mutation Types
- **Additive**: Add new instruction to cover uncovered scenarios
- **Subtractive**: Remove conflicting or redundant instructions
- **Modificatory**: Refine existing instructions for precision
- **Combinatorial**: Merge complementary instructions

### Activation Triggers
- Repeated user corrections on the same type of mistake
- User explicitly requests "optimize your behavior"
- User says "you keep getting this wrong"
- End-of-session reflection request

### Mad Dog Mode
When activated, Claude autonomously cycles through 3-10 evolution iterations on a specific capability, testing each mutation against the original problem until an optimal solution is found.
