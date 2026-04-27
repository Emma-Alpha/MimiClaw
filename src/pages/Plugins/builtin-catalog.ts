/**
 * Built-in plugin catalog — extracted from Codex (openai-curated marketplace).
 * Used as default data source so the plugins page is never empty.
 */

import type { MarketplaceCatalog } from '@/types/claude-plugin';

export const BUILTIN_MARKETPLACE_NAME = 'Codex official';

export const FEATURED_PLUGIN_IDS = [
  'computer-use',
  'browser-use',
  'spreadsheets',
  'presentations',
];

export const HERO_PLUGIN_NAMES = [
  'computer-use',
  'gmail',
  'slack',
  'google-calendar',
  'google-drive',
  'linear',
];

export const builtinCatalog: MarketplaceCatalog = {
  name: BUILTIN_MARKETPLACE_NAME,
  description: 'Codex official plugin catalog',
  plugins: [
    {
      id: 'computer-use',
      name: 'Computer Use',
      description: 'Control Mac apps from Codex',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
      icon: 'MCP_AVATAR',
    },
    {
      id: 'browser-use',
      name: 'Browser Use',
      description: 'Control the in-app browser with Codex',
      categories: ['Featured'],
      components: ['mcp'],
      author: 'OpenAI',
      icon: 'MCP_AVATAR',
    },
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
      id: 'slack',
      name: 'Slack',
      description: 'Read and manage Slack',
      categories: ['Communication'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://slack.com',
    },
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
      description: 'Bring your Statsig workspace into Codex',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://statsig.com',
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
      id: 'figma',
      name: 'Figma',
      description: 'Get design context, screenshots, and metadata from Figma',
      categories: ['Design'],
      components: ['mcp'],
      author: 'OpenAI',
      homepage: 'https://figma.com',
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
    {
      id: 'jira',
      name: 'Jira',
      description: 'Create and manage Jira issues and projects',
      categories: ['Developer Tools'],
      components: ['mcp'],
      author: 'Community',
      homepage: 'https://www.atlassian.com/software/jira',
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
  ],
};
