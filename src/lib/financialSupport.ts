import { supabase } from './supabase';

export type FinancialSupportTransferInput = {
  amountEur: number;
  supporterName: string;
  supporterEmail?: string;
  message?: string;
  isAnonymous?: boolean;
  transferDate?: string;
};

export type FinancialSupportTransfer = {
  id: string;
  payment_reference: string;
  amount_eur: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  created_at: string;
};

export async function registerFinancialSupportTransfer(input: FinancialSupportTransferInput) {
  const response = await supabase.rpc('register_financial_support_transfer', {
    p_amount_eur: input.amountEur,
    p_supporter_name: input.supporterName,
    p_supporter_email: input.supporterEmail || null,
    p_message: input.message || null,
    p_is_anonymous: input.isAnonymous || false,
    p_transfer_date: input.transferDate || new Date().toISOString().slice(0, 10),
  });

  if (!response.ok) {
    let message = 'The transfer registration could not be saved.';
    try {
      const payload = await response.json() as { message?: string; error?: string };
      message = payload.message || payload.error || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  const rows = await response.json() as FinancialSupportTransfer[];
  const transfer = rows[0];
  if (!transfer) throw new Error('Supabase did not return a payment reference.');
  return transfer;
}
