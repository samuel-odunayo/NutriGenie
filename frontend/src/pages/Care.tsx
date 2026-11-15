import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  createReferral,
  fetchFacilities,
  fetchReferrals,
  fetchSmsHistory,
  sendUssd,
  type Facility,
  type Referral,
  type ReferralPayload,
  type SmsLog,
} from '../api';
import { PageHeader } from '../components/Layout';
import { Badge } from '../components/ui';
import { href } from '../router';
import { useApp } from '../state';

const CATEGORIES = ['Pregnant Mother', 'Nursing Mother', 'Infant (0-12 months)', 'Child (1-5 years)'];

const EMPTY: ReferralPayload = {
  patient_name: '',
  patient_phone: '',
  patient_category: CATEGORIES[0],
  ward_name: 'Bwari Central',
  chw_name: 'Fatima Bello (CHEW)',
  phc_name: 'Bwari Model Primary Health Care',
  diagnosis_reason: '',
  scheduled_date: '',
};

function statusTone(s: string): 'success' | 'warning' | 'neutral' {
  if (s === 'COMPLETED' || s === 'ATTENDED') return 'success';
  if (s === 'PENDING') return 'warning';
  return 'neutral';
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone;
  return phone.slice(0, 6) + '***' + phone.slice(-4);
}

function UssdSimulator() {
  const { user } = useApp();
  const [session, setSession] = useState<string | null>(null);
  const [screen, setScreen] = useState('');
  const [path, setPath] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const apply = (raw: string) => {
    setEnded(raw.startsWith('END'));
    setScreen(raw.replace(/^(CON|END)\s*/, ''));
  };

  const callerPhone = user?.phone_number || '+2348011223344';

  const dial = async () => {
    const id = `web-${Date.now()}`;
    setSession(id);
    setPath([]);
    setBusy(true);
    apply(await sendUssd(id, callerPhone, ''));
    setBusy(false);
    inputRef.current?.focus();
  };

  const reply = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !input.trim()) return;
    const next = [...path, input.trim()];
    setPath(next);
    setInput('');
    setBusy(true);
    apply(await sendUssd(session, callerPhone, next.join('*')));
    setBusy(false);
  };

  const hangUp = () => {
    setSession(null);
    setScreen('');
    setPath([]);
    setEnded(false);
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">USSD service (*347*88#)</h2>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">Live DB Gateway</span>
      </div>
      <p className="mt-1 text-sm text-slate-600">Simulate USSD navigation on rural feature phones. Queries real PHCs and referrals.</p>

      <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-slate-300 bg-slate-900 p-4">
        <div className="min-h-[170px] whitespace-pre-line rounded-lg bg-slate-100 p-4 font-mono text-sm leading-relaxed text-slate-900">
          {busy ? 'Connecting to gateway...' : session ? screen : 'Dial *347*88# to start.'}
        </div>
        {session && !ended ? (
          <form onSubmit={reply} className="mt-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="numeric"
              placeholder="Reply"
              className="input bg-white"
              aria-label="USSD reply"
              disabled={busy}
            />
            <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>Send</button>
          </form>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn bg-brand-accent text-white hover:brightness-95" onClick={dial} disabled={busy}>
            {session ? 'Redial' : 'Dial *347*88#'}
          </button>
          <button type="button" className="btn bg-slate-700 text-white hover:bg-slate-600" onClick={hangUp} disabled={!session}>
            End
          </button>
        </div>
      </div>
    </div>
  );
}

export function CarePage() {
  const { user } = useApp();
  const [form, setForm] = useState<ReferralPayload>(EMPTY);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [sms, setSms] = useState<SmsLog[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const reload = () => {
    if (user) {
      fetchReferrals().then(setReferrals);
      if (user.role === 'CHW' || user.role === 'PHC_ADMIN') {
        fetchSmsHistory().then(setSms);
      }
    }
  };

  useEffect(() => {
    fetchFacilities().then(setFacilities);
    reload();
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.role === 'CHW') {
        setForm((f) => ({ ...f, chw_name: user.full_name, ward_name: user.ward_name ?? f.ward_name }));
      } else if (user.role === 'CITIZEN') {
        setForm((f) => ({
          ...f,
          patient_name: user.full_name,
          patient_phone: user.phone_number,
          patient_category: user.patient_category ?? CATEGORIES[0],
          ward_name: user.ward_name ?? f.ward_name,
        }));
      }
    }
  }, [user]);

  const phcs = facilities.filter((f) => f.facility_type === 'PHC');
  const update = (k: keyof ReferralPayload) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({ type: 'error', text: 'You must be signed in to create and track patient referrals.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = { ...form, scheduled_date: form.scheduled_date || 'Next available clinic day' };
      const r = await createReferral(payload);
      setMessage({ type: 'success', text: `Referral #${r.id} logged. Automated SMS confirmation dispatched to ${r.patient_phone}.` });
      setForm({
        ...EMPTY,
        chw_name: form.chw_name,
        ward_name: form.ward_name,
        phc_name: form.phc_name,
        patient_name: user.role === 'CITIZEN' ? user.full_name : '',
        patient_phone: user.role === 'CITIZEN' ? user.phone_number : '',
      });
      reload();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? `Could not create referral: ${err.message}` : 'Could not create referral.' });
    } finally {
      setSubmitting(false);
    }
  };

  const isStaff = user?.role === 'CHW' || user?.role === 'PHC_ADMIN';

  return (
    <>
      <PageHeader
        eyebrow="Care & Referrals"
        title="Care Continuity & Maternal Referrals"
        description="Securely refer mothers and infants to Primary Healthcare Centres with automated SMS reminders and NDPA-compliant access control."
      />

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {!user && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <h3 className="font-semibold">Sign in required to view medical records</h3>
              <p className="mt-1">
                To protect patient privacy under the Nigeria Data Protection Act (NDPA), clinical referrals and patient contact records require authentication.
              </p>
              <a href={href('account')} className="btn-primary mt-4 inline-block">Sign in with phone</a>
            </div>
          )}

          <form onSubmit={submit} className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New referral</h2>
              <span className="text-xs text-slate-500">Maternal & Infant Health</span>
            </div>
            
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="pname">Patient name</label>
                <input id="pname" className="input" required value={form.patient_name} onChange={update('patient_name')} />
              </div>
              <div>
                <label className="label" htmlFor="pphone">Phone number</label>
                <input id="pphone" className="input" required type="tel" placeholder="+23480..." value={form.patient_phone} onChange={update('patient_phone')} />
              </div>
              <div>
                <label className="label" htmlFor="pcat">Patient category</label>
                <select id="pcat" className="input" value={form.patient_category} onChange={update('patient_category')}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="phc">Refer to Primary Health Centre</label>
                <select id="phc" className="input" value={form.phc_name} onChange={update('phc_name')}>
                  {(phcs.length ? phcs.map((p) => p.name) : [EMPTY.phc_name]).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ward">Ward</label>
                <input id="ward" className="input" value={form.ward_name} onChange={update('ward_name')} />
              </div>
              <div>
                <label className="label" htmlFor="chw">Referring health worker</label>
                <input id="chw" className="input" value={form.chw_name} onChange={update('chw_name')} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="reason">Reason for referral</label>
                <textarea id="reason" className="input min-h-[90px]" required value={form.diagnosis_reason} onChange={update('diagnosis_reason')} placeholder="e.g. Suspected severe maternal anemia, iron supplement check, infant stunting screening" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="date">Appointment schedule</label>
                <input id="date" className="input" placeholder="e.g. Thursday 10:00 AM" value={form.scheduled_date} onChange={update('scheduled_date')} />
              </div>
            </div>

            {message && (
              <p className={`mt-5 rounded-md px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {message.text}
              </p>
            )}

            <div className="mt-6 flex justify-end">
              <button type="submit" className="btn-primary px-6" disabled={submitting || !user}>
                {submitting ? 'Submitting...' : 'Create referral'}
              </button>
            </div>
          </form>

          {user && (
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold">
                  {user.role === 'CITIZEN' ? 'My referrals' : 'Active clinic referrals'}
                </h2>
                <span className="text-xs text-slate-500">
                  {user.role === 'CITIZEN' ? 'Private Citizen View' : `${user.role} Clinic View`}
                </span>
              </div>
              {referrals.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-500">No referrals found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-6 py-3 font-medium">ID</th>
                        <th className="px-6 py-3 font-medium">Patient</th>
                        <th className="px-6 py-3 font-medium">Contact</th>
                        <th className="px-6 py-3 font-medium">Facility</th>
                        <th className="px-6 py-3 font-medium">Appointment</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {referrals.map((r) => (
                        <tr key={r.id}>
                          <td className="px-6 py-3 text-slate-500 font-mono">#{r.id}</td>
                          <td className="px-6 py-3">
                            <p className="font-medium text-slate-900">{r.patient_name}</p>
                            <p className="text-xs text-slate-500">{r.patient_category}</p>
                          </td>
                          <td className="px-6 py-3 font-mono text-xs text-slate-600">
                            {isStaff ? r.patient_phone : maskPhone(r.patient_phone)}
                          </td>
                          <td className="px-6 py-3">{r.phc_name}</td>
                          <td className="px-6 py-3">{r.scheduled_date}</td>
                          <td className="px-6 py-3"><Badge tone={statusTone(r.status)}>{r.status.toLowerCase()}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-8">
          <UssdSimulator />

          {isStaff && (
            <section className="card">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold">SMS Dispatch Log</h2>
                <p className="text-xs text-slate-500">Restricted to Health Staff</p>
              </div>
              {sms.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-slate-500">No automated SMS records yet.</p>
              ) : (
                <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {sms.map((m) => (
                    <li key={m.id} className="px-6 py-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono">{maskPhone(m.recipient_phone)}</span>
                        <span>{new Date(m.sent_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{m.message_text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
