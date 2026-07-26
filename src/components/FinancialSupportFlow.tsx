import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Copy, Landmark, ShieldCheck } from 'lucide-react';
import { registerFinancialSupportTransfer } from '../lib/financialSupport';

const WISE_DETAILS = {
  accountName: 'Kevin Willy G De Vlieger',
  iban: 'BE24 9670 3408 3338',
  bic: 'TRWIBEB1XXX',
  address: 'Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium',
};

const presetAmounts = [10, 25, 50, 100];

export function FinancialSupportFlow() {
  const [amount, setAmount] = useState('25');
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [copied, setCopied] = useState('');

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1600);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('submitting');
    setError('');

    const amountEur = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amountEur) || amountEur <= 0) {
      setState('error');
      setError('Enter a valid amount greater than €0.');
      return;
    }
    if (!supporterName.trim()) {
      setState('error');
      setError('Your name is required to register the transfer.');
      return;
    }

    try {
      const transfer = await registerFinancialSupportTransfer({
        amountEur,
        supporterName: supporterName.trim(),
        supporterEmail: supporterEmail.trim() || undefined,
        message: message.trim() || undefined,
        isAnonymous,
      });
      setReference(transfer.payment_reference);
      setState('success');
    } catch (submitError) {
      setState('error');
      setError(submitError instanceof Error ? submitError.message : 'The transfer registration could not be saved.');
    }
  }

  return (
    <section className="section financial-support-section" id="financial-support" aria-labelledby="financial-support-title">
      <div className="financial-support-layout">
        <div className="financial-support-copy">
          <p className="eyebrow">Financial support</p>
          <h2 id="financial-support-title">Support the rebuild directly.</h2>
          <p>Register your intended bank transfer first. We will generate a unique reference and save it securely in Supabase with a pending status.</p>
          <div className="founder-support-trust">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Bank transfer, not an automatic charge</strong>
              <span>You remain in control and complete the transfer yourself through your bank or Wise.</span>
            </div>
          </div>
        </div>

        <form className="application-form financial-support-form" onSubmit={submit}>
          {state !== 'success' ? (
            <>
              <div className="financial-support-presets" aria-label="Choose an amount">
                {presetAmounts.map((preset) => (
                  <button key={preset} type="button" className={Number(amount) === preset ? 'financial-amount financial-amount--active' : 'financial-amount'} onClick={() => setAmount(String(preset))}>€{preset}</button>
                ))}
              </div>
              <label>Amount in EUR<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
              <div className="form-grid">
                <label>Your name<input value={supporterName} onChange={(event) => setSupporterName(event.target.value)} required /></label>
                <label>Email <span className="optional-label">Optional</span><input type="email" value={supporterEmail} onChange={(event) => setSupporterEmail(event.target.value)} /></label>
              </div>
              <label>Message <span className="optional-label">Optional</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder="A short note about your support" /></label>
              <label><input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} /> Keep my identity private in public updates.</label>
              <button className="button" type="submit" disabled={state === 'submitting'}>{state === 'submitting' ? 'Creating reference…' : 'Create transfer reference'}</button>
              {state === 'error' ? <div className="form-status impact-state--error"><strong>Could not continue.</strong><span>{error}</span></div> : null}
            </>
          ) : (
            <div className="financial-support-success">
              <Check aria-hidden="true" size={28} />
              <div>
                <p className="eyebrow">Reference created</p>
                <h3>Complete the transfer with these Wise details.</h3>
                <p>Use the exact payment reference below so we can match your transfer.</p>
              </div>
              <dl className="financial-bank-details">
                <div><dt>Account name</dt><dd>{WISE_DETAILS.accountName}<button type="button" aria-label="Copy account name" onClick={() => void copyValue('name', WISE_DETAILS.accountName)}>{copied === 'name' ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
                <div><dt>IBAN</dt><dd>{WISE_DETAILS.iban}<button type="button" aria-label="Copy IBAN" onClick={() => void copyValue('iban', WISE_DETAILS.iban)}>{copied === 'iban' ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
                <div><dt>Swift/BIC</dt><dd>{WISE_DETAILS.bic}<button type="button" aria-label="Copy Swift/BIC" onClick={() => void copyValue('bic', WISE_DETAILS.bic)}>{copied === 'bic' ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
                <div><dt>Wise address</dt><dd>{WISE_DETAILS.address}<button type="button" aria-label="Copy Wise address" onClick={() => void copyValue('address', WISE_DETAILS.address)}>{copied === 'address' ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
                <div className="financial-bank-details__reference"><dt>Payment reference</dt><dd>{reference}<button type="button" aria-label="Copy payment reference" onClick={() => void copyValue('reference', reference)}>{copied === 'reference' ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
              </dl>
              <div className="financial-support-note"><Landmark aria-hidden="true" /><span>SEPA: use the IBAN as a normal EUR transfer. Outside SEPA: use the Swift/BIC details.</span></div>
              <button className="button button--ghost" type="button" onClick={() => { setState('idle'); setReference(''); }}>Register another transfer</button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
