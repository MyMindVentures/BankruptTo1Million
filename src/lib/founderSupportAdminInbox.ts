export type SupportStatus = 'pending' | 'approved' | 'rejected' | 'spam';

export function normalizeSupportStatus(value: unknown): SupportStatus | null {
  const status = String(value ?? '').trim().toLowerCase();
  return status === 'pending' || status === 'approved' || status === 'rejected' || status === 'spam' ? status : null;
}

function parseCount(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Support inbox returned invalid status counts.');
  return Math.trunc(number);
}

export function parseFounderSupportInboxPayload(payload: unknown): {
  messages: Record<string, unknown>[];
  counts: { pending: number; approved: number; rejected: number; spam: number; total: number };
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Support inbox returned an invalid payload.');
  }

  const record = payload as Record<string, unknown>;
  const rawMessages = record.messages;
  const rawCounts = record.counts;

  if (!Array.isArray(rawMessages)) throw new Error('Support inbox returned an invalid message list.');
  if (!rawCounts || typeof rawCounts !== 'object' || Array.isArray(rawCounts)) {
    throw new Error('Support inbox returned invalid status counts.');
  }

  const countsRecord = rawCounts as Record<string, unknown>;
  const counts = {
    pending: parseCount(countsRecord.pending),
    approved: parseCount(countsRecord.approved),
    rejected: parseCount(countsRecord.rejected),
    spam: parseCount(countsRecord.spam),
    total: parseCount(countsRecord.total),
  };

  const messages = rawMessages.map((message) => {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      throw new Error('Support inbox returned an invalid message row.');
    }
    const row = message as Record<string, unknown>;
    const status = normalizeSupportStatus(row.status);
    if (!status) throw new Error('Support inbox returned a message with an invalid status.');
    return { ...row, status };
  });

  return { messages, counts };
}
