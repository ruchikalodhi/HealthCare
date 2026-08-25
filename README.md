# HealthCare Clinic: Appointment Booking & Follow-Up Portal

HealthCare is a secure, multi-role medical booking and consultation platform. It enables patients to book visits with temporary slots locking, provides doctors with AI-powered pre-visit insights, clinical translations, and automated medication schedules, and gives admins granular doctor management controls.

<img width="1900" height="1079" alt="image" src="https://github.com/user-attachments/assets/54efc2bf-0cbd-495e-9f83-6749fe2a83c3" />

---

## 🚀 Key Feature Highlights

* **Dynamic Slot Booking Engine**: Automatically computes doctor availability based on working shifts, booked schedules, and active temporary holds.
* **Concurrency Control (TTL holds)**: Prevents double-booking via 5-to-10-minute temporary locks in Redis (`slot_hold:{doctorId}:{dateTimeISO}`) before checkout completion.
* **Intake AI Summary**: Generates pre-visit chief complaints, urgency ratings (`ROUTINE`, `URGENT`, `EMERGENCY`), and doctor-facing diagnostic questions using strict JSON structured outputs.
* **Clinical Translator**: Processes complex doctor notes and outputs jargon-free recovery summaries alongside structured drug prescriptions in a unified `prisma.$transaction`.
* **Background Jobs (BullMQ)**: Offloads transactional emails and Google Calendar event syncs (`googleEventId`) to asynchronous workers with exponential retry backoff policies.
* **Real Google Calendar Sync (OAuth 2.0)**: Doctors and patients connect their Google account from Settings; booking, rescheduling, and cancelling appointments create, update, or delete a real event (with both parties as attendees) via the Calendar API — see "Google Calendar Setup" below.
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
# Direct (non-pooled) connection, required by schema.prisma's `directUrl`.
# Same value as DATABASE_URL unless your Postgres host pools connections.
DIRECT_URL="postgresql://user:pass@localhost:5432/healthcare"
NEXTAUTH_SECRET="your-jwt-auth-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Redis Config (optional fallback is in-memory)
REDIS_URL="redis://localhost:6379"

# AI Summaries (optional fallback is mock parser)
OPENAI_API_KEY="sk-proj-your-key"

# Transactional Notifications (optional mock fallbacks)
GOOGLE_CLIENT_ID="oauth-client-id"
GOOGLE_CLIENT_SECRET="oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Required to call /api/cron/medication-reminders (see "Deployment" section)
CRON_SECRET="a-random-secret-here"
```

### Step 2.5: Google Calendar Setup

Without this, calendar sync silently falls back to a logged mock event (see
`src/lib/calendar/google.ts`) — appointments still book fine, but nothing
appears on anyone's real calendar. To enable real Google Calendar events:

1. **Create a Google Cloud project.** Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project (or select an existing one).
2. **Enable the Calendar API.** In the project, go to *APIs & Services → Library*, search for **Google Calendar API**, and click **Enable**.
3. **Configure the OAuth consent screen.** Under *APIs & Services → OAuth consent screen*, choose **External** (or **Internal** if you're on a Google Workspace org), fill in the app name/support email, and add the scope `https://www.googleapis.com/auth/calendar.events`. While the app is in "Testing" mode, add any Google accounts you'll test with (doctor/patient test users) under **Test users**.
4. **Create an OAuth client ID.** Under *APIs & Services → Credentials → Create Credentials → OAuth client ID*, choose **Web application**.
5. **Set the authorized redirect URI.** Add exactly:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   (swap the host for your deployed domain in production, e.g. `https://yourapp.com/api/auth/google/callback`).
6. **Copy the client ID/secret** into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and make sure `GOOGLE_REDIRECT_URI` matches step 5 exactly.
7. **Connect an account in the app.** After logging in as a doctor (or patient), go to **Settings → Google Calendar → Connect Google Calendar**. This starts the consent flow at `/api/auth/google/connect` and stores the resulting tokens in the `GoogleAccount` table. Appointments are created on the calendar of the doctor tied to the appointment, with the patient and doctor added as attendees.

If a doctor hasn't connected their Google account, booking still works — the system logs a mock event instead of failing the request.

### Step 2.6: Generate the initial migration (one-time, before first deploy)

This repo currently has no `prisma/migrations/` history — schema changes have
only ever been applied with `prisma db push`, which syncs the schema directly
and can silently drop or alter columns on a database that already has data.
That's fine for a disposable local dev DB; it is **not** safe once real rows
exist. Before your first production deploy, generate a real migration once,
against your local dev database, and commit it:

```bash
npx prisma migrate dev --name init
```

This creates `prisma/migrations/<timestamp>_init/migration.sql`. Commit that
folder. From then on, use `npx prisma migrate dev --name <change>` locally for
schema changes, and `npx prisma migrate deploy` (not `db push`) in your
production deploy pipeline.

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

### Step 5: Start the Background Worker (required if `REDIS_URL` is set)

Booking confirmations, cancellation notices, post-visit summary emails, medication
reminders, and Google Calendar sync are all dispatched as BullMQ jobs
(`src/lib/queue/client.ts`). Those jobs are only *consumed* by the `Worker`
instances defined in `src/lib/queue/workers.ts` — and nothing in the Next.js
app itself keeps that module running long enough to process them.

- **If `REDIS_URL` is left unset** (default for local dev), you don't need
  this step — `MockQueue` processes jobs inline automatically.
- **If `REDIS_URL` is set** (recommended for anything beyond local dev, since
  the in-memory `MockQueue`/in-memory Redis fallback doesn't survive process
  restarts or work across multiple server instances), run the worker as its
  own long-lived process alongside the web app:

  ```bash
  npm run worker
  ```

  This process must **stay running continuously** — it's not a one-off
  script. In production, run it as a second deployed service (a Render/
  Railway/Fly.io "worker" service type, a small VM, or a Docker container)
  pointed at the same `REDIS_URL` and `DATABASE_URL` as the web app.

  ⚠️ **Vercel note:** Vercel's serverless functions terminate shortly after
  returning a response and cannot host a long-lived worker process. If the
  web app is deployed to Vercel, deploy `npm run worker` as a *separate*
  always-on service elsewhere (Render/Railway background worker, Fly.io, a
  VM, etc.) rather than trying to run it inside a Vercel function.

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
│   ├── schema.prisma              # DB schema (User, GoogleAccount, DoctorProfile, Appointment, AISummary, MedicationSchedule)
│   └── seed.ts                    # Multi-role test profiles seed script
├── src/
│   ├── middleware.ts               # NextAuth path authorization guard (role-based route access)
│   ├── worker.ts                   # Standalone entrypoint (`npm run worker`) — must run as its
│   │                                #   own long-lived process to actually consume queued BullMQ
│   │                                #   jobs when REDIS_URL is set (see "Step 5" above)
│   ├── lib/
│   │   ├── slots.ts                # Availability slot calculation engine
│   │   ├── validations.ts          # Zod request schemas
│   │   ├── prisma.ts / redis.ts    # Client singletons
│   │   ├── auth.ts                 # NextAuth config (credentials login)
│   │   ├── google-oauth.ts         # Google OAuth2Client helper: consent URL, token exchange, auto-refresh
│   │   ├── ai/
│   │   │   ├── client.ts / prompts.ts / schemas.ts
│   │   │   └── summaries.ts        # Structured intake insights & note translations
│   │   ├── queue/
│   │   │   ├── client.ts           # BullMQ Redis setup (falls back to inline MockQueue)
│   │   │   └── workers.ts          # Background job dispatch: emails + Google Calendar sync
│   │   ├── email/
│   │   │   ├── client.ts           # SMTP/Resend transporter
│   │   │   └── templates.ts        # Email HTML/text templates
│   │   └── calendar/
│   │       └── google.ts           # Google Calendar event handlers (create/update/delete via googleapis)
│   ├── components/
│   │   ├── ui/                     # Button, Card, Input primitives
│   │   └── shared/
│   │       ├── Navbar.tsx / Sidebar.tsx
│   │       └── GoogleCalendarConnectCard.tsx  # "Connect Google Calendar" status card
│   └── app/
│       ├── page.tsx                # Design System Landing Page
│       ├── (auth)/                 # Login & Registration
│       ├── (dashboard)/
│       │   ├── admin/              # Overview, Manage Doctors, Onboard Doctor
│       │   ├── doctor/
│       │   │   ├── page.tsx        # Doctor dashboard
│       │   │   ├── appointments/[id]/
│       │   │   └── settings/       # Google Calendar connect (doctor)
│       │   └── patient/
│       │       ├── page.tsx        # Patient dashboard
│       │       ├── book/ · appointments/[id]/
│       │       └── settings/       # Google Calendar connect (patient)
│       └── api/
│           ├── auth/
│           │   ├── [...nextauth]/  # NextAuth credentials handler
│           │   ├── register/
│           │   └── google/
│           │       ├── connect/    # Starts the Google consent flow
│           │       └── callback/   # Exchanges code → tokens → GoogleAccount row
│           ├── slots/book/ · slots/hold/
│           ├── appointments/ · appointments/[id]/cancel/ · reschedule/ · pre-summary/ · post-summary/
│           ├── doctors/             # Patient-facing directory (any authenticated role),
│           │                        #   ?specialization= filter, used by the booking flow
│           ├── admin/doctors/[id]/  # Admin-only profile + leave-day updates/mutations
│           │                        #   (cascades cancellations); distinct from doctors/ above
│           ├── user/me/
│           └── cron/medication-reminders/
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
