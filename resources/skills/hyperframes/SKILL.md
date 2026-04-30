---
name: hyperframes
description: "HyperFrames by HeyGen: write HTML, render video. Author compositions with HTML + CSS + GSAP, generate captions/voiceovers, add audio-reactive visuals and scene transitions, install reusable registry blocks, and turn any website into a video. Use when the user wants to build a video from HTML, animate kinetic typography, add synced captions or TTS, render motion graphics, or convert a webpage into a finished promo."
metadata:
  openclaw:
    emoji: "🎬"
  author:
    name: "HeyGen"
    email: "hyperframes@heygen.com"
    url: "https://hyperframes.heygen.com"
  homepage: "https://hyperframes.heygen.com"
  repository: "https://github.com/heygen-com/hyperframes"
  license: "Apache-2.0"
---

# HyperFrames by HeyGen

HTML is the source of truth for video. A composition is an HTML file with `data-*` attributes for timing, a GSAP timeline for animation, and CSS for appearance. The framework handles clip visibility, media playback, and timeline sync — you author the look, motion, and pacing in plain web code, then the CLI captures and renders it to MP4.

This umbrella skill routes between five specialist sub-skills. Pick the one that matches the user's intent and continue from there.

## Bundled Sub-Skills

- **hyperframes** (`skills/hyperframes/SKILL.md`) — Composition authoring: HTML + CSS + GSAP, visual styles, palettes, house style, motion principles, transitions, captions, audio-reactive visuals, typography. Read this first whenever you write `index.html` or a sub-composition.
- **hyperframes-cli** (`skills/hyperframes-cli/SKILL.md`) — Command surface: `hyperframes init / lint / validate / preview / render / transcribe / tts / inspect / doctor / browser`. Read when running, debugging, or shipping a composition.
- **hyperframes-registry** (`skills/hyperframes-registry/SKILL.md`) — `hyperframes add` to install reusable blocks and components (social overlays, shader transitions, data viz, effects). Read when reaching for prebuilt building blocks instead of writing from scratch.
- **gsap** (`skills/gsap/SKILL.md`) — GSAP idioms used inside HyperFrames: tweens, timelines, easing, stagger, performance, audio-data extraction. Read when authoring or refining the motion layer.
- **website-to-hyperframes** (`skills/website-to-hyperframes/SKILL.md`) — 7-step pipeline that captures a URL, designs a storyboard, generates VO, builds the composition, and validates. Read when the input is a live website and the output is a video.

When you need to author motion, render output, or install components, jump to the corresponding sub-skill directly. Do not ask the user to invoke them separately.

## Use This Skill When

- the user wants to build any HTML-based video (promo, title card, kinetic typography, data viz, motion graphics)
- the request spans multiple domains: composition authoring + CLI + registry + motion
- the user says "turn this website into a video" or similar URL-to-video asks
- the user wants synced captions, voiceover/TTS, or audio-reactive animation but hasn't named the implementation surface
- the user mentions HyperFrames, HeyGen video framework, or "HTML → video" without more specifics

## Do Not Stay Here When

- the task is clearly *only* writing an `index.html` composition → go to `skills/hyperframes/SKILL.md`
- the task is clearly *only* a CLI invocation, render, or transcript → go to `skills/hyperframes-cli/SKILL.md`
- the task is clearly *only* installing a registry block/component → go to `skills/hyperframes-registry/SKILL.md`
- the task is clearly *only* a GSAP timeline / easing / stagger question → go to `skills/gsap/SKILL.md`
- the input is a live URL and the output is a finished video → go to `skills/website-to-hyperframes/SKILL.md`

Once the intent is clear, route to the most specific specialist skill and continue from there.

## Routing Rules

1. Classify the request before designing or coding:
   - `Composition authoring`: writing or editing HTML compositions, palettes, typography, transitions, captions, audio-reactive visuals.
   - `CLI ops`: init, lint, validate, preview, render, transcribe, tts, inspect, doctor, browser.
   - `Registry add`: pulling in pre-built blocks/components (social overlays, shader transitions, data viz).
   - `Motion deep-dive`: GSAP timelines, easing curves, stagger, performance.
   - `Website → video`: URL is the input, MP4 is the output.
2. Route to the specialist skill immediately after classification.
3. Keep one coherent plan across the routed skills. Do not let composition, CLI, registry, and motion decisions drift apart.

## Default Workflow

1. **Lock the visual identity first.** Before writing any composition HTML, you MUST have a `DESIGN.md` (or `visual-style.md`) defining colors, fonts, motion rules, and "what NOT to do". If none exists and the user hasn't named a style, ask 3 questions: mood, light/dark canvas, brand colors/fonts/references. Generate a minimal `DESIGN.md` from the answers. See `skills/hyperframes/SKILL.md` "Visual Identity Gate" — do not skip it.
2. **Build layout before animation.** Position every element where it should be at its hero frame using static CSS. Use `width: 100%; height: 100%; padding: Npx; display: flex; box-sizing: border-box` on `.scene-content`. NEVER use `position: absolute; top: Npx` on a content container. Reserve `position: absolute` for decoratives only.
3. **Choose the implementation track:**
   - Single composition → write `index.html` + sub-compositions following the HyperFrames composition contract.
   - Need pre-built blocks → use `hyperframes add` from the registry sub-skill.
   - Live URL → run the 7-step `website-to-hyperframes` pipeline.
4. **Animate using GSAP.** Only `paused: true` timelines registered on `window.__timelines["<composition-id>"]`. No `Math.random()`, no `Date.now()`, no `repeat: -1`. Synchronous timeline construction only.
5. **Add captions / TTS / audio-reactive layers** via the references in `skills/hyperframes/references/`.
6. **Add scene transitions on every multi-scene composition.** No jump cuts. Entrance animations on every element. NEVER use exit animations except on the final scene — the transition IS the exit.
7. **Run the quality gate before declaring done:**
   - `npx hyperframes lint`
   - `npx hyperframes validate` (WCAG contrast audit)
   - `npx hyperframes inspect` (visual layout audit)
   - For new compositions or significant motion changes, run the animation map: `node skills/hyperframes/scripts/animation-map.mjs <composition-dir> --out <composition-dir>/.hyperframes/anim-map`.

## Non-Negotiable Rules (Carry Across All Sub-Skills)

These come from the core `hyperframes` skill and apply everywhere — repeat them up here so a router agent never breaks them:

- **Deterministic only.** No `Math.random()`, no `Date.now()`, no time-based logic. Use a seeded PRNG (e.g. mulberry32) for pseudo-randomness.
- **Animate visual properties only** (`opacity`, `x`, `y`, `scale`, `rotation`, `color`, `backgroundColor`, `borderRadius`, transforms). Never animate `visibility` or `display`. Never call `video.play()` / `audio.play()` — the framework owns playback.
- **No `repeat: -1`.** Calculate finite repeats from composition duration: `repeat: Math.ceil(duration / cycleDuration) - 1`.
- **Synchronous timeline construction.** Never build timelines inside `async`/`await`, `setTimeout`, or Promises. The capture engine reads `window.__timelines` synchronously after page load.
- **Standalone compositions do NOT use `<template>`.** Only sub-compositions loaded via `data-composition-src` use `<template>`. Wrapping the main `index.html` in `<template>` hides everything from the browser and breaks rendering.
- **Video must be `muted playsinline` + a separate `<audio>` element** for audio. Never use a `<video>` for sound.
- **Use `data-track-index` (not `data-layer`) and `data-duration` (not `data-end`).** `data-track-index` does not affect z-order — use CSS `z-index` for visual layering.
- **No `<br>` in content text.** Let text wrap via `max-width`. Exception: short display titles where each word is deliberately on its own line.
- **Every multi-scene composition must use transitions.** No jump cuts. Entrance animations on every element. NO exit animations except on the final scene.

## Requirements

The CLI invokes via `npx hyperframes` and needs:

- Node.js ≥ 22
- FFmpeg on `PATH`

See [hyperframes.heygen.com/quickstart](https://hyperframes.heygen.com/quickstart) for full setup.

## Output Expectations

- Execute the full workflow end-to-end in one run. Do not stop after outputting a plan or storyboard.
- For authoring requests, produce a working `index.html` that lints, validates, and inspects clean.
- For website-to-video requests, follow all 7 steps from `skills/website-to-hyperframes/`.
- For registry requests, prefer `hyperframes add` over hand-rolled equivalents when a published block fits.
- For mixed requests, default to authoring a fresh composition unless the user named a registry block, a URL source, or a CLI-only task.

## References

- [README.md](./README.md) — Plugin overview and quickstart.
- [plugin.json](./plugin.json) — Original Codex plugin manifest from HeyGen (kept for parity / attribution).
- Core composition contract: `skills/hyperframes/SKILL.md`
- CLI surface: `skills/hyperframes-cli/SKILL.md`
- Registry blocks/components: `skills/hyperframes-registry/SKILL.md`
- GSAP idioms: `skills/gsap/SKILL.md`
- Website → video pipeline: `skills/website-to-hyperframes/SKILL.md`

## Examples

- "Turn this website into a 20-second product promo."
- "Create an animated title card with kinetic type."
- "Add synced captions to this voiceover."
- "Build a 30s data-in-motion explainer for these stats."
- "Render this composition to 1080p MP4."
- "Install the social-overlay block from the HyperFrames registry."
- "Add a shader-driven crossfade between scene 2 and scene 3."
