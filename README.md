# HealthAlign Clinic: Appointment & Follow-Up Portal

HealthAlign is a comprehensive, multi-role Healthcare booking and consultation platform. It enables patients to reserve slots with custom symptom intake, and provides doctors with AI-powered intake insights, clinical notes translation, and automated prescription tracking.

---

## 1. Quick Start (Local Setup)

Follow these steps to run the application locally.

### Prerequisites
* **Node.js**: v18 or later
* **PostgreSQL**: Local or hosted database instance
* **Redis** (Optional): Required for real background workers. If missing, the app uses an in-memory queue fallback.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and fill in your connection details:
```bash
cp .env.example .env
```

### Step 3: Run Database Migrations & Seeds
Push the Prisma schema to your PostgreSQL database and run the seeder:
```bash
# Push schema structure to database
npx prisma db push

# Generate client typings
npx prisma generate

# Populate demo credentials and appointments data
npx prisma db seed
```

### Step 4: Launch the Development Server
```bash
npm run dev
```
The portals are now live at **[http://localhost:3000](http://localhost:3000)**.

---

## 2. Seed Portal Credentials

The seeder populates the database with the following test credentials:

| Portal Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@healthcare.local` | `admin123` | Doctor profile management and leave calendars |
| **Doctor** (Smith) | `doctor.smith@healthcare.local` | `doctor123` | Specialist workspace and patient summaries |
| **Doctor** (Jones) | `doctor.jones@healthcare.local` | `doctor123` | Specialist workspace |
| **Patient** (Alice) | `patient.alice@healthcare.local` | `patient123` | Symptoms intake booking & prescriptions |
| **Patient** (Bob) | `patient.bob@healthcare.local` | `patient123` | Symptoms intake booking |

---

## 3. Key Core API Routes

### Appointment Booking & Holds
* `POST /api/slots/hold`: Creates a temporary Redis slot lock. Required parameters: `doctorId`, `dateTime`.
* `POST /api/slots/book`: Resolves hold lock and creates appointment records. Required parameters: `doctorId`, `dateTime`, `symptoms`.

### AI Symptoms & Summaries
* `POST /api/appointments/[id]/pre-summary`: Triggers the LLM pre-visit symptom evaluation. Returns an `x-ai-status` header.
* `POST /api/appointments/[id]/post-summary`: Submits doctor's notes, processes medication schedules, and marks appointments as completed in a transaction. Required parameters: `clinicalNotes`.

### Cron Alerts & Reminders
* `GET /api/cron/medication-reminders`: Iterates over active medications and sends dosage alerts to the email worker.

---

## 4. Production Deployment

* **Frontend & Serverless API**: Deploy to **Vercel** or Netlify.
* **Database**: Hosted PostgreSQL provider (Neon, Supabase, or AWS RDS).
* **Redis Lock Manager**: Hosted Redis provider (Upstash Redis, Redis Labs, or Heroku Redis).
* **Queue Workers**: Deploy a persistent worker instance on Render, Heroku, or railway running `node dist/lib/queue/workers.js` to process jobs.
