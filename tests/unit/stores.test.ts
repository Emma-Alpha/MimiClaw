/**
 * Zustand Stores Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore, preferenceSelectors, userGeneralSettingsSelectors } from '@/stores/settings';
import { useGatewayStore } from '@/stores/gateway';
import { aiModelSelectors, aiProviderSelectors, useProviderStore } from '@/stores/providers';

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset store to default state
    useSettingsStore.setState({
      theme: 'system',
      language: 'en',
      sidebarCollapsed: false,
      devModeUnlocked: false,
      petEnabled: true,
      gatewayAutoStart: true,
      gatewayPort: 18789,
      autoCheckUpdate: true,
      autoDownloadUpdate: false,
      startMinimized: false,
      launchAtStartup: false,
      updateChannel: 'stable',
    });
  });
  
  it('should have default values', () => {
    const state = useSettingsStore.getState();
    expect(state.theme).toBe('system');
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.petEnabled).toBe(true);
    expect(state.gatewayAutoStart).toBe(true);
  });
  
  it('should update theme', () => {
    const { setTheme } = useSettingsStore.getState();
    setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
  
  it('should toggle sidebar collapsed state', () => {
    const { setSidebarCollapsed } = useSettingsStore.getState();
    setSidebarCollapsed(true);
    expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
  });
  
  it('should unlock dev mode', () => {
    const invoke = vi.mocked(window.electron.ipcRenderer.invoke);
    invoke.mockResolvedValueOnce({
      ok: true,
      data: {
        status: 200,
        ok: true,
        json: { success: true },
      },
    });

    const { setDevModeUnlocked } = useSettingsStore.getState();
    setDevModeUnlocked(true);

    expect(useSettingsStore.getState().devModeUnlocked).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'hostapi:fetch',
      expect.objectContaining({
        path: '/api/settings/devModeUnlocked',
        method: 'PUT',
      }),
    );
  });

  it('should persist launch-at-startup setting through host api', () => {
    const invoke = vi.mocked(window.electron.ipcRenderer.invoke);
    invoke.mockResolvedValueOnce({
      ok: true,
      data: {
        status: 200,
        ok: true,
        json: { success: true },
      },
    });

    const { setLaunchAtStartup } = useSettingsStore.getState();
    setLaunchAtStartup(true);

    expect(useSettingsStore.getState().launchAtStartup).toBe(true);
    expect(invoke).toHaveBeenCalledWith(
      'hostapi:fetch',
      expect.objectContaining({
        path: '/api/settings/launchAtStartup',
        method: 'PUT',
      }),
    );
  });
});

describe('Provider selectors', () => {
  beforeEach(() => {
    useProviderStore.setState({
      statuses: [],
      vendors: [],
      defaultAccountId: null,
      loading: false,
      error: null,
      accounts: [
        {
          id: 'openai-main',
          vendorId: 'openai',
          label: 'OpenAI Main',
          authMode: 'api_key',
          enabled: true,
          isDefault: true,
          model: 'gpt-5',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'ollama-local',
          vendorId: 'ollama',
          label: 'Ollama',
          authMode: 'local',
          enabled: true,
          isDefault: false,
          model: 'qwen3:latest',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
  });

  it('derives model and provider selector data', () => {
    const state = useProviderStore.getState();

    expect(aiModelSelectors.modelById('openai-main')(state)).toMatchObject({
      id: 'openai-main',
      providerId: 'openai',
      model: 'gpt-5',
    });
    expect(aiModelSelectors.supportsSearch('openai-main')(state)).toBe(true);
    expect(aiModelSelectors.supportsFunctionCalling('ollama-local')(state)).toBe(false);
    expect(aiProviderSelectors.enabledProviders(state)).toHaveLength(2);
    expect(aiProviderSelectors.fcSearchModels(state)).toHaveLength(1);
  });
});

describe('Settings selectors', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      theme: 'system',
      language: 'en',
      sidebarCollapsed: false,
      devModeUnlocked: false,
      petEnabled: true,
      gatewayAutoStart: true,
      gatewayPort: 18789,
      autoCheckUpdate: true,
      autoDownloadUpdate: false,
      startMinimized: false,
      launchAtStartup: false,
      updateChannel: 'stable',
      preference: {
        useCmdEnterToSend: true,
        isDevMode: false,
        autoApproveTools: false,
        hotkeys: { saveTopic: 'Mod+Shift+S' },
      },
      labPreferences: {
        memory: false,
        intervention: true,
        promptTransform: false,
        stt: true,
      },
    });
  });

  it('reads preference selectors', () => {
    const state = useSettingsStore.getState();
    expect(preferenceSelectors.useCmdEnterToSend(state)).toBe(true);
    expect(preferenceSelectors.hotkeyById('saveTopic')(state)).toBe('Mod+Shift+S');
    expect(userGeneralSettingsSelectors.config(state)).toEqual({ isDevMode: false });
  });
});

describe('Gateway Store', () => {
  beforeEach(() => {
    // Reset store
    useGatewayStore.setState({
      status: { state: 'stopped', port: 18789 },
      isInitialized: false,
    });
  });
  
  it('should have default status', () => {
    const state = useGatewayStore.getState();
    expect(state.status.state).toBe('stopped');
    expect(state.status.port).toBe(18789);
  });
  
  it('should update status', () => {
    const { setStatus } = useGatewayStore.getState();
    setStatus({ state: 'running', port: 18789, pid: 12345 });
    
    const state = useGatewayStore.getState();
    expect(state.status.state).toBe('running');
    expect(state.status.pid).toBe(12345);
  });

  it('should proxy gateway rpc through ipc', async () => {
    const invoke = vi.mocked(window.electron.ipcRenderer.invoke);
    invoke.mockResolvedValueOnce({ success: true, result: { ok: true } });

    const result = await useGatewayStore.getState().rpc<{ ok: boolean }>('chat.history', { limit: 10 }, 5000);

    expect(result.ok).toBe(true);
    expect(invoke).toHaveBeenCalledWith('gateway:rpc', 'chat.history', { limit: 10 }, 5000);
  });
});
