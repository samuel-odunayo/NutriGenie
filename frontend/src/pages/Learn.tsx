import { useState } from 'react';
import { PageHeader } from '../components/Layout';

const LANGUAGES = ['English', 'Pidgin', 'Hausa', 'Yoruba', 'Igbo'] as const;
type Language = (typeof LANGUAGES)[number];

const I18N: Record<Language, {
  eyebrow: string;
  title: string;
  desc: string;
  contactHeader: string;
  contactBody: string;
  closeBtn: string;
  playBtn: string;
}> = {
  English: {
    eyebrow: 'Health Education',
    title: 'Verified Maternal & Child Nutrition Guides',
    desc: 'Short, verified clinical guidance on indigenous dietetics, maternal care, and infant health.',
    contactHeader: 'Need advice from a Community Health Worker?',
    contactBody: 'Reach out to your ward health worker via the map, or dial *347*88# from any basic phone to request a home visit.',
    closeBtn: 'Close guide',
    playBtn: 'Play audio guide',
  },
  Pidgin: {
    eyebrow: 'Bodi Well Matter',
    title: 'Beta Food and Bodi Health for Mama and Pikin',
    desc: 'Clear guide on how to cook beta local chop to make mama and pikin bodi strong.',
    contactHeader: 'You wan talk to health worker for your area?',
    contactBody: 'Check health worker for the map, or press *347*88# for your phone make them come see you for house.',
    closeBtn: 'Close guide',
    playBtn: 'Play audio voice',
  },
  Hausa: {
    eyebrow: 'Ilimin Kiwon Lafiya',
    title: 'Jagorar Abinci Mai Gina Jiki ga Mata Masu Ciki da Yara',
    desc: 'Hanyoyin inganta lafiyar uwa da yaro ta hanyar cin abincin gida mai gina jiki.',
    contactHeader: 'Kuna son shawara daga ma\'aikacin kiwon lafiya?',
    contactBody: 'Nemi ma\'aikacin lafiyar ku a kan taswira, ko danna *347*88# a wayarku don neman ziyarar gida.',
    closeBtn: 'Rufe',
    playBtn: 'Saurari muryar bayani',
  },
  Yoruba: {
    eyebrow: 'Eko Nipa Ilera',
    title: 'Ounje Arowoto fun Aboyun ati Omode',
    desc: 'Awon itosona lori ounje abinibi ti o n fun ara lokun fun alaboyun ati awon omo wewe.',
    contactHeader: 'Nje e nilo imoran lowo osise eto ilera?',
    contactBody: 'Kan si osise eto ilera ti o wa nitosi re lori maapu, tabi te *347*88# lori foonu re lati beere fun ibewo.',
    closeBtn: 'Paade',
    playBtn: 'Gbo ohun',
  },
  Igbo: {
    eyebrow: 'Mmuta Maka Ezi Nlekota Ahu',
    title: 'Nri Na-edozi Ahu Maka Nne Dị Ime na Umuntakiri',
    desc: 'Uzo di mfe iji nri obodo anyi mee ka ahu nne di ime na umuaka sie ike nke oma.',
    contactHeader: 'I choro ndumodu site n\'aka onye oru ahuike?',
    contactBody: 'Kpọtụrụ onye ọrụ ahụike mpaghara gị na maapụ, ma ọ bụ pịa *347*88# n\'ekwentị gị ka ha bịa n\'ụlọ gị.',
    closeBtn: 'Mechie',
    playBtn: 'Gee nti n\'olu',
  },
};

const TOPICS = ['All', 'Maternal health', 'Child nutrition', 'Food and farming'] as const;

interface Resource {
  id: string;
  title: string;
  topic: (typeof TOPICS)[number];
  format: string;
  duration: string;
  image: string;
  summary: string;
  fullContent: string;
  clinicalTips: string[];
}

const RESOURCES: Resource[] = [
  {
    id: 'maternal-diet',
    title: 'Eating well during pregnancy',
    topic: 'Maternal health',
    format: 'Audio guide',
    duration: '6 min',
    image: '/assets/edu-community.png',
    summary: 'Which local foods supply iron, folate and protein, and why antenatal supplements matter.',
    fullContent:
      'During pregnancy, your body needs extra nutrients—especially Iron to prevent anemia and build the baby\'s blood supply. Local foods like brown beans, boiled eggs, sweet potatoes, and leafy greens (ugwu, bitterleaf) are packed with essential vitamins. Always pair iron-rich meals with Vitamin C fruits (oranges, pawpaw) to boost absorption.',
    clinicalTips: [
      'Take prescribed iron and folic acid tablets daily with clean water.',
      'Never skip meals; divide your food into 3 balanced meals and 2 nutritious snacks.',
      'Avoid drinking strong tea or coffee directly with meals as they reduce iron uptake.',
    ],
  },
  {
    id: 'prevent-anemia',
    title: 'Preventing anaemia with local foods',
    topic: 'Maternal health',
    format: 'Infographic',
    duration: '2 min read',
    image: '/assets/edu-infographics.png',
    summary: 'Combining beans, leafy greens and vitamin C rich fruit to improve iron absorption.',
    fullContent:
      'Maternal anemia is a leading cause of birth complications and fatigue in Nigeria. Eating dishes like "Beans and Yam Porridge" fortified with crayfish, ugwu, and red palm oil directly restores red blood cell counts without requiring expensive imported foods.',
    clinicalTips: [
      'Look out for early warning signs: pale palms, dizziness, and fast heartbeat.',
      'Cook beans with crayfish and greens for maximum bioavailable iron.',
      'Visit your local PHC for regular hemoglobin checks during antenatal visits.',
    ],
  },
  {
    id: 'complementary-feeding',
    title: 'Complementary feeding from six months',
    topic: 'Child nutrition',
    format: 'Video guide',
    duration: '8 min',
    image: '/assets/edu-video.png',
    summary: 'Introducing pap enriched with groundnut, egg and crayfish alongside continued breastfeeding.',
    fullContent:
      'From 6 months of age, breast milk alone is no longer enough for your growing infant. Enriched pap (Tom Brown / Ogi) made by grinding corn, millet, roasted groundnuts, and dried fish provides dense calories and micronutrients required to prevent childhood stunting.',
    clinicalTips: [
      'Continue breastfeeding on demand up to 2 years of age or beyond.',
      'Start with 2-3 spoonfuls of thick, enriched porridge twice daily, increasing gradually.',
      'Ensure all feeding utensils are washed with clean boiled water and soap.',
    ],
  },
  {
    id: 'early-malnutrition',
    title: 'Recognising malnutrition early',
    topic: 'Child nutrition',
    format: 'Clinical guide',
    duration: '4 min read',
    image: '/assets/edu-newspaper.png',
    summary: 'Warning signs, how health workers check arm circumference, and when to visit the clinic.',
    fullContent:
      'Malnutrition often begins quietly. Community Health Workers use Mid-Upper Arm Circumference (MUAC) color-coded tapes to catch wasting early. Red indicates severe acute malnutrition requiring immediate RUTF treatment at the PHC; yellow indicates moderate risk; green indicates healthy growth.',
    clinicalTips: [
      'Regularly have your child weighed at the Primary Healthcare Centre during immunization.',
      'Watch for swelling of both feet, thinning hair, or persistent loss of appetite.',
      'Prompt treatment saves lives; visit the clinic immediately if your child refuses feeds.',
    ],
  },
  {
    id: 'vitamin-a-farm',
    title: 'Vitamin A from the farm',
    topic: 'Food and farming',
    format: 'Audio guide',
    duration: '5 min',
    image: '/assets/turmeric-soup.png',
    summary: 'Red palm oil, orange-fleshed sweet potato, pumpkin and carrots as affordable vitamin A sources.',
    fullContent:
      'Vitamin A protects eyesight and strengthens children against measles and diarrhea. Nigeria is blessed with natural Vitamin A sources: unbleached red palm oil, carrots, mangoes, and orange-fleshed sweet potatoes. Just 1 tablespoon of red palm oil in soup supplies the daily requirement.',
    clinicalTips: [
      'Do not bleach palm oil until clear; bleaching destroys over 90% of its Vitamin A.',
      'Plant orange-fleshed sweet potato in your home garden for year-round family nutrition.',
      'Infants from 6 months should receive routine Vitamin A capsules at immunization days.',
    ],
  },
  {
    id: 'budget-produce',
    title: 'Buying fresh produce on a budget',
    topic: 'Food and farming',
    format: 'Article',
    duration: '3 min read',
    image: '/assets/beans-and-yam.png',
    summary: 'Seasonal buying, storage tips and how to find community markets on the health map.',
    fullContent:
      'Nutritious food does not need to be expensive. By tracking seasonal crops at local agro-markets (like Dutse Alhaji and Bwari markets), families can purchase staple pulses, roots, and vegetables at harvest lows and dry or store them safely.',
    clinicalTips: [
      'Buy leafy greens early in the morning when moisture and vitamins are highest.',
      'Dry fish and ground crayfish can be stored in airtight containers to add protein to any meal.',
      'Use the NutriGenie health map to find registered community agro-markets nearby.',
    ],
  },
];

export function LearnPage() {
  const [language, setLanguage] = useState<Language>('English');
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('All');
  const [activeModal, setActiveModal] = useState<Resource | null>(null);

  const t = I18N[language];
  const visible = RESOURCES.filter((r) => topic === 'All' || r.topic === topic);

  return (
    <>
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.desc}
        actions={
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-slate-700">Language:</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="input w-auto py-1.5 text-xs font-semibold"
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        }
      />

      <div className="container-page py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {TOPICS.map((top) => (
            <button
              key={top}
              type="button"
              onClick={() => setTopic(top)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                topic === top ? 'bg-brand text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {top}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <article
              key={r.id}
              onClick={() => setActiveModal(r)}
              className="card group flex cursor-pointer flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="aspect-[16/9] bg-slate-100 overflow-hidden">
                <img
                  src={r.image}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="eyebrow">{r.topic}</p>
                <h2 className="mt-1 font-semibold text-slate-900 group-hover:text-brand">{r.title}</h2>
                <p className="mt-2 flex-1 text-sm text-slate-600 leading-relaxed">{r.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="font-medium text-brand">{r.format} &middot; {r.duration}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{language}</span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Interactive Clinical Reader Modal */}
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6 sm:p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <span className="eyebrow">{activeModal.topic}</span>
                  <h2 className="mt-1 font-serif text-2xl font-bold text-slate-900">{activeModal.title}</h2>
                  <p className="text-xs text-slate-500">{activeModal.format} &middot; {activeModal.duration} &middot; {language}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
                <p>{activeModal.fullContent}</p>

                <div className="rounded-xl border border-brand/20 bg-brand-soft p-5">
                  <h3 className="font-semibold text-brand-dark">Clinical & Healthcare Guidelines:</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                    {activeModal.clinicalTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setActiveModal(null)}
                >
                  {t.closeBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 rounded-xl bg-brand-soft p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">{t.contactHeader}</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            {t.contactBody}
          </p>
        </div>
      </div>
    </>
  );
}
