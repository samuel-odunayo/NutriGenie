import { useEffect, useState } from 'react';
import {
  fetchDailyPlan,
  fetchNearbyFacilities,
  fetchReferrals,
  fetchWardHeatmaps,
  type DailyPlan,
  type Facility,
  type Referral,
  type WardVulnerability,
} from '../api';
import { PageHeader } from '../components/Layout';
import { DishCard } from '../components/DishCard';
import { Badge, Loading, Progress, SectionHeading, Stat, riskTone } from '../components/ui';
import { href } from '../router';
import { useApp } from '../state';

export function DashboardPage() {
  const { user } = useApp();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [nearby, setNearby] = useState<Facility[]>([]);
  const [wards, setWards] = useState<WardVulnerability[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    fetchDailyPlan(user?.patient_category || undefined).then(setPlan);
    fetchNearbyFacilities(9.28, 7.38).then(setNearby);
    fetchWardHeatmaps().then(setWards);
    if (user) {
      fetchReferrals().then(setReferrals);
    }
  }, [user]);

  const nearestPhc = nearby.find((f) => f.facility_type === 'PHC');
  const pending = referrals.filter((r) => r.status === 'PENDING').length;
  const greeting = user ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Dashboard';

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={greeting}
        description="Today's nutrition, nearby care and referral activity at a glance."
        actions={
          <>
            <a href={href('meal-plan')} className="btn-secondary">Meal plan</a>
            <a href={href('care')} className="btn-primary">New referral</a>
          </>
        }
      />

      <div className="container-page space-y-10 py-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Energy planned today" value={plan ? `${plan.summary.total_calories} kcal` : '-'} />
          <Stat label="Iron planned today" value={plan ? `${plan.summary.total_iron_mg} mg` : '-'} hint="Target 12 mg" />
          <Stat
            label="Nearest health centre"
            value={nearestPhc?.distance_km != null ? `${nearestPhc.distance_km} km` : '-'}
            hint={nearestPhc?.name}
          />
          <Stat label="Pending referrals" value={pending} hint={`${referrals.length} total`} />
        </section>

        <section>
          <SectionHeading title="Today's meals" action={<a href={href('meal-plan')} className="text-sm font-semibold text-brand hover:underline">Full plan</a>} />
          {!plan ? (
            <Loading />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <DishCard dish={plan.breakfast} label="Breakfast" />
              <DishCard dish={plan.lunch} label="Lunch" />
              <DishCard dish={plan.dinner} label="Dinner" />
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6">
            <SectionHeading title="Micronutrient targets" />
            {plan ? (
              <div className="space-y-5">
                <Progress label="Iron" value={plan.summary.total_iron_mg} target={12} unit="mg" />
                <Progress label="Vitamin A" value={plan.summary.total_vitamin_a_ug} target={500} unit="µg" />
                <Progress label="Protein" value={plan.summary.total_protein_g} target={60} unit="g" />
              </div>
            ) : (
              <Loading />
            )}
          </div>

          <div className="card overflow-hidden lg:col-span-2">
            <div className="p-6 pb-0">
              <SectionHeading title="Ward nutrition risk" action={<a href={href('map')} className="text-sm font-semibold text-brand hover:underline">View map</a>} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Ward</th>
                    <th className="px-6 py-3 font-medium">Iron deficiency</th>
                    <th className="px-6 py-3 font-medium">Vitamin A deficiency</th>
                    <th className="px-6 py-3 font-medium">Health workers</th>
                    <th className="px-6 py-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wards.map((w) => (
                    <tr key={w.id}>
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-900">{w.ward_name}</p>
                        <p className="text-xs text-slate-500">{w.lga}, {w.state}</p>
                      </td>
                      <td className="px-6 py-3">{w.iron_deficiency_pct}%</td>
                      <td className="px-6 py-3">{w.vitamin_a_deficiency_pct}%</td>
                      <td className="px-6 py-3">{w.active_chw_count}</td>
                      <td className="px-6 py-3"><Badge tone={riskTone(w.stunting_risk_level)}>{w.stunting_risk_level}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
