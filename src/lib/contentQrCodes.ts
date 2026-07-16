import { supabase } from './supabase';

export type ContentQrEntityType = 'journal_post' | 'founder_post' | 'proof_of_mind' | 'offer' | 'website_page';

export type ContentQrCodeResult = {
  qrCodeUrl: string;
  canonicalUrl: string;
  generatedAt: string;
  reused: boolean;
};

type GenerateContentQrCodeInput = {
  entityType: ContentQrEntityType;
  entityId: string;
  canonicalUrl: string;
};

const PRODUCTION_ORIGIN = 'https://www.bankruptto1million.com';
const PRODUCTION_HOSTS = new Set([
  'bankruptto1million.com',
  'www.bankruptto1million.com',
  'bankruptto1million.up.railway.app',
]);

export class ContentQrCodeError extends Error {
  readonly kind: 'network' | 'api';

  constructor(message: string, kind: 'network' | 'api' = 'api') {
    super(message);
    this.name = 'ContentQrCodeError';
    this.kind = kind;
  }
}

export function normalizeContentQrCanonicalUrl(canonicalUrl: string): string {
  try {
    const url = new URL(canonicalUrl);
    if (PRODUCTION_HOSTS.has(url.hostname)) {
      const normalized = new URL(`${url.pathname}${url.search}`, PRODUCTION_ORIGIN);
      normalized.hash = '';
      return normalized.toString();
    }
    url.hash = '';
    return url.toString();
  } catch {
    return canonicalUrl;
  }
}

export async function generateContentQrCode(input: GenerateContentQrCodeInput): Promise<ContentQrCodeResult> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const canonicalUrl = normalizeContentQrCanonicalUrl(input.canonicalUrl);

  let response: Response;
  try {
    response = await fetch(`${supabase.url}/functions/v1/generate-content-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ ...input, canonicalUrl }),
    });
  } catch {
    throw new ContentQrCodeError('Unable to reach the QR code service.', 'network');
  }

  const result = await response.json().catch(() => null) as (ContentQrCodeResult & { error?: string }) | null;
  if (!response.ok || !result || result.error) {
    throw new ContentQrCodeError(result?.error || 'Unable to generate the QR code.', 'api');
  }

  return result;
}
