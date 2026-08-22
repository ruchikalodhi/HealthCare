import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  BellRing,
  Heart,
  ChevronDown
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  // Decide route URLs dynamically depending on login status
  const patientBookRoute = session?.user ? '/patient/book' : '/login';
  const patientPortalRoute = session?.user ? '/patient' : '/login';
  const doctorPortalRoute = session?.user ? '/doctor' : '/login';

  return (
    <div className="min-h-screen bg-[#F2CEE2] p-3 md:p-6 font-sans">
      {/* Inner Rounded Frame Container */}
      <div className="min-h-[calc(100vh-3rem)] bg-[#FDFBFE] rounded-[32px] p-4 md:p-8 flex flex-col justify-between gap-8 border border-white/40 shadow-xl relative overflow-hidden">
        
        {/* 1. Pill-Style Clean Navbar */}
        <header className="bg-white rounded-full border border-slate-100 shadow-sm px-4 md:px-6 py-3 flex items-center justify-between gap-4 z-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-navyBg flex items-center justify-center text-white">
              <Heart className="h-4.5 w-4.5 text-accentPink fill-accentPink" />
            </div>
            <span className="font-extrabold text-lg text-navyBg tracking-tight">HealthCare</span>
          </Link>

          {/* Centered links and Auth Button */}
          <div className="flex items-center gap-4 md:gap-6 text-[11px] font-bold text-slate-600">
            <Link href={patientBookRoute} className="hover:text-navyBg transition">
              Find Doctors
            </Link>
            <a href="#how-it-works" className="hover:text-navyBg transition">
              How It Works
            </a>

            <div className="h-4 w-px bg-slate-200" />

            {session?.user ? (
              <Link
                href={
                  session.user.role === 'ADMIN'
                    ? '/admin'
                    : session.user.role === 'DOCTOR'
                    ? '/doctor'
                    : '/patient'
                }
                className="bg-navyBg text-white hover:bg-navyBg/90 text-xs px-4 py-2.5 rounded-full shadow transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2.5 text-navyBg hover:text-navyBg/80 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-navyBg text-white hover:bg-navyBg/90 text-xs px-4 py-2.5 rounded-full shadow transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </header>

        {/* 2. Hero Section */}
        <section className="bg-navyBg rounded-[32px] p-6 md:p-12 relative overflow-hidden flex flex-col justify-between min-h-[380px] md:min-h-[460px] shadow-lg border border-navyBg/50 z-0">
          {/* Backdrop Typography */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[12vw] font-black text-white/5 uppercase tracking-tighter select-none pointer-events-none z-0">
            Healthcare
          </div>

          {/* Floating static badges */}
          <div className="flex flex-wrap gap-2.5 z-10 pointer-events-none select-none">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/10">
              <Sparkles className="h-3.5 w-3.5 text-accentPink fill-accentPink" />
              <span>AI Intake Triage</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-accentGreen" />
              <span>Instant Slot Locking</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/10">
              <BellRing className="h-3.5 w-3.5 text-accentYellow" />
              <span>Automated Daily Reminders</span>
            </span>
          </div>

          {/* Right Cutout Doctor Image */}
          <div className="absolute right-4 bottom-0 top-4 w-full md:w-[44%] pointer-events-none z-0 hidden md:block">
            <div className="w-full h-full relative">
              <img
                src="https://images.unsplash.com/photo-1594824813586-74737d2f9b1f?auto=format&fit=crop&q=80&w=800"
                alt="Healthcare Clinician"
                className="w-full h-full object-cover rounded-2xl opacity-90 brightness-95"
                style={{
                  maskImage: 'linear-gradient(to top, black 80%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to top, black 80%, transparent 100%)',
                }}
              />
            </div>
          </div>

          {/* Bottom Row content */}
          <div className="grid md:grid-cols-2 items-end gap-6 z-10 w-full mt-12 md:mt-0">
            <div className="max-w-md space-y-2">
              <h2 className="text-white text-xl md:text-2xl font-black leading-tight tracking-tight uppercase">
                Modern Care Scheduling
              </h2>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
                Effortless multi-portal medical consultations. Let patients check availability with temporary slot locks, get AI pre-visit insights, and receive direct clinical medication reminders.
              </p>
            </div>

            <div className="flex md:justify-end">
              <Link
                href={patientBookRoute}
                className="inline-flex items-center gap-3 px-6 py-4 bg-accentPink hover:bg-[#ebd5df] text-navyBg font-extrabold text-sm rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span>Book Consultation</span>
                <div className="w-6 h-6 rounded-full bg-navyBg text-white flex items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* 3. 4-Card Service Feature Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 z-10">
          {/* Card 1: Yellow */}
          <Link
            href={patientBookRoute}
            className="p-6 rounded-[28px] bg-accentYellow border border-amber-400/20 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] group"
          >
            <svg className="w-28 h-28 text-navyBg/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <path d="M12 18h.01" />
              <path d="M8 6h8" />
              <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>

            <div className="space-y-1">
              <h3 className="text-navyBg text-lg font-black leading-tight uppercase">Instant AI Triage</h3>
              <p className="text-amber-950 text-xs font-semibold">Pre-visit symptom parsing & diagnostic insights</p>
            </div>

            <div className="w-9 h-9 rounded-full bg-navyBg text-white flex items-center justify-center">
              <ArrowRight className="h-4.5 w-4.5" />
            </div>
          </Link>

          {/* Card 2: Green */}
          <Link
            href={patientBookRoute}
            className="p-6 rounded-[28px] bg-accentGreen border border-emerald-400/20 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] group"
          >
            <svg className="w-28 h-28 text-navyBg/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6" />
              <path d="M22 11h-6" />
            </svg>

            <div className="space-y-1">
              <h3 className="text-navyBg text-lg font-black leading-tight uppercase">Find Verified Doctors</h3>
              <p className="text-emerald-950 text-xs font-semibold">Real-time slots with 5-minute hold guarantees</p>
            </div>

            <div className="w-9 h-9 rounded-full bg-navyBg text-white flex items-center justify-center">
              <ArrowRight className="h-4.5 w-4.5" />
            </div>
          </Link>

          {/* Card 3: Pink */}
          <Link
            href={patientPortalRoute}
            className="p-6 rounded-[28px] bg-accentPink border border-rose-400/20 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] group"
          >
            <svg className="w-28 h-28 text-navyBg/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4.5 16.5L16.5 4.5a4.95 4.95 0 0 1 7 7L11.5 23.5a4.95 4.95 0 0 1-7-7z" />
              <path d="M8.5 12.5l7-7" />
            </svg>

            <div className="space-y-1">
              <h3 className="text-navyBg text-lg font-black leading-tight uppercase">Smart Medication Plans</h3>
              <p className="text-rose-950 text-xs font-semibold">Automated dosage schedules & daily alerts</p>
            </div>

            <div className="w-9 h-9 rounded-full bg-navyBg text-white flex items-center justify-center">
              <ArrowRight className="h-4.5 w-4.5" />
            </div>
          </Link>

          {/* Card 4: Sky Blue */}
          <Link
            href={doctorPortalRoute}
            className="p-6 rounded-[28px] bg-accentBlue border border-blue-400/20 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] group"
          >
            <svg className="w-28 h-28 text-navyBg/10 absolute -bottom-4 -right-4 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 2v20a3 3 0 0 0 6 0V2" />
              <path d="M7 2h10" />
              <path d="M9 6h6" />
              <path d="M9 11h6" />
              <path d="M9 16h6" />
            </svg>

            <div className="space-y-1">
              <h3 className="text-navyBg text-lg font-black leading-tight uppercase">Doctor Consultation Hub</h3>
              <p className="text-blue-950 text-xs font-semibold">Post-visit clinical translation & calendar sync</p>
            </div>

            <div className="w-9 h-9 rounded-full bg-navyBg text-white flex items-center justify-center">
              <ArrowRight className="h-4.5 w-4.5" />
            </div>
          </Link>
        </section>

        {/* 4. How It Works Info Row */}
        <section id="how-it-works" className="border-t border-slate-100 pt-8 pb-4 space-y-4">
          <h3 className="text-navyBg font-extrabold text-sm uppercase tracking-wider text-center">
            How HealthCare Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center text-xs text-slate-500">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-accentYellow text-navyBg font-black mx-auto flex items-center justify-center">1</div>
              <h4 className="font-bold text-navyBg">Select Doctor & Hold Slot</h4>
              <p>Pick a clinician. The booking engine locks the slot for 5-10 minutes preventing double booking.</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-accentGreen text-navyBg font-black mx-auto flex items-center justify-center">2</div>
              <h4 className="font-bold text-navyBg">Pre-Visit AI Summary</h4>
              <p>Share your symptoms. AI generates structured insights for the doctor before you arrive.</p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-accentPink text-navyBg font-black mx-auto flex items-center justify-center">3</div>
              <h4 className="font-bold text-navyBg">Clinical Translation</h4>
              <p>Receive plain-language follow-ups, daily medication alerts, and syncs directly to your calendar.</p>
            </div>
          </div>
        </section>

        {/* Footer info bar */}
        <footer className="w-full text-center border-t border-slate-100 pt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 z-10">
          <span>© 2026 HealthCare Clinic Systems Inc.</span>
          <span className="text-slate-400">
            Admin Portal Access: <code className="bg-slate-100 px-1 py-0.5 rounded text-navyBg">admin@healthcare.local / admin123</code>
          </span>
        </footer>

      </div>
    </div>
  );
}
