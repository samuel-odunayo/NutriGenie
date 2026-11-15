import { useEffect, useState, type ReactNode } from 'react';
import { href, type RouteKey } from '../router';
import { useApp } from '../state';
import { API_ROOT } from '../api';

const NAV: { key: RouteKey; label: string; path: string }[] = [
  { key: 'dashboard', label: 'Dashboard', path: 'dashboard' },
  { key: 'meal-plan', label: 'Meal Plan', path: 'meal-plan' },
  { key: 'recipes', label: 'Recipes', path: 'recipes' },
  { key: 'tracker', label: 'Tracker', path: 'tracker' },
  { key: 'map', label: 'Health Map', path: 'map' },
  { key: 'learn', label: 'Learn', path: 'learn' },
  { key: 'care', label: 'Care & Referrals', path: 'care' },
];

function isActive(current: RouteKey, key: RouteKey) {
  return current === key || (key === 'recipes' && current === 'recipe');
}

function StatusIndicator() {
  const { backendOnline } = useApp();
  const label = backendOnline === null ? 'Connecting' : backendOnline ? 'Online' : 'Offline';
  const colour = backendOnline === null ? 'bg-slate-300' : backendOnline ? 'bg-brand-accent' : 'bg-amber-500';
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600" title={`Service status: ${label}`}>
      <span className={`h-2 w-2 rounded-full ${colour}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Header({ current }: { current: RouteKey }) {
  const { user } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [current]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <a href={href('')} className="flex items-baseline text-xl font-bold tracking-tight">
          <span className="text-brand-accent">Nutri</span>
          <span className="text-slate-900">Genie</span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.key}
              href={href(item.path)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(current, item.key) ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:text-slate-900'
              }`}
              aria-current={isActive(current, item.key) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <StatusIndicator />
          <a href={href('account')} className={user ? 'btn-secondary' : 'btn-primary'}>
            {user ? user.full_name.split(' ')[0] : 'Sign in'}
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="container-page flex flex-col py-2" aria-label="Mobile">
            {NAV.map((item) => (
              <a
                key={item.key}
                href={href(item.path)}
                className={`rounded-md px-3 py-3 text-sm font-medium ${
                  isActive(current, item.key) ? 'bg-brand-soft text-brand' : 'text-slate-700'
                }`}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 px-3 pt-4 pb-2">
              <StatusIndicator />
              <a href={href('account')} className="btn-primary">
                {user ? 'My account' : 'Sign in'}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold">
            <span className="text-brand-accent">Nutri</span>Genie
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Community nutrition, primary healthcare access and referral follow-up for underserved communities.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Nutrition</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><a className="hover:text-brand" href={href('meal-plan')}>Meal plan</a></li>
            <li><a className="hover:text-brand" href={href('recipes')}>Recipes</a></li>
            <li><a className="hover:text-brand" href={href('tracker')}>Nutrition tracker</a></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Healthcare</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><a className="hover:text-brand" href={href('map')}>Health map</a></li>
            <li><a className="hover:text-brand" href={href('care')}>Referrals and follow-up</a></li>
            <li><a className="hover:text-brand" href={href('learn')}>Health education</a></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Access</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>USSD: *347*88#</li>
            <li><a className="hover:text-brand" href={`${API_ROOT}/docs`} target="_blank" rel="noreferrer">API documentation</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <p className="container-page py-4 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} NutriGenie. Health information is for guidance and does not replace advice from a qualified health worker.
        </p>
      </div>
    </footer>
  );
}

export function Layout({ current, children }: { current: RouteKey; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header current={current} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 bg-brand-soft">
      <div className="container-page flex flex-col gap-4 py-8 sm:py-10 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-1 font-serif text-3xl font-bold sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}
