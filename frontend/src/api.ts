/**
 * NutriGenie API client with secure JWT Bearer authentication,
 * cloud meal intake synchronization, and resilient offline fallbacks.
 */

export const API_ROOT = (
  import.meta.env.VITE_API_BASE ??
  (typeof window !== 'undefined' && window.location.port === '5173' ? '' : 'http://127.0.0.1:8000')
).replace(/\/$/, '');
const API_BASE = `${API_ROOT}/api/v1`;

const TOKEN_KEY = 'nutrigenie.token';

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

/* ---------- Types ---------- */

export interface Dish {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  iron_mg: number;
  vitamin_a_ug: number;
  cooking_time_mins: number;
  image_url: string | null;
  ingredients?: string | null;
  staple_crops?: string | null;
}

export interface MacroSummary {
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_iron_mg: number;
  total_vitamin_a_ug: number;
  cohort_label?: string;
  target_calories?: number;
  target_protein_g?: number;
  target_iron_mg?: number;
  target_vitamin_a_ug?: number;
  iron_target_met: boolean;
  vitamin_a_target_met: boolean;
}

export interface DailyPlan {
  date: string;
  cohort?: string;
  breakfast: Dish;
  lunch: Dish;
  dinner: Dish;
  summary: MacroSummary;
}

export interface IntakeLogEntry {
  id: number;
  user_id: number;
  dish_id: number;
  log_date: string;
  meal_type: string;
  created_at: string;
  dish?: Dish | null;
}

export type FacilityType = 'PHC' | 'CHW' | 'AgroMarket';

export interface Facility {
  id: number;
  name: string;
  facility_type: FacilityType;
  ward_name: string;
  state: string;
  latitude: number;
  longitude: number;
  contact_phone?: string | null;
  operating_hours: string;
  has_nutrition_clinic: boolean;
  has_ussd_dispatch: boolean;
  distance_km?: number | null;
}

export interface WardVulnerability {
  id: number;
  ward_name: string;
  lga: string;
  state: string;
  population: number;
  iron_deficiency_pct: number;
  vitamin_a_deficiency_pct: number;
  stunting_risk_level: 'High' | 'Moderate' | 'Low' | string;
  active_chw_count: number;
}

export interface RouteResponse {
  origin: string;
  destination: string;
  total_distance_km: number;
  estimated_walk_mins: number;
  steps: { instruction: string; distance_m: number }[];
}

export interface ReferralPayload {
  patient_name: string;
  patient_phone: string;
  patient_category: string;
  ward_name: string;
  chw_name: string;
  phc_name: string;
  diagnosis_reason: string;
  scheduled_date: string;
  patient_id?: number | null;
  facility_id?: number | null;
}

export interface Referral extends ReferralPayload {
  id: number;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

export interface SmsLog {
  id: number;
  recipient_phone: string;
  message_text: string;
  message_type: string;
  status: string;
  sent_at: string;
}

export interface User {
  id: number;
  full_name: string;
  phone_number: string;
  role: string;
  patient_category?: string | null;
  ward_name: string | null;
  state: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/* ---------- Offline fallback data ---------- */

const FALLBACK_DISHES: Dish[] = [
  {
    id: 1,
    name: 'Boiled Yam & Scrambled Egg',
    category: 'Breakfast',
    calories: 420,
    protein_g: 18.5,
    carbs_g: 62,
    fat_g: 11,
    iron_mg: 3.4,
    vitamin_a_ug: 160,
    cooking_time_mins: 20,
    image_url: '/assets/bread-and-egg.png',
    ingredients: 'White yam, fresh eggs, tomatoes, habanero, vegetable oil, onions',
    staple_crops: 'Yam, Egg, Pepper',
  },
  {
    id: 2,
    name: 'Brown Beans & Sweet Yam Porridge',
    category: 'Lunch',
    calories: 560,
    protein_g: 26,
    carbs_g: 88,
    fat_g: 9.5,
    iron_mg: 6.8,
    vitamin_a_ug: 320,
    cooking_time_mins: 45,
    image_url: '/assets/beans-and-yam.png',
    ingredients: 'Oloyin brown beans, diced sweet yam, red palm oil, crayfish, onions',
    staple_crops: 'Brown Beans, Yam, Red Palm Oil',
  },
  {
    id: 3,
    name: 'Nigerian Jollof Rice with Grilled Fish',
    category: 'Dinner',
    calories: 610,
    protein_g: 28,
    carbs_g: 94,
    fat_g: 14,
    iron_mg: 4.1,
    vitamin_a_ug: 410,
    cooking_time_mins: 40,
    image_url: '/assets/jollof-rice.png',
    ingredients: 'Long grain rice, tomato paste, red bell pepper, mackerel fish, bay leaves',
    staple_crops: 'Rice, Pepper, Fish',
  },
  {
    id: 4,
    name: 'Turmeric Vegetable Soup with Eba',
    category: 'Dinner',
    calories: 480,
    protein_g: 22,
    carbs_g: 72,
    fat_g: 10.5,
    iron_mg: 7.5,
    vitamin_a_ug: 580,
    cooking_time_mins: 30,
    image_url: '/assets/turmeric-soup.png',
    ingredients: 'Fresh turmeric root, pumpkin leaves (ugwu), waterleaf, cassava garri, dry fish',
    staple_crops: 'Turmeric, Ugwu Leaves, Cassava',
  },
];

const FALLBACK_FACILITIES: Facility[] = [
  {
    id: 1,
    name: 'Bwari Model Primary Health Care',
    facility_type: 'PHC',
    ward_name: 'Bwari Central',
    state: 'FCT',
    latitude: 9.281,
    longitude: 7.378,
    contact_phone: '+234 803 111 2233',
    operating_hours: '24/7 (Nutrition Unit)',
    has_nutrition_clinic: true,
    has_ussd_dispatch: true,
    distance_km: 0.8,
  },
  {
    id: 2,
    name: 'Kuje Comprehensive Rural Clinic',
    facility_type: 'PHC',
    ward_name: 'Kuje Ward',
    state: 'FCT',
    latitude: 8.892,
    longitude: 7.228,
    contact_phone: '+234 802 444 5566',
    operating_hours: '8am - 6pm (Mon-Sat)',
    has_nutrition_clinic: true,
    has_ussd_dispatch: true,
    distance_km: 3.4,
  },
  {
    id: 3,
    name: 'CHW Base Post - Fatima Bello (CHEW)',
    facility_type: 'CHW',
    ward_name: 'Bwari Central',
    state: 'FCT',
    latitude: 9.275,
    longitude: 7.382,
    contact_phone: '+234 814 777 8899',
    operating_hours: 'Home Visits & Emergencies',
    has_nutrition_clinic: true,
    has_ussd_dispatch: true,
    distance_km: 1.1,
  },
  {
    id: 4,
    name: 'Dutse Alhaji Community Agro-Market',
    facility_type: 'AgroMarket',
    ward_name: 'Dutse Ward',
    state: 'FCT',
    latitude: 9.155,
    longitude: 7.391,
    contact_phone: '+234 805 222 3344',
    operating_hours: 'Daily 6am - 6pm',
    has_nutrition_clinic: false,
    has_ussd_dispatch: false,
    distance_km: 4.2,
  },
];

const FALLBACK_WARDS: WardVulnerability[] = [
  { id: 1, ward_name: 'Bwari Central', lga: 'Bwari', state: 'FCT', population: 34200, iron_deficiency_pct: 36.2, vitamin_a_deficiency_pct: 28.5, stunting_risk_level: 'Moderate', active_chw_count: 8 },
  { id: 2, ward_name: 'Kuje Ward', lga: 'Kuje', state: 'FCT', population: 29800, iron_deficiency_pct: 42.1, vitamin_a_deficiency_pct: 33.4, stunting_risk_level: 'High', active_chw_count: 5 },
  { id: 3, ward_name: 'Dutse Ward', lga: 'Bwari', state: 'FCT', population: 41500, iron_deficiency_pct: 31.0, vitamin_a_deficiency_pct: 24.2, stunting_risk_level: 'Low', active_chw_count: 9 },
];

function summarise(b: Dish, l: Dish, d: Dish): MacroSummary {
  const sum = (k: keyof Dish) => [b, l, d].reduce((acc, x) => acc + Number(x[k] ?? 0), 0);
  const iron = Math.round(sum('iron_mg') * 10) / 10;
  const vitA = Math.round(sum('vitamin_a_ug') * 10) / 10;
  return {
    total_calories: sum('calories'),
    total_protein_g: Math.round(sum('protein_g') * 10) / 10,
    total_carbs_g: Math.round(sum('carbs_g') * 10) / 10,
    total_fat_g: Math.round(sum('fat_g') * 10) / 10,
    total_iron_mg: iron,
    total_vitamin_a_ug: vitA,
    cohort_label: 'Standard Adult',
    target_calories: 2000,
    target_protein_g: 60,
    target_iron_mg: 12,
    target_vitamin_a_ug: 500,
    iron_target_met: iron >= 12,
    vitamin_a_target_met: vitA >= 500,
  };
}

/* ---------- Authenticated Network Helpers ---------- */

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[api] using offline data for ${path}:`, err);
    return fallback;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === 'string') detail = data.detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

async function deleteJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}

/* ---------- System ---------- */

export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/gis/facilities`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/* ---------- Nutrition ---------- */

export const fetchDishes = () => getJson<Dish[]>('/nutrition/dishes', FALLBACK_DISHES);

export const fetchDailyPlan = (cohort?: string) => {
  const [b, l, d] = FALLBACK_DISHES;
  const query = cohort ? `?cohort=${encodeURIComponent(cohort)}` : '';
  return getJson<DailyPlan>(`/nutrition/daily-plan${query}`, {
    date: 'Today',
    cohort: cohort ?? 'Standard Adult',
    breakfast: b,
    lunch: l,
    dinner: d,
    summary: summarise(b, l, d),
  });
};

export const logMealIntake = (dish_id: number, log_date: string, meal_type: string = 'Meal') =>
  postJson<IntakeLogEntry>('/nutrition/intake', { dish_id, log_date, meal_type });

export const fetchUserIntakes = (date?: string) =>
  getJson<IntakeLogEntry[]>(date ? `/nutrition/intake?date=${encodeURIComponent(date)}` : '/nutrition/intake', []);

export const deleteMealIntake = (id: number) => deleteJson<{ status: string; id: number }>(`/nutrition/intake/${id}`);

/* ---------- GIS ---------- */

export const fetchFacilities = () => getJson<Facility[]>('/gis/facilities', FALLBACK_FACILITIES);

export const fetchNearbyFacilities = (lat: number, lon: number) =>
  getJson<Facility[]>(`/gis/nearby?lat=${lat}&lon=${lon}`, FALLBACK_FACILITIES);

export const fetchWardHeatmaps = () => getJson<WardVulnerability[]>('/gis/ward-heatmaps', FALLBACK_WARDS);

export const fetchRoute = (origin: string, destination: string) =>
  getJson<RouteResponse | null>(
    `/gis/route?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
    null,
  );

/* ---------- Telecom ---------- */

export async function sendUssd(sessionId: string, phoneNumber: string, text: string): Promise<string> {
  try {
    const form = new URLSearchParams({ sessionId, serviceCode: '*347*88#', phoneNumber, text });
    const res = await fetch(`${API_BASE}/telecom/ussd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch {
    return 'END The USSD service is unavailable. Please check that the backend is running.';
  }
}

export const fetchSmsHistory = () => getJson<SmsLog[]>('/telecom/sms/history', []);

/* ---------- Referrals ---------- */

export const fetchReferrals = (ward?: string) =>
  getJson<Referral[]>(ward ? `/referrals/?ward=${encodeURIComponent(ward)}` : '/referrals/', []);

export const createReferral = (payload: ReferralPayload) => postJson<Referral>('/referrals/', payload);

/* ---------- Identity ---------- */

export const registerUser = (payload: {
  full_name: string;
  phone_number: string;
  password?: string;
  role?: string;
  patient_category?: string;
  ward_name?: string;
  state?: string;
  admin_secret?: string;
}) => postJson<AuthResponse>('/identity/register', payload);

export const loginUser = (payload: { phone_number: string; password?: string }) =>
  postJson<AuthResponse>('/identity/login', payload);

export const fetchCurrentProfile = () => getJson<User | null>('/identity/me', null);
