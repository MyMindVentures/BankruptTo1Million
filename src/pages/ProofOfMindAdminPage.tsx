import { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle, Plus, RefreshCw, Save, Sparkles } from 'lucide-react';
import {
  createConceptFromSourceText,
  getAdminConcepts,
  runConceptAiEnrichment,
  updateConceptSourceText,
  type AdminConceptSummary,
} from '../lib/adminApi';

export function ProofOfMindAdminPage() {
  const [concepts, setConcepts] = useState<AdminConceptSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>('new');
  const [title, setTitle] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await getAdminConcepts();
      setConcepts(rows);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Concepten konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function selectConcept(id: string) {
    setSelectedId(id);
    setMessage(null);
    setError(null);
    if (id === 'new') {
      setTitle('');
      setSourceText('');
      return;
    }
    const concept = concepts.find((item) => item.id === id);
    setTitle(concept?.title || '');
    setSourceText(concept?.source_text || '');
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
        await updateConceptSourceText(selectedId, {
          title: title.trim() || undefined,
          sourceText: sourceText.trim(),
        });
      }
      await runConceptAiEnrichment(conceptId, 'ai_only');
      setMessage('Concept opgeslagen. De AI-functies vullen de toegewezen velden nu aan.');
      await load();
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
          <h1>Concept toevoegen of bijwerken</h1>
          <span>Plak het volledige concept in één groot tekstvak. Daarna verwerken de gespecialiseerde AI-functies elk hun eigen velden.</span>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Vernieuwen</button>
      </div>

      {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Concepten laden…</div> : (
        <form className="admin-concept-text-form" onSubmit={handleSubmit}>
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div><p>CONCEPT</p><h2>{selectedId === 'new' ? 'Nieuw concept' : 'Bestaand concept bijwerken'}</h2></div>
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

            <label className="admin-concept-field">
              <span>Volledig concept als tekstblok</span>
              <textarea
                className="admin-concept-source-text"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Beschrijf hier het volledige concept: probleem, oplossing, doelgroep, features, businessmodel, visie, roadmap, mogelijke partners, technische werking, enzovoort."
                required
              />
            </label>

            {error && <div className="admin-error">{error}</div>}
            {message && <div className="admin-success">{message}</div>}

            <footer className="admin-concept-actions">
              <button type="button" onClick={() => selectConcept('new')}><Plus size={16} /> Nieuw leeg concept</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}
                {saving ? 'Opslaan en AI uitvoeren…' : 'Opslaan en AI-velden aanvullen'}
              </button>
            </footer>
          </section>
        </form>
      )}
    </div>
  );
}
