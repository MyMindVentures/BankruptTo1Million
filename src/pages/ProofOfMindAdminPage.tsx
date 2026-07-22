import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Clock3, ExternalLink, History, LoaderCircle, Plus, RefreshCw, RotateCcw, Save, Sparkles } from 'lucide-react';
import {
  createConceptFromSourceText,
  getAdminConcepts,
  getConceptVersions,
  runConceptAiEnrichment,
  saveConceptSourceVersion,
  type AdminConceptSummary,
  type AdminConceptVersion,
} from '../lib/adminApi';

export function ProofOfMindAdminPage() {
  const [concepts, setConcepts] = useState<AdminConceptSummary[]>([]);
  const [versions, setVersions] = useState<AdminConceptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedConcept = useMemo(() => concepts.find((item) => item.id === selectedId) || null, [concepts, selectedId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAdminConcepts();
      setConcepts(rows);
      if (selectedId !== 'new') {
        const current = rows.find((item) => item.id === selectedId);
        if (current) {
          setTitle(current.title || '');
          setSourceText(current.source_text || '');
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Concepten konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  async function loadVersions(conceptId: string) {
    setLoadingVersions(true);
    try {
      setVersions(await getConceptVersions(conceptId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Versiegeschiedenis kon niet worden geladen.');
    } finally {
      setLoadingVersions(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function selectConcept(id: string) {
    setSelectedId(id);
    setMessage(null);
    setError(null);
    setChangeSummary('');
    if (id === 'new') {
      setTitle('');
      setSourceText('');
      setVersions([]);
      return;
    }
    const concept = concepts.find((item) => item.id === id);
    setTitle(concept?.title || '');
    setSourceText(concept?.source_text || '');
    void loadVersions(id);
  }

  function previewVersion(version: AdminConceptVersion) {
    setTitle(version.title || selectedConcept?.title || '');
    setSourceText(version.source_text);
    setChangeSummary(`Gebaseerd op versie ${version.version_number}`);
    setMessage(`Versie ${version.version_number} geladen in het tekstvak. Opslaan maakt een nieuwe versie; de oude versie blijft behouden.`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (!sourceText.trim()) throw new Error('Vul eerst het concept in als tekstblok.');
      let conceptId = selectedId;
      if (selectedId === 'new') {
        conceptId = await createConceptFromSourceText({
          title: title.trim() || 'Untitled concept',
          sourceText: sourceText.trim(),
          originalLanguage: 'nl',
        });
        setSelectedId(conceptId);
      } else {
        await saveConceptSourceVersion(selectedId, {
          title: title.trim() || undefined,
          sourceText: sourceText.trim(),
          sourceLanguage: 'nl',
          changeSummary: changeSummary.trim() || 'Concepttekst bijgewerkt door admin',
        });
      }
      await runConceptAiEnrichment(conceptId, 'ai_only');
      setMessage('Nieuwe conceptversie opgeslagen. Alle gespecialiseerde AI-functies hebben hun toegewezen velden opnieuw verwerkt.');
      setChangeSummary('');
      await load();
      await loadVersions(conceptId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Opslaan is mislukt.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-section-page admin-concept-text-page">
      <div className="admin-section-heading">
        <div>
          <p>PROOF OF MIND</p>
          <h1>Concept upload & AI-verrijking</h1>
          <span>Een admin beheert alleen de volledige concepttekst. Elke AI-functie vult daarna automatisch haar eigen velden aan voor de publieke Proof of Mind-pagina.</span>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Vernieuwen</button>
      </div>

      {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Concepten laden…</div> : (
        <div className="admin-concept-layout">
          <form className="admin-concept-text-form" onSubmit={handleSubmit}>
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div><p>CONCEPT SOURCE</p><h2>{selectedId === 'new' ? 'Nieuw concept' : `Versie ${selectedConcept?.source_version_number || 0} bijwerken`}</h2></div>
                <Sparkles size={20} />
              </div>

              <label className="admin-concept-field">
                <span>Kies concept</span>
                <select value={selectedId} onChange={(event) => selectConcept(event.target.value)}>
                  <option value="new">+ Nieuw concept</option>
                  {concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.title}</option>)}
                </select>
              </label>

              <label className="admin-concept-field">
                <span>Titel</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Naam van het concept" />
              </label>

              {selectedId !== 'new' && <label className="admin-concept-field">
                <span>Wat is er veranderd?</span>
                <input value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} placeholder="Bijvoorbeeld: doelgroep en verdienmodel aangescherpt" />
              </label>}

              <label className="admin-concept-field">
                <span>Volledig concept als één tekstblok</span>
                <textarea
                  className="admin-concept-source-text"
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="Beschrijf hier alles wat bekend is: probleem, oplossing, doelgroep, features, businessmodel, visie, roadmap, mogelijke partners, technische werking, bewijs, risico’s en kansen."
                  required
                />
                <small>{sourceText.trim().length.toLocaleString()} tekens · dit tekstblok is de bron voor alle concept-AI-functies</small>
              </label>

              {selectedConcept && <div className="admin-concept-status-row">
                <span><Sparkles size={15} /> AI-status: <strong>{selectedConcept.ai_orchestration_status}</strong></span>
                <span><History size={15} /> Actieve versie: <strong>{selectedConcept.source_version_number || 0}</strong></span>
                <a href={`/proof-of-mind/${selectedConcept.slug}`} target="_blank" rel="noreferrer">Publieke pagina <ExternalLink size={14} /></a>
              </div>}

              {error && <div className="admin-error">{error}</div>}
              {message && <div className="admin-success">{message}</div>}

              <footer className="admin-concept-actions">
                <button type="button" onClick={() => selectConcept('new')}><Plus size={16} /> Nieuw leeg concept</button>
                <button className="primary" type="submit" disabled={saving}>
                  {saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
                  {saving ? 'Versie opslaan en AI uitvoeren…' : selectedId === 'new' ? 'Concept aanmaken en AI uitvoeren' : 'Nieuwe versie opslaan en AI uitvoeren'}
                </button>
              </footer>
            </section>
          </form>

          <aside className="admin-panel admin-concept-history">
            <div className="admin-panel-header">
              <div><p>VERSION CONTROL</p><h2>Versiegeschiedenis</h2></div>
              <Clock3 size={20} />
            </div>
            {selectedId === 'new' ? <div className="admin-empty">Maak eerst een concept aan om versies bij te houden.</div> : loadingVersions ? <div className="admin-loading"><LoaderCircle className="spin" /> Versies laden…</div> : versions.length === 0 ? <div className="admin-empty">Nog geen versies gevonden.</div> : <div className="admin-concept-version-list">
              {versions.map((version) => <button type="button" key={version.id} className={version.is_active ? 'is-active' : ''} onClick={() => previewVersion(version)}>
                <span className="admin-version-number">v{version.version_number}</span>
                <span><strong>{version.change_summary || (version.version_number === 1 ? 'Eerste conceptversie' : 'Concept bijgewerkt')}</strong><small>{new Date(version.created_at).toLocaleString()} · AI {version.ai_orchestration_status}</small></span>
                <RotateCcw size={15} />
              </button>)}
            </div>}
          </aside>
        </div>
      )}
    </div>
  );
}
