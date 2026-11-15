import { useEffect, useMemo, useState } from 'react';
import {
  fetchDishes,
  fetchUserIntakes,
  logMealIntake,
  deleteMealIntake,
  type Dish,
  type IntakeLogEntry
} from '../api';
import { PageHeader } from '../components/Layout';
import { Loading, Progress, Stat } from '../components/ui';
import { useApp } from '../state';

function getCohortTargets(category?: string | null) {
  const norm = (category ?? '').toLowerCase();
  if (norm.includes('pregnant')) {
    return { label: 'Pregnant Mother', calories: 2350, protein: 72, iron: 27, vitA: 800 };
  } else if (norm.includes('nursing') || norm.includes('lactat')) {
    return { label: 'Nursing Mother', calories: 2500, protein: 75, iron: 15, vitA: 850 };
  } else if (norm.includes('infant') || norm.includes('child')) {
    return { label: 'Infant / Child', calories: 1200, protein: 30, iron: 10, vitA: 400 };
  }
  return { label: 'Standard Adult', calories: 2000, protein: 60, iron: 12, vitA: 500 };
}

const STORAGE_KEY = 'nutrigenie.intake';
type LocalIntakeLog = Record<string, number[]>; // date -> dish ids

function todayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function loadLocalLog(): LocalIntakeLog {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as LocalIntakeLog;
  } catch {
    return {};
  }
}

export function TrackerPage() {
  const { user } = useApp();
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [cloudLogs, setCloudLogs] = useState<IntakeLogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LocalIntakeLog>(loadLocalLog);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const targets = useMemo(() => getCohortTargets(user?.patient_category), [user]);
  const today = todayKey();

  // Load available dishes
  useEffect(() => {
    fetchDishes().then(setDishes);
  }, []);

  // Fetch cloud intake logs if user is logged in
  const reloadIntake = () => {
    if (user) {
      fetchUserIntakes().then((logs) => {
        if (logs && logs.length > 0) setCloudLogs(logs);
      });
    }
  };

  useEffect(() => {
    reloadIntake();
  }, [user]);

  // Persist offline fallback
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localLog));
  }, [localLog]);

  // Determine today's logged dishes
  const todayItems: { id: number; logId?: number; dish: Dish }[] = useMemo(() => {
    if (!dishes) return [];

    if (user && cloudLogs.length > 0) {
      return cloudLogs
        .filter((l) => l.log_date === today)
        .map((l) => {
          const d = l.dish ?? dishes.find((item) => item.id === l.dish_id);
          return d ? { id: d.id, logId: l.id, dish: d } : null;
        })
        .filter((x): x is { id: number; logId: number; dish: Dish } => Boolean(x));
    }

    // Offline fallback
    const ids = localLog[today] ?? [];
    return ids
      .map((id) => {
        const d = dishes.find((item) => item.id === id);
        return d ? { id: d.id, dish: d } : null;
      })
      .filter((x): x is { id: number; dish: Dish } => Boolean(x));
  }, [dishes, cloudLogs, localLog, today, user]);

  // Calculate totals
  const totals = useMemo(() => {
    const sum = (f: (d: Dish) => number) =>
      Math.round(todayItems.reduce((acc, item) => acc + f(item.dish), 0) * 10) / 10;
    return {
      calories: sum((d) => d.calories),
      protein: sum((d) => d.protein_g),
      iron: sum((d) => d.iron_mg),
      vitA: sum((d) => d.vitamin_a_ug),
    };
  }, [todayItems]);

  // Calculate 7-day trend
  const week = useMemo(() => {
    if (!dishes) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const key = todayKey(6 - i);
      const label = new Date(key).toLocaleDateString(undefined, { weekday: 'short' });

      let calories = 0;
      if (user && cloudLogs.length > 0) {
        const dayLogs = cloudLogs.filter((l) => l.log_date === key);
        calories = dayLogs.reduce((acc, l) => {
          const d = l.dish ?? dishes.find((item) => item.id === l.dish_id);
          return acc + (d?.calories ?? 0);
        }, 0);
      } else {
        const ids = localLog[key] ?? [];
        calories = ids.reduce((acc, id) => {
          const d = dishes.find((item) => item.id === id);
          return acc + (d?.calories ?? 0);
        }, 0);
      }

      return { key, label, calories };
    });
  }, [dishes, cloudLogs, localLog, user]);

  const maxWeek = Math.max(targets.calories, ...week.map((w) => w.calories));

  const addMeal = async () => {
    const dishId = Number(selected);
    if (!dishId) return;

    setBusy(true);
    try {
      if (user) {
        await logMealIntake(dishId, today);
        reloadIntake();
      } else {
        setLocalLog((prev) => ({ ...prev, [today]: [...(prev[today] ?? []), dishId] }));
      }
      setSelected('');
    } finally {
      setBusy(false);
    }
  };

  const removeMeal = async (item: { id: number; logId?: number }, index: number) => {
    if (user && item.logId) {
      await deleteMealIntake(item.logId);
      reloadIntake();
    } else {
      setLocalLog((prev) => ({
        ...prev,
        [today]: (prev[today] ?? []).filter((_, i) => i !== index),
      }));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Nutrition Tracker"
        title="Track Your Daily Intake"
        description={`Clinical target model: ${targets.label}. Logging local foods with micro and macronutrient monitoring.`}
      />

      {!dishes ? (
        <Loading />
      ) : (
        <div className="container-page space-y-8 py-10">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Energy today" value={`${totals.calories} kcal`} hint={`Target ${targets.calories} kcal`} />
            <Stat label="Protein today" value={`${totals.protein} g`} hint={`Target ${targets.protein} g`} />
            <Stat
              label="Iron today"
              value={`${totals.iron} mg`}
              hint={targets.iron > 12 ? `Maternal Target ${targets.iron} mg` : `Target ${targets.iron} mg`}
            />
            <Stat label="Vitamin A today" value={`${totals.vitA} µg`} hint={`Target ${targets.vitA} µg`} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Meals logged today</h2>
                {user ? (
                  <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Cloud Synchronized
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Local Device Storage
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="input" aria-label="Choose a meal">
                  <option value="">Choose an indigenous recipe to log</option>
                  {dishes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.calories} kcal, {d.iron_mg}mg iron)
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-primary shrink-0" onClick={addMeal} disabled={!selected || busy}>
                  {busy ? 'Saving...' : 'Add meal'}
                </button>
              </div>

              {todayItems.length === 0 ? (
                <p className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">No meals logged yet today.</p>
              ) : (
                <ul className="mt-6 divide-y divide-slate-100">
                  {todayItems.map((item, i) => (
                    <li key={`${item.id}-${i}`} className="flex items-center gap-4 py-3">
                      {item.dish.image_url && <img src={item.dish.image_url} alt="" className="h-12 w-12 rounded-md object-cover shadow-xs" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.dish.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.dish.calories} kcal &middot; {item.dish.protein_g}g protein &middot; {item.dish.iron_mg}mg iron
                        </p>
                      </div>
                      <button type="button" className="btn-ghost text-xs text-red-600 hover:text-red-700" onClick={() => removeMeal(item, i)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card space-y-5 p-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-lg font-semibold">Progress vs {targets.label}</h2>
                <p className="text-xs text-slate-500">Tailored to clinical cohort guidelines</p>
              </div>
              <Progress label="Energy" value={totals.calories} target={targets.calories} unit="kcal" />
              <Progress label="Protein" value={totals.protein} target={targets.protein} unit="g" />
              <Progress label="Iron" value={totals.iron} target={targets.iron} unit="mg" />
              <Progress label="Vitamin A" value={totals.vitA} target={targets.vitA} unit="µg" />
            </section>
          </div>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">Energy intake trend (last 7 days)</h2>
            <div className="mt-6 flex h-48 items-end gap-3">
              {week.map((w) => (
                <div key={w.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-xs text-slate-500">{w.calories || ''}</span>
                  <div
                    className={`w-full max-w-[48px] rounded-t-md transition-all ${w.key === today ? 'bg-brand' : 'bg-brand-mint'}`}
                    style={{ height: `${Math.max(2, (w.calories / maxWeek) * 100)}%` }}
                  />
                  <span className="text-xs font-medium text-slate-600">{w.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
