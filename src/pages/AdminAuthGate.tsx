import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminDashboardPage } from './AdminDashboardPage';
import { restoreAdminAuth, signInAdmin, signOutAdmin, type AdminAccess } from '../lib/adminApi';

export function AdminAuthGate() {
  const [checking, setChecking] = useState(true);
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    restoreAdminAuth()
      .then((result) => setAccess(result?.access || null))
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await signInAdmin(email.trim(), password);
      setAccess(result.access);
      setPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Inloggen is mislukt.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    setAccess(null);
    setEmail('');
    setPassword('');
  }

  if (checking) {
    return <div className="admin-auth-loading"><LoaderCircle className="spin" /><span>Adminsessie controleren…</span></div>;
  }

  if (access) {
    return (
      <div className="admin-authenticated">
        <button className="admin-signout" onClick={handleSignOut} aria-label="Uitloggen">
          <LogOut size={15} /><span>{access.full_name || access.email}</span>
        </button>
        <AdminDashboardPage />
      </div>
    );
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <span><Sparkles size={21} /></span>
          <div><strong>Bankrupt to 1M</strong><small>Mission Control</small></div>
        </div>

        <div className="admin-login-copy">
          <div className="admin-login-icon"><LockKeyhole size={25} /></div>
          <p>SECURE ADMIN ACCESS</p>
          <h1>Welkom terug</h1>
          <span>Log in met een Supabase-account dat actief staat in de admin allowlist.</span>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <label>
            E-mailadres
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="hello@mymindventures.io" />
          </label>
          <label>
            Wachtwoord
            <div className="admin-password-field">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="••••••••••••" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Verberg wachtwoord' : 'Toon wachtwoord'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <div className="admin-login-error">{error}</div>}

          <button className="admin-login-submit" type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle className="spin" size={19} /> : <LogIn size={19} />}
            <span>{submitting ? 'Toegang controleren…' : 'Open Mission Control'}</span>
          </button>
        </form>

        <div className="admin-login-security"><ShieldCheck size={17} /><span>Supabase Auth · database allowlist · role-based access</span></div>
      </section>
    </main>
  );
}
