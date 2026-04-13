import { describe, expect, it } from 'vitest';

import { buildMiniChatHeaderViewModel } from '@/pages/MiniChat/components/MiniChatHeader.view-model';
import type { CodeAgentStatus } from '../../shared/code-agent';

function makeStatus(overrides: Partial<CodeAgentStatus> = {}): CodeAgentStatus {
  return {
    adapter: 'emma-alpha-claude-code',
    runtime: 'node',
    sidecarPath: '/tmp/sidecar',
    vendorPath: '/tmp/vendor',
    vendorPresent: true,
    bunAvailable: true,
    state: 'running',
    ...overrides,
  };
}

describe('buildMiniChatHeaderViewModel', () => {
  it('prioritizes active session title over model name in code mode', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'code',
      codeSending: false,
      isGenerating: false,
      isReady: true,
      isError: false,
      isConnecting: false,
      codeAgentStatus: makeStatus({ state: 'running' }),
      sessionInit: { model: 'claude-sonnet-4-5-20251001', permissionMode: 'default', tools: [], mcpServers: [], cwd: '', claudeCodeVersion: '' },
      sessionTitle: 'session-abc1234',
      currentSessionKey: 'session-def5678',
      activeSessionTitle: '修复导出 bug',
      contextUsage: null,
    });

    expect(vm.islandLabel).toBe('修复导出 bug');
    expect(vm.islandModelLabel).toBe('sonnet-4-5');
  });

  it('applies unified status priority: error > connecting > generating > ready', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'chat',
      codeSending: false,
      isGenerating: true,
      isReady: false,
      isError: true,
      isConnecting: true,
      codeAgentStatus: null,
      sessionInit: null,
      sessionTitle: null,
      currentSessionKey: 'session-main',
      activeSessionTitle: '当前会话',
      contextUsage: null,
    });

    expect(vm.status.kind).toBe('error');
    expect(vm.status.label).toBe('连接断开');
  });

  it('does not expose context metric before real usage is available', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'code',
      codeSending: false,
      isGenerating: false,
      isReady: true,
      isError: false,
      isConnecting: false,
      codeAgentStatus: makeStatus(),
      sessionInit: { model: 'claude-opus-4-1m', permissionMode: 'default', tools: [], mcpServers: [], cwd: '', claudeCodeVersion: '' },
      sessionTitle: '实现 parser',
      currentSessionKey: 'session-parser',
      activeSessionTitle: '实现 parser',
      contextUsage: null,
    });

    expect(vm.contextIndicator).toBeNull();
  });

  it('uses default code title when fallback values look opaque', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'code',
      codeSending: false,
      isGenerating: false,
      isReady: true,
      isError: false,
      isConnecting: false,
      codeAgentStatus: makeStatus(),
      sessionInit: null,
      sessionTitle: '/Users/liangpingbo/project',
      currentSessionKey: 'session-c74b8437a8d2f12a',
      activeSessionTitle: null,
      contextUsage: null,
    });

    expect(vm.headerTitle).toBe('CLI 会话');
  });

  it('keeps chat ready label optimized for brand area', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'chat',
      codeSending: false,
      isGenerating: false,
      isReady: true,
      isError: false,
      isConnecting: false,
      codeAgentStatus: null,
      sessionInit: null,
      sessionTitle: null,
      currentSessionKey: 'session-main',
      activeSessionTitle: null,
      contextUsage: null,
    });

    expect(vm.status.kind).toBe('ready');
    expect(vm.status.label).toBe('就绪');
    expect(vm.status.brandLabel).toBe('快捷聊天');
  });

  it('truncates overly long active session titles to avoid header overflow', () => {
    const vm = buildMiniChatHeaderViewModel({
      draftTarget: 'code',
      codeSending: false,
      isGenerating: false,
      isReady: true,
      isError: false,
      isConnecting: false,
      codeAgentStatus: makeStatus(),
      sessionInit: null,
      sessionTitle: null,
      currentSessionKey: 'session-main',
      activeSessionTitle: '为什么我们项目，每次启动pnpm dev都会进入设置向导而不是直接进入主界面',
      contextUsage: null,
    });

    expect(vm.headerTitle).toBe('为什么我们项目，每次启动pnpm dev都会进入设置向导…');
  });
});
