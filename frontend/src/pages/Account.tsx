import { useState, type FormEvent } from 'react';
import { loginUser, registerUser } from '../api';
import { PageHeader } from '../components/Layout';
import { navigate } from '../router';
import { useApp } from '../state';

const ROLES = [
  { value: 'CITIZEN', label: 'Community member' },
  { value: 'CHW', label: 'Community health worker (CHW)' },
  { value: 'PHC_ADMIN', label: 'Clinic administrator' },
];

const CATEGORIES = [
  'General Citizen',
  'Pregnant Mother',
  'Nursing Mother',
  'Infant (0-12 months)',
  'Child (1-5 years)'
];

export function AccountPage() {
  const { user, setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CITIZEN');
  const [category, setCategory] = useState('General Citizen');
  const [adminSecret, setAdminSecret] = useState('');
  const [ward, setWard] = useState('Bwari Central');
  const [state, setState] = useState('FCT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res =
        mode === 'login'
          ? await loginUser({
              phone_number: phone.trim(),
              password: password.trim() || undefined,
            })
          : await registerUser({
              full_name: name.trim(),
              phone_number: phone.trim(),
              password: password.trim() || '1234',
              role,
              patient_category: category,
              ward_name: ward,
              state,
              admin_secret: role === 'PHC_ADMIN' ? adminSecret.trim() : undefined,
            });
      setUser(res.user, res.access_token);
      navigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    const roleLabel = ROLES.find((r) => r.value === user.role)?.label ?? user.role;
    return (
      <>
        <PageHeader eyebrow="Account" title={user.full_name} description={roleLabel} />
        <div className="container-page py-10">
          <div className="card max-w-xl p-6">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Phone number</dt><dd className="font-mono">{user.phone_number}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">System role</dt><dd className="font-semibold text-brand">{roleLabel}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Category</dt><dd>{user.patient_category ?? 'General'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Ward</dt><dd>{user.ward_name ?? '-'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">State</dt><dd>{user.state}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Registered</dt><dd>{new Date(user.created_at).toLocaleDateString()}</dd></div>
            </dl>
            <button type="button" className="btn-secondary mt-6" onClick={() => setUser(null, null)}>Sign out</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-brand-soft">
      <div className="container-page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <h1 className="font-serif text-4xl font-bold leading-tight">Good food and verified care, close to home.</h1>
          <p className="mt-4 max-w-md text-slate-600">
            Sign in with your phone and secure PIN to follow tailored maternal meal plans, track nutrition, and connect with your local health centre.
          </p>
          <img src="/assets/jollof-rice.png" alt="" className="mt-8 aspect-[16/10] w-full max-w-md rounded-2xl object-cover shadow-sm" />
        </div>

        <div className="card mx-auto w-full max-w-md p-6 sm:p-8">
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`rounded-md py-2 transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amina Mohammed" />
              </div>
            )}
            <div>
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" className="input" type="tel" required placeholder="+23480..." value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div>
              <label className="label" htmlFor="password">
                {mode === 'register' ? 'Set 4-digit PIN or password' : 'PIN or password'}
              </label>
              <input
                id="password"
                className="input"
                type="password"
                required
                placeholder={mode === 'register' ? 'e.g. 1234' : 'Enter your PIN/password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="label" htmlFor="role">Role</label>
                  <select id="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="category">Health / Patient category</label>
                  <select id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {role === 'PHC_ADMIN' && (
                  <div>
                    <label className="label" htmlFor="adminSecret">Administrator Enrollment Key</label>
                    <input
                      id="adminSecret"
                      className="input"
                      type="password"
                      required
                      placeholder="Enter administrator enrollment key"
                      value={adminSecret}
                      onChange={(e) => setAdminSecret(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-slate-500">Key required to verify facility administrative privileges.</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label" htmlFor="ward">Ward</label>
                    <input id="ward" className="input" value={ward} onChange={(e) => setWard(e.target.value)} />
                  </div>
                  <div>
                    <label className="label" htmlFor="state">State</label>
                    <input id="state" className="input" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

            <button type="submit" className="btn-primary w-full py-2.5" disabled={busy}>
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
