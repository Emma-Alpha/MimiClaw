/**
 * Built-in plugin catalog for MimiClaw.
 * Used as default data source so the plugins page is never empty.
 */

import type { MarketplaceCatalog } from '@/types/claude-plugin';

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

/** Prompt text shown in the hero carousel card for each plugin */
export const HERO_PROMPTS: Record<string, string> = {
  'computer-use': '播放一个播放列表，帮我进入专注状态',
  'gmail': '帮我回复所有未读邮件',
  'slack': '每天早上帮我准备站会内容',
  'google-calendar': '安排一个定期的 1:1 会议',
  'google-drive': '每周五帮我写周报',
  'linear': '为这些 bug bash 发现创建工单',
};

export const builtinCatalog: MarketplaceCatalog = {
  name: BUILTIN_MARKETPLACE_NAME,
  description: 'MimiClaw official plugin catalog',
  plugins: [
    // ── Featured ─────────────────────────────────────────────────────
    {
      id: 'computer-use',
      name: 'Computer Use',
      description: 'Control Mac apps from MimiClaw',
      longDescription:
        'Use Computer Use to interact with native Mac applications. It can click, drag, type, scroll, and read accessibility information from any running app.',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
      developerName: 'OpenAI',
      capabilities: ['Click', 'Drag', 'Type', 'Scroll', 'Read accessibility'],
    },
    {
      id: 'browser-use',
      name: 'Browser Use',
      description: 'Control the in-app browser with MimiClaw',
      longDescription:
        'Browse the web, fill forms, click buttons, and extract information from any website — all within MimiClaw.',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
      developerName: 'OpenAI',
      capabilities: ['Web Browsing', 'Form Filling', 'Data Extraction'],
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

    // ── Coding ───────────────────────────────────────────────────────
    {
      id: 'game-studio',
      name: 'Game Studio',
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
