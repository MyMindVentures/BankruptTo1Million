import type { I18nManifest } from '../lib/i18nManifest';
import { supabase } from './supabase';
import type { WebsiteTranslate } from './websiteI18n';

export const CONCEPT_OWNERSHIP_UI_I18N_MANIFEST = {
  componentKey: 'lib.concept.ownership.ui',
  namespace: 'ui',
  translationKeys: [
  ] as const,
  entityContent: { tables: [] },
} as const satisfies I18nManifest;

export type ConceptOwnershipNotice = {
  notice_key: string;
  title: string;
  body: string;
  owner_entity: string;
  owner_name: string;
  owner_role: string;
  owner_identifier_type: string | null;
  owner_identifier_value: string | null;
  base_location: string | null;
  publication_purpose: string | null;
  lifestyle_goal: string | null;
  mission_name: string | null;
  rights_statement: string;
  collaboration_statement: string | null;
  language_code: string;
};

const DEFAULT_NOTICE_KEY = 'mymindventures-public-concept';
const LEGACY_NOTICE_MARKER = '## Ownership, Publication & Mission Notice';
let noticePromise: Promise<ConceptOwnershipNotice | null> | null = null;

async function loadOwnershipNotice(): Promise<ConceptOwnershipNotice | null> {
  if (!noticePromise) {
    noticePromise = supabase
      .from('concept_ownership_notices')
      .request({
        query: `notice_key=eq.${encodeURIComponent(DEFAULT_NOTICE_KEY)}&is_active=eq.true&select=notice_key,title,body,owner_entity,owner_name,owner_role,owner_identifier_type,owner_identifier_value,base_location,publication_purpose,lifestyle_goal,mission_name,rights_statement,collaboration_statement,language_code&limit=1`,
      })
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        const rows = await response.json() as ConceptOwnershipNotice[];
        return rows[0] || null;
      })
      .catch(() => null);
  }
  return noticePromise;
}

function textElement(tag: keyof HTMLElementTagNameMap, value: string, className?: string) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function stripLegacyOwnershipCopy() {
  document.querySelectorAll<HTMLElement>('.concept-detail-section p').forEach((paragraph) => {
    const value = paragraph.textContent || '';
    const markerIndex = value.indexOf(LEGACY_NOTICE_MARKER);
    if (markerIndex < 0) return;
    const cleanValue = value.slice(0, markerIndex).replace(/---\s*$/, '').trim();
    if (cleanValue) paragraph.textContent = cleanValue;
    else paragraph.remove();
  });
}

function addCardOwnershipSignal(card: HTMLElement, notice: ConceptOwnershipNotice) {
  if (card.querySelector('.proof-ownership-signal')) return;
  const signal = document.createElement('div');
  signal.className = 'proof-ownership-signal';
  signal.setAttribute('aria-label', `Original concept owned by ${notice.owner_entity}`);

  const shield = document.createElement('span');
  shield.className = 'proof-ownership-signal__icon';
  shield.setAttribute('aria-hidden', 'true');
  shield.textContent = '◆';

  const copy = document.createElement('span');
  copy.className = 'proof-ownership-signal__copy';
  copy.append(
    textElement('strong', `Original concept by ${notice.owner_name}`),
    textElement('small', `Owned by ${notice.owner_entity}`),
  );

  signal.append(shield, copy);
  const meta = card.querySelector('.concept-card__meta');
  if (meta?.nextSibling) meta.parentNode?.insertBefore(signal, meta.nextSibling);
  else card.append(signal);
}

function metaItem(label: string, value: string | null) {
  if (!value) return null;
  const item = document.createElement('div');
  item.className = 'proof-ownership__meta-item';
  item.append(textElement('span', label), textElement('strong', value));
  return item;
}

function buildOwnershipPanel(notice: ConceptOwnershipNotice) {
  const section = document.createElement('section');
  section.className = 'concept-detail-section proof-ownership';
  section.setAttribute('aria-labelledby', 'proof-ownership-title');

  const header = document.createElement('div');
  header.className = 'proof-ownership__header';
  const icon = textElement('span', '◆', 'proof-ownership__icon');
  icon.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('div');
  heading.append(
    textElement('p', 'Ownership & publication', 'eyebrow'),
    textElement('h2', notice.title, 'proof-ownership__title'),
  );
  heading.querySelector('h2')?.setAttribute('id', 'proof-ownership-title');
  header.append(icon, heading);

  const identity = document.createElement('div');
  identity.className = 'proof-ownership__identity';
  identity.append(
    textElement('strong', notice.owner_entity),
    textElement('span', `${notice.owner_name} · ${notice.owner_role}`),
  );

  const meta = document.createElement('div');
  meta.className = 'proof-ownership__meta';
  [
    metaItem(notice.owner_identifier_type || 'Identifier', notice.owner_identifier_value),
    metaItem('Based in', notice.base_location),
    metaItem('Mission', notice.mission_name),
    metaItem('Long-term goal', notice.lifestyle_goal),
  ].forEach((item) => { if (item) meta.append(item); });

  const context = document.createElement('div');
  context.className = 'proof-ownership__context';
  if (notice.publication_purpose) context.append(textElement('p', notice.publication_purpose));

  const rights = document.createElement('div');
  rights.className = 'proof-ownership__rights';
  rights.append(textElement('strong', 'Rights statement'), textElement('p', notice.rights_statement));
  if (notice.collaboration_statement) rights.append(textElement('p', notice.collaboration_statement, 'proof-ownership__collaboration'));

  section.append(header, identity, meta, context, rights);
  return section;
}

function replaceDetailSignature(notice: ConceptOwnershipNotice) {
  const current = document.querySelector<HTMLElement>('.proof-signature');
  if (!current || current.classList.contains('proof-ownership')) return;
  current.replaceWith(buildOwnershipPanel(notice));
}

function enhanceOwnershipUi(notice: ConceptOwnershipNotice) {
  stripLegacyOwnershipCopy();
  document.querySelectorAll<HTMLElement>('.concept-card').forEach((card) => addCardOwnershipSignal(card, notice));
  replaceDetailSignature(notice);
}

export function initializeConceptOwnershipUi(t: WebsiteTranslate) {
  void t;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  void loadOwnershipNotice().then((notice) => {
    if (!notice) return;
    enhanceOwnershipUi(notice);

    const observer = new MutationObserver(() => enhanceOwnershipUi(notice));
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  });
}
