import { href } from '../router';

const FEATURES = [
  {
    title: 'Affordable local nutrition',
    body: 'Balanced daily meal plans built from familiar, locally grown foods such as beans, yam, millet and leafy greens, with iron and vitamin A tracking.',
    link: 'meal-plan',
    cta: 'View meal plan',
  },
  {
    title: 'Find care close to home',
    body: 'A ward-level map of primary healthcare centres, community health workers and food markets, with walking directions that work offline.',
    link: 'map',
    cta: 'Open health map',
  },
  {
    title: 'Referrals that are followed up',
    body: 'Community health workers log referrals and patients receive SMS reminders. Basic phones can check status through USSD on *347*88#.',
    link: 'care',
    cta: 'Manage referrals',
  },
];

const STEPS = [
  { n: '01', title: 'Register', body: 'Sign up with a phone number as a community member, health worker or clinic administrator.' },
  { n: '02', title: 'Plan and track', body: 'Follow a daily meal plan and monitor energy, protein, iron and vitamin A against recommended targets.' },
  { n: '03', title: 'Get referred', body: 'A health worker refers you to the nearest facility and an SMS confirms the appointment.' },
  { n: '04', title: 'Stay in care', body: 'Reminders and follow-up visits keep mothers and children connected to care.' },
];

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-soft">
        <div className="container-page grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-tight sm:text-5xl">
              Healthy meals and trusted care for every community
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              NutriGenie connects households, community health workers and primary healthcare centres, so families can
              eat well, find care and stay in follow-up, online or on a basic phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={href('dashboard')} className="btn-primary px-5 py-3 text-base">Go to dashboard</a>
              <a href={href('map')} className="btn-secondary px-5 py-3 text-base">Find a health centre</a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src="/assets/beans-and-yam.png" alt="Beans and yam" className="aspect-square w-full rounded-2xl object-cover shadow-sm" />
            <img src="/assets/jollof-rice.png" alt="Jollof rice" className="mt-8 aspect-square w-full rounded-2xl object-cover shadow-sm" />
            <img src="/assets/turmeric-soup.png" alt="Turmeric vegetable soup" className="-mt-8 aspect-square w-full rounded-2xl object-cover shadow-sm" />
            <img src="/assets/bread-and-egg.png" alt="Bread and egg" className="aspect-square w-full rounded-2xl object-cover shadow-sm" />
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">What NutriGenie does</p>
          <h2 className="section-title mt-2">One platform for food, care and follow-up</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col p-6">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{f.body}</p>
              <a href={href(f.link)} className="mt-6 text-sm font-semibold text-brand hover:underline">
                {f.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="container-page py-16">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 className="section-title mt-2">From the household to the clinic</h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t-2 border-brand pt-4">
                <p className="text-sm font-semibold text-brand">{s.n}</p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="card grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-2xl font-semibold">No smartphone? Dial *347*88#</h2>
            <p className="mt-2 text-slate-600">
              Find the nearest health centre, receive a nutrition tip, check a referral or request a home visit from any
              mobile phone, without internet access.
            </p>
          </div>
          <a href={href('care')} className="btn-primary px-5 py-3">Try the USSD service</a>
        </div>
      </section>
    </>
  );
}
