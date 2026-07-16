export type OutreachStatus =
  | 'draft'
  | 'ready'
  | 'sent'
  | 'opened'
  | 'interested'
  | 'meeting_planned'
  | 'accepted'
  | 'declined'
  | 'no_response'
  | 'archived';

export type OutreachCategory =
  | 'work'
  | 'collaboration'
  | 'hosting'
  | 'sponsoring'
  | 'investment'
  | 'technical_support';

export type OutreachChannel = 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'manual';

export type OutreachResponseType =
  | 'yes_meet'
  | 'interested'
  | 'tell_more'
  | 'not_now'
  | 'form_message'
  | 'meeting_request';

const outreachStatuses: OutreachStatus[] = [
  'draft', 'ready', 'sent', 'opened', 'interested', 'meeting_planned', 'accepted', 'declined', 'no_response', 'archived',
];

function parseCount(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Outreach overview returned invalid status counts.');
  return Math.trunc(number);
}

export function normalizeOutreachStatus(value: unknown): OutreachStatus | null {
  const status = String(value ?? '').trim().toLowerCase();
  return outreachStatuses.includes(status as OutreachStatus) ? status as OutreachStatus : null;
}

export function mapResponseToStatus(responseType: OutreachResponseType): OutreachStatus | null {
  switch (responseType) {
    case 'yes_meet':
    case 'meeting_request':
      return 'meeting_planned';
    case 'interested':
    case 'tell_more':
    case 'form_message':
      return 'interested';
    case 'not_now':
      return 'declined';
    default:
      return null;
  }
}

export function parseOutreachOverviewPayload(payload: unknown): {
  rows: Record<string, unknown>[];
  counts: Record<OutreachStatus, number> & { total: number };
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Outreach overview returned an invalid payload.');
  }

  const record = payload as Record<string, unknown>;
  const rawRows = record.rows;
  const rawCounts = record.counts;

  if (!Array.isArray(rawRows)) throw new Error('Outreach overview returned an invalid row list.');
  if (!rawCounts || typeof rawCounts !== 'object' || Array.isArray(rawCounts)) {
    throw new Error('Outreach overview returned invalid status counts.');
  }

  const countsRecord = rawCounts as Record<string, unknown>;
  const counts = {
    draft: parseCount(countsRecord.draft),
    ready: parseCount(countsRecord.ready),
    sent: parseCount(countsRecord.sent),
    opened: parseCount(countsRecord.opened),
    interested: parseCount(countsRecord.interested),
    meeting_planned: parseCount(countsRecord.meeting_planned),
    accepted: parseCount(countsRecord.accepted),
    declined: parseCount(countsRecord.declined),
    no_response: parseCount(countsRecord.no_response),
    archived: parseCount(countsRecord.archived),
    total: parseCount(countsRecord.total),
  };

  const rows = rawRows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error('Outreach overview returned an invalid row.');
    }
    const item = row as Record<string, unknown>;
    const status = normalizeOutreachStatus(item.status);
    if (!status) throw new Error('Outreach overview returned a row with an invalid status.');
    return { ...item, status };
  });

  return { rows, counts };
}

export function parseOutreachPath(pathname: string): { slug: string; token: string } | null {
  const match = pathname.replace(/\/$/, '').match(/^\/o\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { slug: decodeURIComponent(match[1]), token: decodeURIComponent(match[2]) };
}
