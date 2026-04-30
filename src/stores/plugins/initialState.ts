/**
 * Plugins store initial state.
 *
 * Built-in catalog constants and hero prompts live here so the page is never empty
 * and the store is the single source of truth for plugin data.
 */
import { pluginIcons } from '@/assets/plugins';
import type { MarketplaceCatalog } from '@/types/claude-plugin';

import type { PluginsStoreState } from './types';

// ─── built-in constants ──────────────────────────────────────────────────────

export const BUILTIN_MARKETPLACE_NAME = 'MimiClaw official';

export const FEATURED_PLUGIN_IDS = [
  'computer-use',
  'browser-use',
  'game-studio',
  'spreadsheets',
];

export const HERO_PLUGIN_NAMES = [
  'computer-use',
  'gmail',
  'slack',
  'google-calendar',
  'google-drive',
  'linear',
];

export const HERO_PROMPTS: Record<string, string> = {
  'computer-use': '播放一个播放列表，帮我进入专注状态',
  'gmail': '帮我回复所有未读邮件',
  'slack': '每天早上帮我准备站会内容',
  'google-calendar': '安排一个定期的 1:1 会议',
  'google-drive': '每周五帮我写周报',
  'linear': '为这些 bug bash 发现创建工单',
};

// ─── built-in catalog ────────────────────────────────────────────────────────

export const builtinCatalog: MarketplaceCatalog = {
  name: BUILTIN_MARKETPLACE_NAME,
  description: 'MimiClaw official plugin catalog',
  plugins: [
    // ── Featured ─────────────────────────────────────────────────────
    {
      id: 'computer-use',
      name: 'Computer Use',
      icon: pluginIcons['computer-use'],
      description: 'Control Mac apps from MimiClaw',
      longDescription:
        'Use Computer Use to interact with native Mac applications. It can click, drag, type, scroll, and read accessibility information from any running app.',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'GitHub',
      developerName: 'GitHub',
      homepage: 'https://github.com/github/computer-use-mcp',
      capabilities: ['Click', 'Drag', 'Type', 'Scroll', 'Read accessibility'],
      mcpServerName: 'github-computer-use',
      mcpServerConfig: {
        command: 'npx',
        args: ['-y', '@github/computer-use-mcp'],
      },
    },
    {
      id: 'browser-use',
      name: 'Browser Use',
      icon: pluginIcons['browser-use'],
      description: 'Control the in-app browser with MimiClaw',
      longDescription:
        'Browse the web, fill forms, click buttons, and extract information from any website — all within MimiClaw.',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'MimiClaw',
      developerName: 'MimiClaw',
      capabilities: ['Web Browsing', 'Form Filling', 'Data Extraction'],
      mcpServerName: 'browser-use',
      mcpServerConfig: {
        command: 'node',
        args: ['__RESOURCES_PATH__/mcp-servers/browser-use-mcp.mjs'],
      },
    },
    {
      id: 'spreadsheets',
      name: 'Spreadsheets',
      description: 'Create and edit spreadsheets with AI',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
    },
    {
      id: 'presentations',
      name: 'Presentations',
      description: 'Create and edit presentations with AI',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
    },

    // ── Developer Tools ──────────────────────────────────────────────
    {
      id: 'github',
      name: 'GitHub',
      description: 'Triage issues, CI, and publish flows',
      categories: ['Developer Tools'],
      components: ['mcp', 'skills'],
      author: 'OpenAI',
      homepage: 'https://github.com',
    },
    {
      id: 'linear',
      name: 'Linear',
      description: 'Find and reference issues and projects',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://linear.app',
    },
    {
      id: 'statsig',
      name: 'Statsig',
      description: 'Bring your Statsig workspace into MimiClaw',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://statsig.com',
    },
    {
      id: 'vercel',
      name: 'Vercel',
      description: 'Deploy, manage projects, and check domains on Vercel',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://vercel.com',
    },
    {
      id: 'jira',
      name: 'Jira',
      description: 'Create and manage Jira issues and projects',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://www.atlassian.com/software/jira',
    },

    // ── Communication ────────────────────────────────────────────────
    {
      id: 'slack',
      name: 'Slack',
      description: 'Read and manage Slack',
      categories: ['Communication'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://slack.com',
    },
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Read and manage Gmail',
      categories: ['Communication'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://mail.google.com',
    },
    {
      id: 'outlook-email',
      name: 'Outlook Email',
      description: 'Read and manage Outlook email',
      categories: ['Communication'],
      components: ['mcp'],
      author: 'OpenAI',
    },

    // ── Productivity ─────────────────────────────────────────────────
    {
      id: 'notion',
      name: 'Notion',
      description: 'Notion workflows for specs, research, and knowledge base',
      categories: ['Productivity'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://notion.so',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Manage events, check availability, and schedule meetings',
      categories: ['Productivity'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://calendar.google.com',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Search, read, and create documents in Google Drive',
      categories: ['Productivity'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://drive.google.com',
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Manage Outlook calendar events and meetings',
      categories: ['Productivity'],
      components: ['mcp'],
      author: 'OpenAI',
    },
    {
      id: 'confluence',
      name: 'Confluence',
      description: 'Search and create Confluence pages and spaces',
      categories: ['Productivity'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://www.atlassian.com/software/confluence',
    },

    // ── Design ───────────────────────────────────────────────────────
    {
      id: 'figma',
      name: 'Figma',
      description: 'Get design context, screenshots, and metadata from Figma',
      categories: ['Design'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://figma.com',
    },
    {
      id: 'blender-mcp',
      name: 'Blender MCP',
      icon: pluginIcons['blender-mcp'],
      description: '通过 MimiClaw 控制 Blender 3D 建模',
      longDescription:
        '通过 AI 驱动的自动化控制 Blender：创建场景、操作 3D 对象、应用材质、执行 Python 代码，以及导入 Poly Haven 资产。',
      categories: ['Design'],
      components: ['mcp'],
      author: 'ahujasid',
      developerName: 'ahujasid',
      homepage: 'https://github.com/ahujasid/blender-mcp',
      capabilities: ['3D Modeling', 'Materials', 'Scene Management', 'Python Execution', 'Asset Import'],
      mcpServerName: 'blender',
      mcpServerConfig: {
        command: 'uvx',
        args: ['blender-mcp'],
      },
    },

    // ── Coding ───────────────────────────────────────────────────────
    {
      id: 'game-studio',
      name: 'Game Studio',
      icon: pluginIcons['game-studio'],
      description: 'Design, prototype, and ship browser games',
      longDescription:
        'Plan, prototype, and build browser games with guided workflows for gameplay systems, UI, asset pipelines, and playtesting across 2D and 3D projects.',
      categories: ['Coding'],
      components: ['skills'],
      author: 'OpenAI',
      developerName: 'OpenAI',
      capabilities: ['2D Games', '3D Games', 'Playtesting', 'Asset Pipeline', 'Game UI'],
      defaultPrompt: 'Design a browser game and plan the core loop',
      skills: [
        {
          name: 'Game Playtest',
          description: 'Run browser-game playtests and QA',
          badge: '技能',
          overview:
            'Use this skill to test browser games for new players experience them: through load, input, screen transitions, HUD reactivity, and visual state changes. Prefer browser automation and screenshot-based tests over code-only testing.\n\n## Steps\n1. Boot the game and confirm the first activatable screen.\n2. Play through one session of the core loop.\n3. Capture screenshots from representative states.\n4. Verify that UI elements respond to input correctly.\n5. Report findings at severity order with reproduction steps.\n\n## Notes\n- Prefer Playwright or equivalent browser automation already available in the repo.\n- Focus on what a first-time player would notice: confusion, dead-ends, visual glitches.\n- Use screenshots to judge playfield resolution and HUD weight, not just code inspection.\n- When deterministic automation is not practical, do a structured manual pass and record observations in a markdown table.\n- Keep performance testing scoped to frame-budget and rendering-pipeline observations, not low-level profiling.',
        },
        {
          name: 'Game Studio',
          description: 'Route browser-game work to the right path',
          badge: '技能',
          overview:
            'This is the routing skill for browser game development. When the user describes a game idea or task, determine which specialized skill should handle it and delegate accordingly.',
        },
        {
          name: 'Game UI Frontend',
          description: 'Design browser-game HUDs, menus, and overlays',
          badge: '技能',
          overview:
            'Build and refine browser-game user interfaces: HUDs, menus, inventory screens, dialog boxes, and overlays. Use HTML/CSS or canvas-based UI depending on the game engine.',
        },
        {
          name: 'Phaser 2D Game',
          description: 'Build 2D browser games with Phaser',
          badge: '技能',
          overview:
            'Create 2D browser games using the Phaser framework. Handle scenes, sprites, physics, input, and audio. Follow Phaser best practices for asset loading and game state management.',
        },
        {
          name: 'React Three Fiber Game',
          description: 'Build React-hosted 3D browser games',
          badge: '技能',
          overview:
            'Build 3D browser games using React Three Fiber (R3F). Leverage React component patterns for scene management, use drei helpers, and integrate physics with rapier or cannon.',
        },
        {
          name: 'Sprite Pipeline',
          description: 'Generate and normalize 2D sprite animations',
          badge: '技能',
          overview:
            'Process, generate, and normalize 2D sprite sheets and animations. Handle frame extraction, atlas packing, and animation definition files for browser game engines.',
        },
        {
          name: 'Three WebGL Game',
          description: 'Build browser-game runtimes with Three.js',
          badge: '技能',
          overview:
            'Build browser games directly with Three.js. Manage scenes, cameras, lighting, materials, and post-processing. Optimize for web performance with LOD, instancing, and texture atlases.',
        },
        {
          name: 'Web 3D Asset Pipeline',
          description: 'Prepare and optimize browser-game 3D assets',
          badge: '技能',
          overview:
            'Prepare and optimize 3D assets for browser games. Handle model conversion (glTF/GLB), texture compression, mesh optimization, and LOD generation.',
        },
        {
          name: 'Web Game Foundations',
          description: 'Set browser-game architecture before implementation',
          badge: '技能',
          overview:
            'Plan the foundational architecture for a browser game project: directory structure, build tooling, engine choice, asset pipeline, and deployment strategy.',
        },
      ],
    },
    {
      id: 'hyperframes',
      name: 'HyperFrames by HeyGen',
      icon: pluginIcons['hyperframes'],
      description: 'Write HTML, render video',
      longDescription:
        'Build videos from HTML with HyperFrames. Author compositions with HTML + CSS + GSAP, use the CLI for init/preview/render/transcribe/tts, install reusable registry blocks and components, follow the GSAP animation reference, and turn any website into a video with the 7-step capture-to-video pipeline.',
      categories: ['Design'],
      components: ['skills'],
      author: 'HeyGen',
      developerName: 'HeyGen',
      homepage: 'https://hyperframes.heygen.com',
      capabilities: [
        'HTML Compositions',
        'GSAP Animation',
        'Captions & TTS',
        'Audio-Reactive Visuals',
        'Scene Transitions',
        'Website-to-Video',
      ],
      requirements: [
        { name: 'node', label: 'Node.js', minVersion: '22' },
        { name: 'ffmpeg', label: 'FFmpeg' },
      ],
      defaultPrompt: 'Turn this website into a 20-second product promo',
      skills: [
        {
          name: 'HyperFrames',
          description: 'Author HTML video compositions with GSAP',
          badge: '技能',
          overview:
            'Create video compositions, animations, title cards, overlays, captions, voiceovers, audio-reactive visuals, and scene transitions in HyperFrames HTML. HTML is the source of truth for video. A composition is an HTML file with data-* attributes for timing, a paused GSAP timeline registered on window.__timelines, and CSS for appearance. Use when building any HTML-based video content, adding captions or subtitles synced to audio, generating TTS narration, creating audio-reactive animation, or adding scene transitions.',
        },
        {
          name: 'HyperFrames CLI',
          description: 'Init, lint, preview, render, transcribe, tts',
          badge: '技能',
          overview:
            'HyperFrames CLI tool — hyperframes init, lint, inspect, preview, render, transcribe, tts, doctor, browser, info, upgrade, compositions, docs, benchmark. Use when scaffolding a project, linting, validating, inspecting visual layout, previewing in the studio, rendering to video, transcribing audio, generating TTS, or troubleshooting the HyperFrames environment. Requires Node.js ≥ 22 and FFmpeg on PATH.',
        },
        {
          name: 'HyperFrames Registry',
          description: 'Install reusable blocks and components',
          badge: '技能',
          overview:
            'Install and wire registry blocks and components into HyperFrames compositions. Use when running hyperframes add, installing a block or component, wiring an installed item into index.html, or working with hyperframes.json. Covers the add command, install locations, block sub-composition wiring, component snippet merging, and registry discovery.',
        },
        {
          name: 'GSAP',
          description: 'GSAP animation reference for HyperFrames',
          badge: '技能',
          overview:
            'GSAP animation reference for HyperFrames. Covers gsap.to(), from(), fromTo(), easing, stagger, defaults, timelines (gsap.timeline(), position parameter, labels, nesting, playback), and performance (transforms, will-change, quickTo). Use when writing GSAP animations in HyperFrames compositions.',
        },
        {
          name: 'Website to HyperFrames',
          description: 'Turn any URL into a finished video',
          badge: '技能',
          overview:
            'Capture a website and create a HyperFrames video from it. Use when a user provides a URL and wants a video, says "capture this site", "turn this into a video", "make a promo from my site", or wants a social ad, product tour, or any video based on an existing website. Runs the 7-step capture-to-video pipeline: capture, design, script, storyboard, voiceover, build, validate.',
        },
      ],
    },
    {
      id: 'godot-mcp',
      name: 'Godot MCP',
      icon: pluginIcons['godot-mcp'],
      description: 'Control the Godot game engine from MimiClaw',
      longDescription:
        'Launch the Godot editor, run and stop projects, capture debug output, manage scenes and nodes, load sprites, and handle UID operations — all through AI-driven automation.',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'Coding-Solo',
      developerName: 'Coding-Solo',
      homepage: 'https://github.com/Coding-Solo/godot-mcp',
      capabilities: ['Launch Editor', 'Run Projects', 'Scene Management', 'Debug Output', '3D Export'],
      mcpServerName: 'godot-mcp',
      mcpServerConfig: {
        command: 'npx',
        args: ['-y', '@coding-solo/godot-mcp'],
      },
    },
    {
      id: 'datadog',
      name: 'Datadog',
      description: 'Monitor applications, query metrics, and manage alerts',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://www.datadoghq.com',
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Manage payments, subscriptions, and billing with Stripe',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://stripe.com',
    },
    {
      id: 'sentry',
      name: 'Sentry',
      description: 'Track errors, monitor performance, and debug issues',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://sentry.io',
    },
    {
      id: 'supabase',
      name: 'Supabase',
      description: 'Manage databases, auth, and storage on Supabase',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://supabase.com',
    },
    {
      id: 'docker',
      name: 'Docker',
      description: 'Build, run, and manage containers with Docker',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://docker.com',
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      description: 'Manage Workers, Pages, DNS, and CDN on Cloudflare',
      categories: ['Coding'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://cloudflare.com',
    },
  ],
};

// ─── initial state ───────────────────────────────────────────────────────────

export const initialPluginsState: PluginsStoreState = {
  enabledPlugins: {},
  marketplaceSources: {},
  catalogs: { [BUILTIN_MARKETPLACE_NAME]: builtinCatalog },
  loading: false,
  error: null,
  skills: { global: [], project: [] },
  skillsLoading: false,
  mcpStatuses: {},
  mode: 'browse',
  activeTab: 'plugins',
  manageTab: 'plugins',
  searchQuery: '',
  selectedMarketplace: null,
  selectedCategory: null,
};
