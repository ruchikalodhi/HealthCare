# HealthCare Clinic: Appointment Booking & Follow-Up Portal

HealthCare is a secure, multi-role medical booking and consultation platform. It enables patients to book visits with temporary slots locking, provides doctors with AI-powered pre-visit insights, clinical translations, and automated medication schedules, and gives admins granular doctor management controls.

---

## 🚀 Key Feature Highlights

* **Dynamic Slot Booking Engine**: Automatically computes doctor availability based on working shifts, booked schedules, and active temporary holds.
* **Concurrency Control (TTL holds)**: Prevents double-booking via 5-to-10-minute temporary locks in Redis (`slot_hold:{doctorId}:{dateTimeISO}`) before checkout completion.
* **Intake AI Summary**: Generates pre-visit chief complaints, urgency ratings (`ROUTINE`, `URGENT`, `EMERGENCY`), and doctor-facing diagnostic questions using strict JSON structured outputs.
* **Clinical Translator**: Processes complex doctor notes and outputs jargon-free recovery summaries alongside structured drug prescriptions in a unified `prisma.$transaction`.
* **Background Jobs (BullMQ)**: Offloads transactional emails and Google Calendar event syncs (`googleEventId`) to asynchronous workers with exponential retry backoff policies.
* **Automatic Medication Reminders**: Scheduled daily cron triggers check active prescription schedules and queue dosage reminder notices.
* **Premium Design System**: Fully custom interface built with Navy `#232B59`, Accent Pink `#F2CEE2`, Accent Blue `#94C6F2`, Mint Green `#A7D9C1`, and Warm Yellow `#F2D06B`.

---

## 🛠️ Local Setup Instructions

### Prerequisites
* **Node.js**: v18 or later.
* **PostgreSQL**: Local server or cloud instance (e.g. Neon, Supabase).
* **Redis**: Required for BullMQ background workers and slot holds. (If missing, the system gracefully falls back to an in-memory cache and inline setTimeout task processor).

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/healthcare"
NEXTAUTH_SECRET="your-jwt-auth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Redis Config (optional fallback is in-memory)
REDIS_URL="redis://localhost:6379"

# AI Summaries (optional fallback is mock parser)
OPENAI_API_KEY="sk-proj-your-key"

# Transactional Notifications (optional mock fallbacks)
RESEND_API_KEY="re_yourkey"
GOOGLE_CLIENT_ID="oauth-client-id"
GOOGLE_CLIENT_SECRET="oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/callback/google"
```

### Step 3: Run Database Migrations & Seeds
Generate Prisma typings, push schemas, and execute the seeder script to populate demo profiles:
```bash
# Push schema structure to database
npx prisma db push

# Generate Prisma Client classes
npx prisma generate

# Populate test doctors, patients, and admin accounts
npx prisma db seed
```

### Step 4: Launch Dev Servers
```bash
# Start the Next.js development portal
npm run dev
```
The application is now live at **[http://localhost:3000](http://localhost:3000)**.

---

## 👥 Demo Test Credentials

Use these seeded credentials to test multi-role features:

| Role | Username / Email | Password | Access & Privileges |
| :--- | :--- | :--- | :--- |
| 🛡️ **Admin** | `admin@healthcare.local` | `admin123` | Onboard practitioners, update shifts, schedule doctor leave calendars. |
| 🩺 **Doctor** | `doctor.smith@healthcare.local` | `doctor123` | Consultations timeline, pre-visit symptoms intake summaries, note editor. |
| 🩺 **Doctor** | `doctor.jones@healthcare.local` | `doctor123` | Shift timeline and clinical workspace. |
| 👤 **Patient** | `patient.alice@healthcare.local` | `patient123` | Book slot locks, symptom checklist, view recovery guides and medication list. |
| 👤 **Patient** | `patient.bob@healthcare.local` | `patient123` | Book slot locks, symptom checklist, view recovery guides. |

---

## 📍 Core Folder Architecture

```
healthcare-appointment-system/
├── prisma/
│   ├── schema.prisma         # Database Schemas (User, Appointment, AISummary, MedicationSchedule)
│   └── seed.ts               # Multi-role test profiles seed script
├── src/
│   ├── middleware.ts         # NextAuth path authorization guard
│   ├── lib/
│   │   ├── slots.ts          # Availability slot calculation engine
│   │   ├── ai/
│   │   │   └── summaries.ts  # Structured intake insights & note translations
│   │   ├── queue/
│   │   │   ├── client.ts     # BullMQ Redis setup with exponential retries
│   │   │   └── workers.ts    # Background job dispatch (Emails, Google Calendar Sync)
│   │   ├── email/
│   │   │   └── client.ts     # SMTP transporter configuration
│   │   └── calendar/
│   │       └── google.ts     # Google Calendar event handlers
│   └── app/
│       ├── page.tsx          # Design System Landing Page
│       ├── (auth)/           # Framed Login & Registration Gates
│       └── (dashboard)/      # Multi-role layouts (Patient, Doctor, Admin panels)
```

---

## 🧪 Verification & Build Checks

To verify file types compile cleanly and verify production bundle sizes:
```bash
# Validate TypeScript compiles successfully
npx tsc --noEmit

# Test production optimization build
npx next build
```
Both checks must exit with code `0`.
