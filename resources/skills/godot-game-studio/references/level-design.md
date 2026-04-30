# Level Design Guide

## Pacing Curve

Every level needs a pacing plan — tension cannot be constant.

```
Tension
  ▲
  │     ╱╲        ╱╲╱╲
  │    ╱  ╲      ╱      ╲     ╱╲
  │   ╱    ╲    ╱        ╲   ╱  ╲
  │  ╱      ╲  ╱          ╲ ╱    ╲
  │ ╱        ╲╱            ╲      ╲___
  │╱ Intro   Rest  Build    Climax  Reward
  └──────────────────────────────────────▶ Time
```

### Sections

1. **Introduction** — Teach the level's core mechanic or theme. Low danger, clear guidance.
2. **Exploration** — Open up the space. Let players discover at their pace.
3. **Challenge Escalation** — Increase difficulty gradually. Layer mechanics.
4. **Rest Point** — Safe area with resources. Breathing room before climax.
5. **Climax** — Peak challenge. Boss fight, puzzle climax, or set piece.
6. **Reward** — Clear payoff. New ability, story revelation, or visual spectacle.

## Difficulty Gradient

### Teaching Through Design

```
Level 1: Introduce jump
├── Safe gap to jump (can't miss)
├── Slightly wider gap (need timing)
├── Gap with collectible mid-air (reward good jump)
└── Gap with enemy on other side (combine jump + awareness)

Level 2: Introduce wall jump (builds on Level 1's jump)
├── Mandatory wall jump in safe environment
├── Wall jump chain (2 walls)
├── Wall jump with timed obstacle
└── Wall jump escape sequence (pressure)
```

### Difficulty Levers

| Lever | Easy | Medium | Hard |
|-------|------|--------|------|
| Enemy count | Fewer | Standard | More |
| Enemy aggression | Passive | Normal | Aggressive |
| Resource availability | Abundant | Balanced | Scarce |
| Time pressure | None | Soft | Hard deadline |
| Checkpoint frequency | Every room | Every section | Level start only |
| Puzzle complexity | Obvious solution | Some exploration | Hidden mechanics |

## Spatial Design Principles

### Guidance (Wayfinding)

- **Light**: Bright areas attract, dark areas repel or create mystery.
- **Color**: Distinct color for interactive objects, paths, and hazards.
- **Architecture**: Arches, corridors, and lines lead the eye.
- **Sound**: Audio cues guide toward objectives.
- **Landmarks**: Unique, visible reference points for orientation.

### Composition

- **Leading lines**: Direct player movement and attention.
- **Framing**: Use architecture to frame important elements.
- **Negative space**: Empty areas draw attention to what's present.
- **Height variation**: Multi-level spaces create interesting traversal.

### Combat Arenas

```
Good combat arena:
┌──────────────────────────────────────┐
│  cover    ╱  open area  ╲    cover   │
│  ┌──┐   ╱               ╲   ┌──┐   │
│  └──┘  ╱    PLAYER        ╲  └──┘   │
│       ╱      START         ╲         │
│  ┌──┐ ╲                   ╱  ┌──┐   │
│  └──┘  ╲    elevation    ╱   └──┘   │
│         ╲    change     ╱            │
│  entry   ╲             ╱    exit     │
│  ────>    ╲           ╱    ────>     │
└──────────────────────────────────────┘

Elements:
- Multiple cover positions
- Flanking routes
- Elevation changes
- Clear entry/exit
- Space to maneuver
```

## Metrics and Playtesting

### What to Measure

- **Completion time**: Is the level too long or too short?
- **Death locations**: Where do players die most? (heat map)
- **Backtracking**: Are players getting lost?
- **Item usage**: Are resources being used or hoarded?
- **Quit points**: Where do players give up?

### Target Metrics

| Metric | Target | Red Flag |
|--------|--------|----------|
| Level completion rate | > 80% | < 50% |
| Average completion time | Within 20% of design target | > 50% off |
| Death rate per section | < 3 average | > 5 in non-boss areas |
| Backtracking rate | < 20% of playtime | > 40% |
| Resource utilization | 60-80% used | < 30% (too easy) or 100% (too hard) |

## Common Anti-Patterns

- **Dead ends without reward** — frustrating backtracking.
- **Difficulty spikes** — sudden jumps without preparation.
- **Empty hallways** — space without purpose or interest.
- **Unavoidable damage** — hits player can't react to.
- **Identical rooms** — player loses spatial orientation.
- **Over-tutorializing** — text boxes for obvious mechanics.
- **One-way doors without warning** — can't return for missed items.
