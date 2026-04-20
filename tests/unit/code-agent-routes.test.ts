import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';

const sendJsonMock = vi.fn();
const parseJsonBodyMock = vi.fn();

vi.mock('@electron/api/route-utils', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
  sendJson: (...args: unknown[]) => sendJsonMock(...args),
}));

describe('handleCodeAgentRoutes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns latest run snapshot', async () => {
    const { handleCodeAgentRoutes } = await import('@electron/api/routes/code-agent');
    const codeAgentManager = {
      getLastRun: vi.fn(() => ({ startedAt: 1, request: { workspaceRoot: '/tmp', prompt: 'test' } })),
    };

    const handled = await handleCodeAgentRoutes(
      { method: 'GET' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/code-agent/runs/latest'),
      { codeAgentManager } as never,
    );

    expect(handled).toBe(true);
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      {
        success: true,
        run: { startedAt: 1, request: { workspaceRoot: '/tmp', prompt: 'test' } },
      },
    );
  });

  it('runs a code-agent task through the host api route', async () => {
    const { handleCodeAgentRoutes } = await import('@electron/api/routes/code-agent');
    parseJsonBodyMock.mockResolvedValueOnce({ workspaceRoot: '/tmp', prompt: 'hello' });
    const codeAgentManager = {
      runTask: vi.fn().mockResolvedValue({ runId: 'run-1', status: 'analysis_only', output: 'ok' }),
    };

    const handled = await handleCodeAgentRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/code-agent/runs'),
      { codeAgentManager } as never,
    );

    expect(handled).toBe(true);
    expect(codeAgentManager.runTask).toHaveBeenCalledWith({ workspaceRoot: '/tmp', prompt: 'hello' });
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      { success: true, result: { runId: 'run-1', status: 'analysis_only', output: 'ok' } },
    );
  });

  it('cancels an active code-agent task through the host api route', async () => {
    const { handleCodeAgentRoutes } = await import('@electron/api/routes/code-agent');
    const codeAgentManager = {
      cancelActiveRun: vi.fn().mockResolvedValue({
        cancelled: true,
        result: { runId: 'run-2', status: 'cancelled', output: '已停止生成' },
      }),
    };

    const handled = await handleCodeAgentRoutes(
      { method: 'POST' } as IncomingMessage,
      {} as ServerResponse,
      new URL('http://127.0.0.1:3210/api/code-agent/runs/cancel'),
      { codeAgentManager } as never,
    );

    expect(handled).toBe(true);
    expect(codeAgentManager.cancelActiveRun).toHaveBeenCalledTimes(1);
    expect(sendJsonMock).toHaveBeenCalledWith(
      expect.anything(),
      200,
      {
        success: true,
        cancelled: true,
        result: { runId: 'run-2', status: 'cancelled', output: '已停止生成' },
      },
    );
  });
});
