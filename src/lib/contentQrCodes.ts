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

export async function generateContentQrCode(input: GenerateContentQrCodeInput): Promise<ContentQrCodeResult> {
  const session = supabase.auth.getSession();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const response = await fetch(`${supabase.url}/functions/v1/generate-content-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${session?.access_token || anonKey}`,
    },
    body: JSON.stringify(input),
  });

  const result = await response.json() as ContentQrCodeResult & { error?: string };
  if (!response.ok || result.error) {
    throw new Error(result.error || 'Unable to generate the QR code.');
  }

  return result;
}
