import { useEffect, useState } from 'react';
import { fetchDailyPlan, type DailyPlan, type Dish } from '../api';
import { PageHeader } from '../components/Layout';
import { Badge, Loading, Progress } from '../components/ui';
import { href } from '../router';
import { useApp } from '../state';

const COHORTS = ['Pregnant Mother', 'Nursing Mother', 'Standard Adult', 'Infant / Child'];

function MealRow({ slot, time, dish }: { slot: string; time: string; dish: Dish }) {
  return (
    <a
      href={href(`recipes/${dish.id}`)}
      className="card flex flex-col overflow-hidden transition-shadow hover:shadow-md sm:flex-row"
    >
      <div className="aspect-[16/9] w-full shrink-0 bg-slate-100 sm:aspect-auto sm:h-auto sm:w-56">
        {dish.image_url && <img src={dish.image_url} alt={dish.name} loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">{slot} &middot; {time}</p>
          <span className="text-sm text-slate-500">{dish.cooking_time_mins} min</span>
        </div>
        <h3 className="text-lg font-semibold">{dish.name}</h3>
        {dish.staple_crops && <p className="text-sm text-slate-600">Local ingredients: {dish.staple_crops}</p>}
        <dl className="mt-auto grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
          {[
            ['Energy', `${dish.calories} kcal`],
            ['Protein', `${dish.protein_g} g`],
            ['Carbs', `${dish.carbs_g} g`],
            ['Iron', `${dish.iron_mg} mg`],
            ['Vitamin A', `${dish.vitamin_a_ug} µg`],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="font-semibold text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </a>
  );
}

export function MealPlanPage() {
  const { user } = useApp();
  const [cohort, setCohort] = useState<string>(user?.patient_category || 'Pregnant Mother');
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  useEffect(() => {
    fetchDailyPlan(cohort).then(setPlan);
  }, [cohort]);

  return (
    <>
      <PageHeader
        eyebrow="Meal Plan"
        title="Balanced Daily Nigerian Diet"
        description="Nutritional meal plans built from indigenous staples, balanced for maternal energy, protein, iron and vitamin A."
        actions={
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Cohort:</label>
            <select
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              className="input w-auto py-1.5 text-xs font-medium"
            >
              {COHORTS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {!plan ? (
            <Loading />
          ) : (
            <>
              <MealRow slot="Breakfast" time="7:00" dish={plan.breakfast} />
              <MealRow slot="Lunch" time="13:00" dish={plan.lunch} />
              <MealRow slot="Dinner" time="19:00" dish={plan.dinner} />
            </>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Daily totals</h2>
              <span className="rounded bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">{cohort}</span>
            </div>
            {plan ? (
              <>
                <p className="mt-4 text-3xl font-semibold">{plan.summary.total_calories} <span className="text-base font-normal text-slate-500">kcal</span></p>
                <div className="mt-6 space-y-5">
                  <Progress
                    label="Protein"
                    value={plan.summary.total_protein_g}
                    target={plan.summary.target_protein_g ?? 60}
                    unit="g"
                  />
                  <Progress
                    label="Iron"
                    value={plan.summary.total_iron_mg}
                    target={plan.summary.target_iron_mg ?? 12}
                    unit="mg"
                  />
                  <Progress
                    label="Vitamin A"
                    value={plan.summary.total_vitamin_a_ug}
                    target={plan.summary.target_vitamin_a_ug ?? 500}
                    unit="µg"
                  />
                </div>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge tone={plan.summary.iron_target_met ? 'success' : 'warning'}>
                    Iron {plan.summary.iron_target_met ? 'target met' : 'below target'}
                  </Badge>
                  <Badge tone={plan.summary.vitamin_a_target_met ? 'success' : 'warning'}>
                    Vitamin A {plan.summary.vitamin_a_target_met ? 'target met' : 'below target'}
                  </Badge>
                </div>
              </>
            ) : (
              <Loading />
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold">Maternal Health Guidance</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Add ugwu (pumpkin leaves) or waterleaf to soups to raise dietary iron.</li>
              <li>Red palm oil and orange-fleshed sweet potato provide vital pro-vitamin A.</li>
              <li>Pregnant mothers require 27mg of iron daily; take antenatal supplements as prescribed at your clinic.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
