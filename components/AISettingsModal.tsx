import React, { useState, useEffect, useCallback } from 'react';
import { Theme } from '../types';

interface ProviderInfo {
  id: string;
  name: string;
  capabilities: {
    vision: boolean;
    json: boolean;
    streaming: boolean;
    tools: boolean;
  };
  isLocal: boolean;
  status: 'ACTIVE' | 'DEGRADED' | 'OFFLINE' | 'LOCAL_ONLY' | 'DISABLED';
  models: Array<{
    id: string;
    name: string;
    capabilities: any;
  }>;
}

interface AISettings {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
  retries: number;
  failoverProviders: string[];
}

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  apiKey: '',
  baseUrl: '',
  temperature: 0.7,
  maxTokens: 2048,
  timeout: 30000,
  retries: 3,
  failoverProviders: [],
};

const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose, currentTheme }) => {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'provider' | 'auth' | 'generation' | 'advanced'>('provider');
  
  const [settings, setSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('pyquest-ai-settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch providers from backend
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/providers');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (e) {
      console.error('Failed to load AI providers:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
      setTestResult(null);
    }
  }, [isOpen, fetchProviders]);

  const handleSave = () => {
    localStorage.setItem('pyquest-ai-settings', JSON.stringify(settings));
    // Trigger global event so listeners (like geminiService) load updated config
    window.dispatchEvent(new Event('pyquest-ai-settings-changed'));
    onClose();
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'test',
          providerConfig: settings,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: 'Connection established successfully!' });
      } else {
        setTestResult({
          success: false,
          message: data.message || 'Connection failed. Verify API Key / endpoint settings.',
        });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Failed to connect to proxy server.' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Find models for currently selected provider
  const currentProviderData = providers.find((p) => p.id === settings.provider);
  const availableModels = currentProviderData?.models || [];

  // Update model if selected provider changes
  const handleProviderChange = (providerId: string) => {
    const providerData = providers.find((p) => p.id === providerId);
    const defaultModel = providerData?.models[0]?.id || '';
    setSettings((prev) => ({
      ...prev,
      provider: providerId,
      model: defaultModel,
      // Clear key/baseUrl if shifting to cloud provider to use server-side secrets
      apiKey: providerData?.isLocal ? prev.apiKey : '',
      baseUrl: providerData?.isLocal ? prev.baseUrl : '',
    }));
    setTestResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] w-full max-w-3xl h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[var(--bg-tertiary)] px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center text-lg">
              <i className="fa-solid fa-sliders"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">AI Architecture Settings</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure unified models, proxies, and custom parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-2"
            aria-label="Close settings"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Content area: Tabs Sidebar + Form panels */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tab Selection */}
          <div className="w-48 bg-[var(--bg-tertiary)]/30 border-r border-[var(--border-color)] p-4 flex flex-col gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('provider')}
              className={`px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all ${
                activeTab === 'provider'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fa-solid fa-cubes text-sm"></i>
              <span>Provider & Model</span>
            </button>
            
            <button
              onClick={() => setActiveTab('auth')}
              className={`px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all ${
                activeTab === 'auth'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fa-solid fa-key text-sm"></i>
              <span>Credentials</span>
            </button>

            <button
              onClick={() => setActiveTab('generation')}
              className={`px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all ${
                activeTab === 'generation'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fa-solid fa-gauge text-sm"></i>
              <span>Generation</span>
            </button>

            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center gap-2.5 transition-all ${
                activeTab === 'advanced'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <i className="fa-solid fa-gears text-sm"></i>
              <span>Advanced</span>
            </button>

            <div className="mt-auto border-t border-[var(--border-color)] pt-4">
              <button
                disabled={testingConnection || loading}
                onClick={handleTestConnection}
                className="w-full py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {testingConnection ? (
                  <i className="fa-solid fa-spinner animate-spin"></i>
                ) : (
                  <i className="fa-solid fa-circle-check"></i>
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Form Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto bg-[var(--bg-primary)]">
            {loading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <i className="fa-solid fa-spinner animate-spin text-2xl text-[var(--accent-primary)]"></i>
                <span className="text-xs text-[var(--text-secondary)]">Loading provider metadata...</span>
              </div>
            ) : (
              <>
                {/* 1. PROVIDER & MODEL TAB */}
                {activeTab === 'provider' && (
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-3">
                        Active AI Provider
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {providers.map((p) => {
                          const isSelected = settings.provider === p.id;
                          const isOnline = p.status !== 'DISABLED' && p.status !== 'OFFLINE';

                          return (
                            <button
                              key={p.id}
                              onClick={() => handleProviderChange(p.id)}
                              className={`p-3 text-left border rounded-xl flex flex-col justify-between transition-all ${
                                isSelected
                                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5 shadow-md'
                                  : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]/50'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className="text-sm font-bold text-[var(--text-primary)]">{p.name}</span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    p.status === 'ACTIVE'
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : p.status === 'LOCAL_ONLY'
                                      ? 'bg-blue-500/10 text-blue-400'
                                      : 'bg-red-500/10 text-red-500'
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </div>
                              <div className="flex gap-1.5 mt-3 text-[10px] text-[var(--text-secondary)]">
                                {p.capabilities.json && <span title="JSON Support">JSON</span>}
                                {p.capabilities.vision && <span title="Vision Support">Vision</span>}
                                {p.capabilities.streaming && <span title="Streaming Support">Stream</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">
                        Active Model
                      </label>
                      {availableModels.length > 0 ? (
                        <select
                          value={settings.model}
                          onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                        >
                          {availableModels.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-3 bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-secondary)] italic">
                          No models registered for this provider. Will use server default.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. AUTHENTICATION TAB */}
                {activeTab === 'auth' && (
                  <div className="space-y-5">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <i className="fa-solid fa-shield-halved text-[var(--accent-primary)]"></i>
                      <span>Authentication Model</span>
                    </h3>

                    {currentProviderData?.isLocal ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-xl flex gap-3">
                          <i className="fa-solid fa-circle-info text-base mt-0.5 shrink-0"></i>
                          <div>
                            <span className="font-bold">Local Provider Config</span>: API keys for local endpoints (Ollama, LM Studio) are optional and configured locally in your browser.
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)]">Custom Base URL</label>
                          <input
                            type="text"
                            placeholder="e.g. http://localhost:11434"
                            value={settings.baseUrl}
                            onChange={(e) => setSettings((prev) => ({ ...prev, baseUrl: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)]">Custom API Key (Optional)</label>
                          <input
                            type="password"
                            placeholder="Local key if required"
                            value={settings.apiKey}
                            onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-xl flex gap-3">
                          <i className="fa-solid fa-lock text-base mt-0.5 shrink-0"></i>
                          <div>
                            <span className="font-bold">Managed Server Secret</span>: API credentials for cloud providers (Gemini, Claude, OpenAI) remain securely server-side inside `.env`.
                          </div>
                        </div>

                        <div className="space-y-1.5 opacity-60">
                          <label className="text-xs font-bold text-[var(--text-secondary)]">API Key Status</label>
                          <div className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl text-xs text-[var(--text-secondary)] font-bold italic flex items-center justify-between">
                            <span>••••••••••••••••••••••••••••</span>
                            <span className="text-[10px] bg-[var(--bg-primary)] px-2 py-0.5 border border-[var(--border-color)] rounded uppercase not-italic text-emerald-500">
                              Managed on Server
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. GENERATION TAB */}
                {activeTab === 'generation' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-[var(--text-secondary)] uppercase tracking-wider">Temperature</span>
                        <span className="text-[var(--accent-primary)]">{settings.temperature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.temperature}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-[var(--accent-primary)]"
                      />
                      <div className="flex justify-between text-[9px] text-[var(--text-secondary)] font-semibold">
                        <span>Precise & Deterministic (0.0)</span>
                        <span>Balanced</span>
                        <span>Creative & Explanatory (1.0)</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100000"
                        value={settings.maxTokens}
                        onChange={(e) =>
                          setSettings((prev) => ({ ...prev, maxTokens: parseInt(e.target.value, 10) || 2048 }))
                        }
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      />
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Controls the maximum size of generated outputs.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. ADVANCED TAB */}
                {activeTab === 'advanced' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                          Request Timeout (ms)
                        </label>
                        <input
                          type="number"
                          min="1000"
                          max="180000"
                          value={settings.timeout}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              timeout: parseInt(e.target.value, 10) || 30000,
                            }))
                          }
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                          Max Retry Attempts
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={settings.retries}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              retries: parseInt(e.target.value, 10) || 0,
                            }))
                          }
                          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] px-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Failover Backup Provider Chain
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {providers
                          .filter((p) => p.id !== settings.provider)
                          .map((p) => {
                            const isFailover = settings.failoverProviders.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setSettings((prev) => {
                                    const next = isFailover
                                      ? prev.failoverProviders.filter((id) => id !== p.id)
                                      : [...prev.failoverProviders, p.id];
                                    return { ...prev, failoverProviders: next };
                                  });
                                }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                                  isFailover
                                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]'
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                                }`}
                              >
                                {isFailover && <i className="fa-solid fa-check text-[10px]"></i>}
                                <span>{p.name}</span>
                              </button>
                            );
                          })}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        Select backup providers. If your active model fails, requests will route through backups.
                      </p>
                    </div>
                  </div>
                )}

                {/* Connection Test Result overlay */}
                {testResult && (
                  <div
                    className={`mt-6 p-3 border rounded-xl flex gap-2.5 items-start text-xs font-semibold ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}
                  >
                    <i
                      className={`fa-solid mt-0.5 text-base shrink-0 ${
                        testResult.success ? 'fa-circle-check' : 'fa-circle-exclamation'
                      }`}
                    ></i>
                    <div>{testResult.message}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--bg-tertiary)] px-6 py-4 border-t border-[var(--border-color)] flex items-center justify-between">
          <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                currentProviderData?.status === 'ACTIVE'
                  ? 'bg-emerald-500 animate-pulse'
                  : currentProviderData?.status === 'LOCAL_ONLY'
                  ? 'bg-blue-400'
                  : 'bg-red-500'
              }`}
            ></span>
            <span>{currentProviderData?.name || 'No Provider'}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-xs font-bold text-white rounded-xl shadow-md transition-all animate-none"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettingsModal;
