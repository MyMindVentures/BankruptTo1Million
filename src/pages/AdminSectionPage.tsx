import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Filter, LoaderCircle, RefreshCw, Search, Save, X } from 'lucide-react';
import { getAdminSectionRows, updateAdminRow, type AdminRow } from '../lib/adminApi';

type SectionConfig = {
  key: string;
  title: string;
  description: string;
  table: string;
  select: string;
  order: string;
  primaryKey: string;
  titleField: string;
  subtitleField?: string;
  statusField?: string;
  dateField?: string;
  imageField?: string;
  linkField?: string;
  variant: 'table' | 'cards' | 'media' | 'timeline' | 'settings' | 'audit';
  columns: string[];
  statusOptions?: string[];
};

const configs: Record<string, SectionConfig> = {
  '/admin/journal': { key:'journal', title:'Journal', description:'Create, review and publish mission stories.', table:'journal_posts', select:'id,title,slug,status,excerpt,is_featured,published_at,updated_at', order:'updated_at.desc', primaryKey:'id', titleField:'title', subtitleField:'excerpt', statusField:'status', dateField:'updated_at', variant:'cards', columns:['title','status','is_featured','published_at'], statusOptions:['draft','scheduled','published','archived'] },
  '/admin/journey': { key:'journey', title:'Journey', description:'Manage map points, timeline entries and lived experiences.', table:'journal_journey_entries', select:'id,entry_type,occurred_at,city_name,location_name,what_happened,mood,show_on_map,show_on_timeline,is_milestone', order:'occurred_at.desc', primaryKey:'id', titleField:'location_name', subtitleField:'what_happened', statusField:'entry_type', dateField:'occurred_at', variant:'timeline', columns:['location_name','city_name','entry_type','occurred_at','show_on_map','show_on_timeline'] },
  '/admin/break-the-circle': { key:'break_the_circle', title:'Break the Circle', description:'Manage featured campaign stories and calls to action.', table:'break_the_circle_posts', select:'id,journal_post_id,cta_label,cta_url,is_featured,featured_order,updated_at', order:'featured_order.asc', primaryKey:'id', titleField:'cta_label', subtitleField:'cta_url', statusField:'is_featured', dateField:'updated_at', linkField:'cta_url', variant:'cards', columns:['cta_label','cta_url','is_featured','featured_order'] },
  '/admin/media': { key:'media_vault', title:'Media Vault', description:'Review assets, metadata, publication status and visibility.', table:'media_assets', select:'id,title,asset_type,description,thumbnail_url,external_url,storage_bucket,storage_path,status,visibility,show_in_media_vault,created_at', order:'created_at.desc', primaryKey:'id', titleField:'title', subtitleField:'description', statusField:'status', dateField:'created_at', imageField:'thumbnail_url', linkField:'external_url', variant:'media', columns:['title','asset_type','status','visibility','show_in_media_vault'], statusOptions:['ready','uploading','processing','failed','archived'] },
  '/admin/people': { key:'people', title:'People & Hosts', description:'Manage hosts, contacts, consent and public profiles.', table:'journey_people', select:'id,display_name,full_name,person_type,role_title,short_bio,location,email,consent_to_publish,is_public,updated_at', order:'updated_at.desc', primaryKey:'id', titleField:'display_name', subtitleField:'short_bio', statusField:'person_type', dateField:'updated_at', variant:'cards', columns:['display_name','person_type','role_title','location','is_public'] },
  '/admin/proof-of-mind': { key:'proof_of_mind', title:'Proof of Mind', description:'Manage concepts, visibility, scores and publication state.', table:'proof_of_mind_concepts', select:'id,title,slug,tagline,category,concept_status,visibility,concept_score,is_featured,published_at,updated_at', order:'display_order.asc', primaryKey:'id', titleField:'title', subtitleField:'tagline', statusField:'concept_status', dateField:'updated_at', variant:'cards', columns:['title','category','concept_status','visibility','concept_score','is_featured'], statusOptions:['idea','concept','validation','building','launched','archived'] },
  '/admin/leads': { key:'leads', title:'Leads & Pipeline', description:'Track people, companies, interest and outreach status.', table:'leads', select:'id,full_name,email,company_name,role,lead_type,status,interest,country,updated_at', order:'updated_at.desc', primaryKey:'id', titleField:'full_name', subtitleField:'company_name', statusField:'status', dateField:'updated_at', variant:'table', columns:['full_name','company_name','role','lead_type','status','country'], statusOptions:['new','contacted','qualified','proposal','won','lost'] },
  '/admin/applications': { key:'applications', title:'Applications', description:'Review applicants, motivation and availability.', table:'applications', select:'id,full_name,email,location,availability,status,motivation,experience_summary,created_at', order:'created_at.desc', primaryKey:'id', titleField:'full_name', subtitleField:'motivation', statusField:'status', dateField:'created_at', variant:'cards', columns:['full_name','email','location','availability','status'], statusOptions:['new','reviewing','interview','accepted','rejected'] },
  '/admin/founding-heroes': { key:'founding_heroes', title:'Founding Heroes', description:'Manage public recognition for contributors and supporters.', table:'founding_heroes', select:'id,display_name,role_title,short_bio,location,avatar_url,recognition_level,is_published,featured,joined_at,updated_at', order:'updated_at.desc', primaryKey:'id', titleField:'display_name', subtitleField:'short_bio', statusField:'recognition_level', dateField:'joined_at', imageField:'avatar_url', variant:'cards', columns:['display_name','role_title','recognition_level','is_published','featured'] },
  '/admin/journal/comments': { key:'comments', title:'Comments', description:'Moderate visitor comments and pinned conversations.', table:'journal_comments', select:'id,display_name,email,body,status,is_pinned,created_at', order:'created_at.desc', primaryKey:'id', titleField:'display_name', subtitleField:'body', statusField:'status', dateField:'created_at', variant:'cards', columns:['display_name','email','status','is_pinned','created_at'], statusOptions:['pending','approved','rejected','spam'] },
  '/admin/issues': { key:'issues', title:'GitHub Issues', description:'Follow delivery status, difficulty and implementation evidence.', table:'github_issues', select:'id,issue_number,repository_full_name,display_title,title,state,discipline,difficulty,delivery_status,verification_status,issue_url,github_updated_at', order:'github_updated_at.desc', primaryKey:'id', titleField:'display_title', subtitleField:'repository_full_name', statusField:'state', dateField:'github_updated_at', linkField:'issue_url', variant:'table', columns:['issue_number','display_title','repository_full_name','state','discipline','difficulty','delivery_status'], statusOptions:['open','closed'] },
  '/admin/users': { key:'users', title:'Users & Roles', description:'Manage the admin allowlist and role access.', table:'admin_allowlist', select:'email,full_name,role,is_active,created_at,updated_at', order:'updated_at.desc', primaryKey:'email', titleField:'full_name', subtitleField:'email', statusField:'role', dateField:'updated_at', variant:'table', columns:['full_name','email','role','is_active','updated_at'], statusOptions:['admin','editor','media_manager'] },
  '/admin/settings': { key:'settings', title:'Site Settings', description:'Configure mission-control system settings.', table:'admin_system_settings', select:'key,category,label,description,value,is_secret,updated_at', order:'category.asc', primaryKey:'key', titleField:'label', subtitleField:'description', statusField:'category', dateField:'updated_at', variant:'settings', columns:['label','category','value','is_secret','updated_at'] },
  '/admin/audit': { key:'audit', title:'Audit Log', description:'Trace all recent administrative and content changes.', table:'admin_audit_log', select:'id,occurred_at,actor_email,action,table_name,record_id,changed_fields', order:'occurred_at.desc', primaryKey:'id', titleField:'action', subtitleField:'table_name', dateField:'occurred_at', variant:'audit', columns:['occurred_at','actor_email','action','table_name','record_id'] },
};

function text(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function label(value: string) { return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

export function AdminSectionPage({ path }: { path: string }) {
  const config = configs[path];
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!config) return;
    setLoading(true); setError(null);
    try { setRows(await getAdminSectionRows(config.table, config.select, config.order)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Data kon niet worden geladen.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [path]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = JSON.stringify(row).toLowerCase();
    const matchesQuery = haystack.includes(query.toLowerCase());
    const matchesStatus = status === 'all' || text(row[config?.statusField || '']).toLowerCase() === status.toLowerCase();
    return matchesQuery && matchesStatus;
  }), [rows, query, status, config]);

  if (!config) return <div className="admin-section-empty">Unknown admin section.</div>;

  async function saveEdit() {
    if (!editing) return;
    setSaving(true); setError(null);
    try {
      const keyValue = text(editing[config.primaryKey]);
      const mutable: AdminRow = {};
      config.columns.forEach((column) => { if (column !== config.primaryKey) mutable[column] = editing[column]; });
      await updateAdminRow(config.table, config.primaryKey, keyValue, mutable);
      setEditing(null);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Opslaan mislukt.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="admin-section-page">
      <div className="admin-section-heading">
        <div><p>ADMIN SECTION</p><h1>{config.title}</h1><span>{config.description}</span></div>
        <button onClick={() => void load()}><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="admin-section-toolbar">
        <div><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} /></div>
        {config.statusField && <label><Filter size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option>{[...new Set(rows.map((r) => text(r[config.statusField!])).filter((v) => v !== '—'))].map((v) => <option key={v} value={v}>{label(v)}</option>)}</select></label>}
        <span>{filtered.length} records</span>
      </div>

      {loading && <div className="admin-loading"><LoaderCircle className="spin" /> Loading live data…</div>}
      {error && <div className="admin-error">{error}</div>}

      {!loading && config.variant === 'media' && <div className="admin-media-grid">{filtered.map((row) => <article key={text(row[config.primaryKey])} onClick={() => setEditing(row)}>{row[config.imageField || ''] ? <img src={text(row[config.imageField || ''])} alt="" /> : <div className="admin-media-placeholder">MEDIA</div>}<div><strong>{text(row[config.titleField])}</strong><span>{text(row[config.subtitleField || 'asset_type'])}</span><small>{text(row[config.statusField || 'status'])}</small></div></article>)}</div>}

      {!loading && config.variant === 'timeline' && <div className="admin-timeline-list">{filtered.map((row) => <button key={text(row[config.primaryKey])} onClick={() => setEditing(row)}><i /><div><time>{text(row[config.dateField || ''])}</time><strong>{text(row[config.titleField])}</strong><span>{text(row[config.subtitleField || ''])}</span></div></button>)}</div>}

      {!loading && ['cards','settings'].includes(config.variant) && <div className="admin-record-grid">{filtered.map((row) => <article key={text(row[config.primaryKey])}><div><strong>{text(row[config.titleField])}</strong><span>{text(row[config.subtitleField || ''])}</span></div><div className="admin-record-meta">{config.columns.slice(1,5).map((column) => <p key={column}><small>{label(column)}</small><b>{text(row[column])}</b></p>)}</div><footer><button onClick={() => setEditing(row)}>Edit</button>{config.linkField && row[config.linkField] ? <a href={text(row[config.linkField])} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Open</a> : null}</footer></article>)}</div>}

      {!loading && ['table','audit'].includes(config.variant) && <div className="admin-data-table"><table><thead><tr>{config.columns.map((column) => <th key={column}>{label(column)}</th>)}{config.variant !== 'audit' && <th />}</tr></thead><tbody>{filtered.map((row) => <tr key={text(row[config.primaryKey])}>{config.columns.map((column) => <td key={column}>{column === config.linkField && row[column] ? <a href={text(row[column])} target="_blank" rel="noreferrer">Open <ExternalLink size={12} /></a> : text(row[column])}</td>)}{config.variant !== 'audit' && <td><button onClick={() => setEditing(row)}>Edit</button></td>}</tr>)}</tbody></table></div>}

      {!loading && filtered.length === 0 && <div className="admin-section-empty">No records found.</div>}

      {editing && <div className="admin-editor-backdrop"><section className="admin-editor"><header><div><p>EDIT RECORD</p><h2>{text(editing[config.titleField])}</h2></div><button onClick={() => setEditing(null)}><X /></button></header><div className="admin-editor-fields">{config.columns.filter((column) => column !== config.primaryKey).map((column) => <label key={column}><span>{label(column)}</span>{config.statusOptions && column === config.statusField ? <select value={text(editing[column])} onChange={(e) => setEditing({ ...editing, [column]: e.target.value })}>{config.statusOptions.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select> : typeof editing[column] === 'boolean' ? <button className={`admin-toggle ${editing[column] ? 'on' : ''}`} onClick={() => setEditing({ ...editing, [column]: !editing[column] })}><i />{editing[column] ? 'Enabled' : 'Disabled'}</button> : <input value={text(editing[column]) === '—' ? '' : text(editing[column])} onChange={(e) => setEditing({ ...editing, [column]: e.target.value })} />}</label>)}</div><footer><button onClick={() => setEditing(null)}>Cancel</button><button className="primary" onClick={() => void saveEdit()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Save changes</button></footer></section></div>}
    </div>
  );
}
