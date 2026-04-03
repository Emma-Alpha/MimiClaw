import agents from '../zh/agents.json';
import channels from '../zh/channels.json';
import chat from '../zh/chat.json';
import common from '../zh/common.json';
import cron from '../zh/cron.json';
import dashboard from '../zh/dashboard.json';
import settings from '../zh/settings.json';
import setup from '../zh/setup.json';
import skills from '../zh/skills.json';

const defaultResources = {
  common,
  settings,
  dashboard,
  chat,
  channels,
  agents,
  skills,
  cron,
  setup,
} as const;

export default defaultResources;
