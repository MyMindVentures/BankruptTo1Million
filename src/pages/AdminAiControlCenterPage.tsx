import { useEffect, useMemo, useState } from 'react';
import { Activity, Bot, Check, CircleAlert, Cpu, FlaskConical, LoaderCircle, Play, RefreshCw, Save, Sparkles } from 'lucide-react';
import {
  activateAiPromptVersion,
  createAiPromptVersion,
  getAiControlCenterData,
  updateAiEdgeFunctionConfig,
  type AiControlCenterData,
  type AiEdgeFunctionConfig,
  type AiPromptVersion,
} from '../lib/adminApi';

function text(value: unknown, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function AdminAiControlCenterPage() {
  const [data, setData] = useState<AiControlCenterData | null>(null);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [promptDraft, setPromptDraft] = useState({ name: '', system_prompt: '', user_prompt_template: '', change_summary: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await getAiControlCenterData();
      setData(next);
      const slug = selectedSlug || text(next.configs[0]?.edge_function_slug, '');
      setSelectedSlug(slug);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI Control Center kon niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selected = useMemo(
    () => data?.configs.find((item) => item.edge_function_slug === selectedSlug) || null,
    [data, selectedSlug],
  );

  const promptVersions = useMemo(
    () => (data?.prompts || []).filter((item) => item.edge_function_slug === selectedSlug),
    [data, selectedSlug],
  );

  useEffect(() => {
    if (!selected) return;
    setDraft({
      provider_id: selected.provider_id ?? '',
      model_id: selected.model_id ?? '',
      temperature: selected.temperature ?? 0.4,
      max_tokens: selected.max_tokens ?? 2000,
      timeout_ms: selected.timeout_ms ?? 60000,
      max_retries: selected.max_retries ?? 2,
      max_cost_usd: selected.max_cost_usd ?? '',
      latency_warning_ms: selected.latency_warning_ms ?? '',
      is_enabled: selected.is_enabled ?? true,
      log_requests: selected.log_requests ?? true,
      log_responses: selected.log_responses ?? false,
    });
    const active = promptVersions.find((item) => item.is_active) || promptVersions[0];
    setPromptDraft({
      name: active?.name ? `${active.name} update` : `${selected.edge_function_slug} prompt`,
      system_prompt: text(active?.system_prompt, ''),
      user_prompt_template: text(active?.user_prompt_template, ''),
      change_summary: '',
    });
  }, [selectedSlug, selected?.updated_at, promptVersions.length]);

  async function saveConfig() {
    if (!selected) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const patch = {
        ...draft,
        temperature: numberValue(draft.temperature, 0.4),
        max_tokens: numberValue(draft.max_tokens, 2000),
        timeout_ms: numberValue(draft.timeout_ms, 60000),
        max_retries: numberValue(draft.max_retries, 2),
        max_cost_usd: draft.max_cost_usd === '' ? null : numberValue(draft.max_cost_usd),
        latency_warning_ms: draft.latency_warning_ms === '' ? null : numberValue(draft.latency_warning_ms),
        provider_id: draft.provider_id || null,
        model_id: draft.model_id || null,
      };
      await updateAiEdgeFunctionConfig(selected.edge_function_slug, patch);
      setNotice('AI function configuration saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Configuratie opslaan mislukt.');
    } finally { setSaving(false); }
  }

  async function savePrompt() {
    if (!selected) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await createAiPromptVersion({
        edgeFunctionSlug: selected.edge_function_slug,
        name: promptDraft.name,
        systemPrompt: promptDraft.system_prompt,
        userPromptTemplate: promptDraft.user_prompt_template,
        changeSummary: promptDraft.change_summary,
        activate: true,
      });
      setNotice('New prompt version created and activated.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Promptversie opslaan mislukt.');
    } finally { setSaving(false); }
  }

  async function activatePrompt(prompt: AiPromptVersion) {
    setSaving(true); setError(null); setNotice(null);
    try {
      await activateAiPromptVersion(prompt.id);
      setNotice(`Prompt version ${prompt.version ?? prompt.name} activated.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Prompt activeren mislukt.');
    } finally { setSaving(false); }
  }

  const recentRuns = (data?.runs || []).filter((run) => !selectedSlug || run.edge_function_slug === selectedSlug).slice(0, 8);

  return <div className="admin-ai-page">
    <section className="admin-section-heading">
      <div><p>AI OPERATIONS</p><h1>AI Control Center</h1><span>Configure live Supabase Edge Functions, models, prompts, safeguards and runtime behaviour.</span></div>
      <button onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
    </section>

    {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading AI backend configuration…</div>}
    {error && <div className="admin-error"><CircleAlert size={18} /><div><strong>AI Control Center error</strong><span>{error}</span></div></div>}
    {notice && <div className="admin-ai-notice"><Check size={17} />{notice}</div>}

    {!loading && data && <>
      <section className="admin-ai-kpis">
        <article><Bot /><span>Functions</span><strong>{data.configs.length}</strong></article>
        <article><Cpu /><span>Models</span><strong>{data.models.length}</strong></article>
        <article><Sparkles /><span>Prompt versions</span><strong>{data.prompts.length}</strong></article>
        <article><Activity /><span>Recent runs</span><strong>{data.runs.length}</strong></article>
      </section>

      <div className="admin-ai-layout">
        <aside className="admin-ai-functions">
          <header><p>FUNCTIONS</p><h2>Edge Functions</h2></header>
          {data.configs.map((config) => <button key={config.edge_function_slug} className={selectedSlug === config.edge_function_slug ? 'active' : ''} onClick={() => setSelectedSlug(config.edge_function_slug)}>
            <span className={config.is_enabled ? 'online' : 'offline'} />
            <div><strong>{config.name || config.edge_function_slug}</strong><small>{config.edge_function_slug}</small></div>
          </button>)}
        </aside>

        {selected && <main className="admin-ai-editor">
          <section className="admin-ai-card">
            <header><div><p>RUNTIME CONFIG</p><h2>{selected.name || selected.edge_function_slug}</h2></div><span className={selected.is_enabled ? 'enabled' : 'disabled'}>{selected.is_enabled ? 'Enabled' : 'Disabled'}</span></header>
            <div className="admin-ai-form-grid">
              <label><span>Provider</span><select value={text(draft.provider_id, '')} onChange={(e) => setDraft({ ...draft, provider_id: e.target.value })}><option value="">Automatic</option>{data.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
              <label><span>Model</span><select value={text(draft.model_id, '')} onChange={(e) => setDraft({ ...draft, model_id: e.target.value })}><option value="">Provider default</option>{data.models.map((model) => <option key={model.id} value={model.id}>{model.display_name || model.model_key}</option>)}</select></label>
              <label><span>Temperature</span><input type="number" min="0" max="2" step="0.1" value={text(draft.temperature, '')} onChange={(e) => setDraft({ ...draft, temperature: e.target.value })} /></label>
              <label><span>Max tokens</span><input type="number" min="1" value={text(draft.max_tokens, '')} onChange={(e) => setDraft({ ...draft, max_tokens: e.target.value })} /></label>
              <label><span>Timeout (ms)</span><input type="number" min="1000" value={text(draft.timeout_ms, '')} onChange={(e) => setDraft({ ...draft, timeout_ms: e.target.value })} /></label>
              <label><span>Max retries</span><input type="number" min="0" max="10" value={text(draft.max_retries, '')} onChange={(e) => setDraft({ ...draft, max_retries: e.target.value })} /></label>
              <label><span>Max cost USD</span><input type="number" min="0" step="0.001" value={text(draft.max_cost_usd, '')} onChange={(e) => setDraft({ ...draft, max_cost_usd: e.target.value })} /></label>
              <label><span>Latency warning (ms)</span><input type="number" min="0" value={text(draft.latency_warning_ms, '')} onChange={(e) => setDraft({ ...draft, latency_warning_ms: e.target.value })} /></label>
            </div>
            <div className="admin-ai-switches">
              {(['is_enabled','log_requests','log_responses'] as const).map((key) => <button key={key} className={draft[key] ? 'on' : ''} onClick={() => setDraft({ ...draft, [key]: !draft[key] })}><i /><span>{key.replace(/_/g, ' ')}</span></button>)}
            </div>
            <footer><button className="primary" disabled={saving} onClick={() => void saveConfig()}>{saving ? <LoaderCircle className="spin" /> : <Save />} Save runtime configuration</button></footer>
          </section>

          <section className="admin-ai-card">
            <header><div><p>PROMPT MANAGEMENT</p><h2>Create a new prompt version</h2></div><FlaskConical /></header>
            <div className="admin-ai-prompt-form">
              <label><span>Version name</span><input value={promptDraft.name} onChange={(e) => setPromptDraft({ ...promptDraft, name: e.target.value })} /></label>
              <label><span>System prompt</span><textarea rows={9} value={promptDraft.system_prompt} onChange={(e) => setPromptDraft({ ...promptDraft, system_prompt: e.target.value })} /></label>
              <label><span>User prompt template</span><textarea rows={7} value={promptDraft.user_prompt_template} onChange={(e) => setPromptDraft({ ...promptDraft, user_prompt_template: e.target.value })} /></label>
              <label><span>Change summary</span><input value={promptDraft.change_summary} onChange={(e) => setPromptDraft({ ...promptDraft, change_summary: e.target.value })} placeholder="What changed and why?" /></label>
            </div>
            <footer><button className="primary" disabled={saving || !promptDraft.name || !promptDraft.system_prompt} onClick={() => void savePrompt()}><Save /> Save and activate version</button></footer>
          </section>

          <section className="admin-ai-card">
            <header><div><p>VERSION HISTORY</p><h2>Prompt versions</h2></div><Sparkles /></header>
            <div className="admin-ai-versions">{promptVersions.length ? promptVersions.map((prompt) => <article key={prompt.id}><div><strong>{prompt.name}</strong><span>Version {prompt.version ?? '—'} · {prompt.created_at ? new Date(prompt.created_at).toLocaleString() : 'Unknown date'}</span></div><small className={prompt.is_active ? 'active' : ''}>{prompt.is_active ? 'Active' : 'Inactive'}</small>{!prompt.is_active && <button disabled={saving} onClick={() => void activatePrompt(prompt)}><Play size={14} /> Activate</button>}</article>) : <div className="admin-empty">No prompt versions found for this function.</div>}</div>
          </section>

          <section className="admin-ai-card">
            <header><div><p>OBSERVABILITY</p><h2>Recent runs</h2></div><Activity /></header>
            <div className="admin-ai-runs">{recentRuns.length ? recentRuns.map((run) => <article key={run.id}><span className={run.status === 'success' ? 'success' : run.status === 'running' ? 'running' : 'failed'} /><div><strong>{run.status || 'unknown'}</strong><small>{run.started_at ? new Date(run.started_at).toLocaleString() : 'Unknown time'}</small></div><p>{run.model_key || run.model_id || 'Default model'}</p><b>{run.latency_ms ? `${run.latency_ms} ms` : '—'}</b></article>) : <div className="admin-empty">No recent runs found.</div>}</div>
          </section>
        </main>}
      </div>
    </>}
  </div>;
}
