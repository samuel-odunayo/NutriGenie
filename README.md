# NutriGenie (NutriFit)

Integrated Geospatial Health, Indigenous Clinical Nutrition, and Telecom Care Continuity for Underserved Communities.

NutriGenie is an integrated digital health and nutrition intervention platform developed for primary healthcare systems and rural households, piloted across Federal Capital Territory (FCT) wards including Bwari Central, Kuje, and Dutse Alhaji. The system connects community-level nutrition monitoring, primary healthcare centre (PHC) referrals, and basic feature phone telecom access (USSD code *347*88# and automated SMS).

---

## System Overview

Malnutrition, maternal anemia, and childhood stunting remain critical public health challenges across rural and peri-urban communities in Nigeria. NutriGenie addresses these challenges through five core capabilities:

1. **Indigenous Clinical Nutrition:** Nutritional profiles for locally available staples (beans, sweet yam, red palm oil, ugwu, turmeric) calibrated against maternal and child Recommended Daily Allowances (RDAs).
2. **Dynamic Maternal Health Targets:** Automated adjustment of nutritional targets according to patient demographics (e.g., 27.0 mg daily iron for pregnant mothers to prevent maternal anemia, 15.0 mg for nursing mothers, and 12.0 mg for standard adults).
3. **Geospatial Health GIS:** OpenStreetMap facility mapping covering Primary Healthcare Centres, Community Health Worker (CHW) posts, and community agro-markets with walking distance estimation and ward vulnerability risk heatmaps.
4. **Care Continuity and Referrals:** Standardized referral logging between Community Health Workers and PHC clinics, featuring automated SMS appointment reminders and compliance with the Nigeria Data Protection Act (NDPA 2023).
5. **Basic Phone Telecom Gateway:** Feature phone USSD menu (*347*88#) operating over telco protocols to query live facility information, check referral statuses, and log home visit requests without smartphone or internet requirements.

---

## Technology Stack

### Backend
- **Language & Framework:** Python 3.12, FastAPI
- **Database & ORM:** SQLAlchemy 2.0 (asyncio), aiosqlite (local dev) / PostgreSQL (production)
- **Security & Authentication:** PyJWT (signed Bearer tokens), Passlib/Bcrypt (salted password/PIN hashing), Role-Based Access Control (RBAC)
- **Validation:** Pydantic v2
- **Testing:** Pytest, HTTPX

### Frontend
- **Framework:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Mapping & GIS:** Leaflet, OpenStreetMap
- **State Management:** React Context with verified JWT persistence

### Infrastructure & Deployment
- **Containerization:** Docker, Docker Compose
- **Web Server:** Nginx (SPA reverse proxy)
- **Cloud Configurations:** Render Blueprint (render.yaml), Vercel (vercel.json)

---

## Project Structure

```text
nutrifit/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py             # Application settings and environment configuration
│   │   │   ├── database.py           # Async database engine, sessionmaker, base model
│   │   │   ├── events.py             # Asynchronous in-process domain event bus
│   │   │   └── security.py           # Bcrypt password hashing and JWT token operations
│   │   ├── modules/
│   │   │   ├── identity/             # Authentication, user models, roles, dependencies
│   │   │   ├── nutrition/            # Recipes, daily plan generator, cloud intake logs
│   │   │   ├── gis/                  # Facilities, ward vulnerability heatmaps, routing
│   │   │   ├── referrals/            # Patient care continuity, CHW tracking, foreign keys
│   │   │   └── telecom/              # USSD *347*88# state machine, SMS logging & dispatch
│   │   └── main.py                   # FastAPI application initialization and CORS setup
│   ├── tests/
│   │   └── test_api.py               # Automated Pytest suite
│   ├── Dockerfile                    # Backend production container specification
│   ├── requirements.txt              # Python package dependencies
│   └── test_modules.py               # End-to-end domain verification script
├── frontend/
│   ├── src/
│   │   ├── components/               # Layout, navigation, UI components, recipe cards
│   │   ├── pages/                    # Dashboard, MealPlan, Recipes, Tracker, Map, Care, Learn, Account
│   │   ├── api.ts                    # Authenticated API client with offline fallback data
│   │   ├── state.tsx                 # Application state and JWT persistence
│   │   └── router.ts                 # Hash-based client router
│   ├── Dockerfile                    # Multi-stage container build (Vite + Nginx)
│   ├── package.json                  # Node dependencies and scripts
│   └── vercel.json                   # Vercel SPA routing configuration
├── docker-compose.yml                # Multi-container orchestration
├── render.yaml                       # Cloud deployment blueprint for Render.com
├── vercel.json                       # Root monorepo configuration for Vercel
└── README.md                         # Project documentation
```

---

## API Endpoints

The API is prefixed under `/api/v1` and provides interactive OpenAPI documentation at `/docs`.

### Identity & Access Control
- `POST /api/v1/identity/register` - Register a new user (CITIZEN, CHW, or PHC_ADMIN with key).
- `POST /api/v1/identity/login` - Authenticate using phone number and PIN/password to receive a JWT.
- `GET /api/v1/identity/me` - Retrieve authenticated user profile (Requires Bearer token).

### Nutrition & Dietetics
- `GET /api/v1/nutrition/dishes` - List indigenous Nigerian dishes and nutritional values.
- `POST /api/v1/nutrition/dishes` - Create a new dish entry (Restricted to CHW/Admin).
- `GET /api/v1/nutrition/daily-plan` - Generate a balanced daily meal plan tailored by cohort.
- `POST /api/v1/nutrition/intake` - Log a meal entry to the user's cloud history (Authenticated).
- `GET /api/v1/nutrition/intake` - Query logged meals for a specific date or period.
- `DELETE /api/v1/nutrition/intake/{id}` - Delete a logged intake record.

### Geospatial Health & Facilities (GIS)
- `GET /api/v1/gis/facilities` - List mapped PHCs, CHW posts, and agro-markets.
- `GET /api/v1/gis/nearby` - Query facilities sorted by geodesic distance from provided coordinates.
- `GET /api/v1/gis/ward-heatmaps` - Retrieve ward-level micronutrient deficiency statistics.
- `GET /api/v1/gis/route` - Generate walking navigation steps between origin and destination.

### Care Continuity & Referrals
- `POST /api/v1/referrals/` - Create a clinical referral (triggers automated SMS dispatch).
- `GET /api/v1/referrals/` - List referrals with role segregation (Citizens see own; Staff see ward).
- `PATCH /api/v1/referrals/{id}/status` - Update referral state (Restricted to CHW/Admin).

### Telecom & Messaging
- `POST /api/v1/telecom/ussd` - Africa's Talking / Telco USSD callback webhook for *347*88#.
- `POST /api/v1/telecom/sms/send` - Send an SMS notification (Restricted to CHW/Admin).
- `GET /api/v1/telecom/sms/history` - View dispatch logs with phone number masking.

---

## Getting Started

### Prerequisites
- Python 3.12 or newer
- Node.js 18 or newer
- Git

---

### Local Development Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/samuel-odunayo/NutriGenie.git
cd NutriGenie
```

#### 2. Configure and Run Backend
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Endpoint: `http://127.0.0.1:8000`
- Swagger Documentation: `http://127.0.0.1:8000/docs`

#### 3. Configure and Run Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
- Frontend UI: `http://localhost:5173`

---

### Running via Docker Compose

To run the complete stack in isolated containers:
```bash
docker-compose up --build
```
- Frontend: `http://localhost` (Port 80)
- Backend: `http://localhost:8000`

---

## Testing & Quality Assurance

### Pytest Backend Test Suite
```bash
cd backend
.\venv\Scripts\pytest
```

### End-to-End Domain Verification
Executes integration tests against all 5 domain modules including live database USSD queries, token verification, and SMS alerts:
```bash
cd backend
.\venv\Scripts\python test_modules.py
```

### Frontend Build & Typecheck
```bash
cd frontend
npm run build
```

---

## Cloud Deployment

### Vercel (Frontend)
1. Navigate to https://vercel.com/new and import `samuel-odunayo/NutriGenie`.
2. The included `vercel.json` automatically configures Vite build commands and single-page application routing rewrites.
3. Select Deploy.

### Render (Full Stack)
1. Navigate to https://dashboard.render.com.
2. Select New -> Blueprint and connect `samuel-odunayo/NutriGenie`.
3. Render automatically reads `render.yaml` to deploy both the Python FastAPI web service and the static frontend with SSL.

---

## Data Privacy & Compliance

NutriGenie is structured to comply with the Nigeria Data Protection Act (NDPA 2023):
- Patient health identifiers, pregnancy statuses, and contact numbers are protected behind authenticated role-based endpoints.
- Middle digits of phone numbers are masked in administrative and citizen overview displays.
- All stored passwords and field health worker PINs are protected with salted Bcrypt hashes.
- Database relational integrity ensures referral tracking connects with verified facility records.

---

## License

This project is licensed under the MIT License.
