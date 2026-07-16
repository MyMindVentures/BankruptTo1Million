export type JournalPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type JournalPost = {
  id: string; title: string; slug: string; status: JournalPostStatus;
  subtitle: string | null; excerpt: string | null; body: string; content_format: 'markdown' | 'rich_text' | 'video' | 'mixed';
  cover_image_url: string | null; cover_image_alt: string | null; original_language: string; category_id: string | null;
  primary_creator_id: string | null; is_featured: boolean; is_vision_feature: boolean; published_at: string | null;
  scheduled_for: string | null; reading_time_minutes: number | null; seo_title: string | null; seo_description: string | null;
  publication_timezone: string; ai_generation_status?: string; ai_generated_at?: string | null; ai_model?: string | null;
  created_at: string; updated_at: string;
};

const journalStatuses: JournalPostStatus[] = ['draft', 'scheduled', 'published', 'archived'];

export type JournalStatusCounts = {
  all: number;
  draft: number;
  scheduled: number;
  published: number;
  archived: number;
};

function parseCount(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Journal overview returned invalid status counts.');
  return Math.trunc(number);
}

export function normalizeJournalPostStatus(value: unknown): JournalPostStatus | null {
  const status = String(value ?? '').trim().toLowerCase();
  return journalStatuses.includes(status as JournalPostStatus) ? status as JournalPostStatus : null;
}

function parseJournalPostRow(row: unknown): JournalPost {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Journal overview returned an invalid row.');
  }
  const item = row as Record<string, unknown>;
  const status = normalizeJournalPostStatus(item.status);
  if (!status) throw new Error('Journal overview returned a row with an invalid status.');
  if (!item.id || !item.title || !item.slug) {
    throw new Error('Journal overview returned a row with missing required fields.');
  }

  return {
    id: String(item.id),
    title: String(item.title),
    slug: String(item.slug),
    status,
    subtitle: item.subtitle == null ? null : String(item.subtitle),
    excerpt: item.excerpt == null ? null : String(item.excerpt),
    body: item.body == null ? '' : String(item.body),
    content_format: (item.content_format as JournalPost['content_format']) || 'markdown',
    cover_image_url: item.cover_image_url == null ? null : String(item.cover_image_url),
    cover_image_alt: item.cover_image_alt == null ? null : String(item.cover_image_alt),
    original_language: item.original_language == null ? 'en' : String(item.original_language),
    category_id: item.category_id == null ? null : String(item.category_id),
    primary_creator_id: item.primary_creator_id == null ? null : String(item.primary_creator_id),
    is_featured: Boolean(item.is_featured),
    is_vision_feature: Boolean(item.is_vision_feature),
    published_at: item.published_at == null ? null : String(item.published_at),
    scheduled_for: item.scheduled_for == null ? null : String(item.scheduled_for),
    reading_time_minutes: item.reading_time_minutes == null ? null : Number(item.reading_time_minutes),
    seo_title: item.seo_title == null ? null : String(item.seo_title),
    seo_description: item.seo_description == null ? null : String(item.seo_description),
    publication_timezone: item.publication_timezone == null ? 'Europe/Madrid' : String(item.publication_timezone),
    ai_generation_status: item.ai_generation_status == null ? undefined : String(item.ai_generation_status),
    ai_generated_at: item.ai_generated_at == null ? null : String(item.ai_generated_at),
    ai_model: item.ai_model == null ? null : String(item.ai_model),
    created_at: String(item.created_at || ''),
    updated_at: String(item.updated_at || ''),
  };
}

export function parseJournalOverviewPayload(payload: unknown): {
  rows: JournalPost[];
  counts: JournalStatusCounts;
} {
  let record = payload;
  if (typeof payload === 'string') {
    try {
      record = JSON.parse(payload) as unknown;
    } catch {
      throw new Error('Journal overview returned an invalid payload.');
    }
  }

  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Journal overview returned an invalid payload.');
  }

  const source = record as Record<string, unknown>;
  const rawRows = source.rows;
  const rawCounts = source.counts;

  if (!Array.isArray(rawRows)) throw new Error('Journal overview returned an invalid row list.');
  if (!rawCounts || typeof rawCounts !== 'object' || Array.isArray(rawCounts)) {
    throw new Error('Journal overview returned invalid status counts.');
  }

  const countsRecord = rawCounts as Record<string, unknown>;
  const counts: JournalStatusCounts = {
    all: parseCount(countsRecord.all),
    draft: parseCount(countsRecord.draft),
    scheduled: parseCount(countsRecord.scheduled),
    published: parseCount(countsRecord.published),
    archived: parseCount(countsRecord.archived),
  };

  return {
    rows: rawRows.map(parseJournalPostRow),
    counts,
  };
}

export function canShowFootageOnlyUpload(
  editingId: string | null,
  publishedEditId: string | null,
) {
  return Boolean(editingId && publishedEditId === editingId);
}

export function canUploadFootageOnly(
  editingId: string | null,
  publishedEditId: string | null,
  newFileCount: number,
) {
  return canShowFootageOnlyUpload(editingId, publishedEditId) && newFileCount > 0;
}