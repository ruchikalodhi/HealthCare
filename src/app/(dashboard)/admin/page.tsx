import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, PlusCircle, ShieldAlert } from 'lucide-react';

export const revalidate = 0; // Disable caching to ensure fresh numbers on dashboard reload

export default async function AdminDashboardOverview() {
  const doctorsCount = await prisma.user.count({
    where: { role: Role.DOCTOR },
  });

  const patientsCount = await prisma.user.count({
    where: { role: Role.PATIENT },
  });

  const appointmentsCount = await prisma.appointment.count();

  return (
    <div className="space-y-6">
      {/* Navy Greeting Header Card */}
      <div className="bg-navyBg rounded-[28px] p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-lg border border-navyBg/40">
        <div className="absolute top-0 right-4 text-[6rem] font-black text-white/5 uppercase select-none pointer-events-none select-none z-0">
          Admin
        </div>
        <div className="z-10 space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-accentYellow text-yellow-950 text-[9px] font-black uppercase tracking-wider">
            General Console
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight mt-1.5">Overview</h1>
          <p className="text-slate-300 text-xs font-semibold">Welcome to the clinic management dashboard.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Doctors Card */}
        <div className="p-6 rounded-[24px] bg-accentYellow/25 border border-accentYellow/15 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-yellow-800 uppercase tracking-wider">Onboarded Doctors</span>
            <Users className="h-4.5 w-4.5 text-navyBg/60" />
          </div>
          <div>
            <div className="text-3xl font-black text-navyBg mt-1">{doctorsCount}</div>
            <p className="text-[11px] text-slate-500 font-semibold">Active medical profiles</p>
          </div>
        </div>

        {/* Patients Card */}
        <div className="p-6 rounded-[24px] bg-accentGreen/25 border border-accentGreen/15 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Registered Patients</span>
            <Users className="h-4.5 w-4.5 text-navyBg/60" />
          </div>
          <div>
            <div className="text-3xl font-black text-navyBg mt-1">{patientsCount}</div>
            <p className="text-[11px] text-slate-500 font-semibold">Secure patient accounts</p>
          </div>
        </div>

        {/* Bookings Card */}
        <div className="p-6 rounded-[24px] bg-accentPink/25 border border-accentPink/15 flex flex-col justify-between min-h-[135px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Total Booked Visits</span>
            <Calendar className="h-4.5 w-4.5 text-navyBg/60" />
          </div>
          <div>
            <div className="text-3xl font-black text-navyBg mt-1">{appointmentsCount}</div>
            <p className="text-[11px] text-slate-500 font-semibold">Scheduled appointments in system</p>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 space-y-4 rounded-[28px] border-slate-100 shadow-sm bg-white">
          <h2 className="text-md font-extrabold text-navyBg uppercase">Quick Actions</h2>
          <div className="grid gap-3">
            <Link
              href="/admin/doctors/create"
              className="flex items-center gap-3 px-4 py-3.5 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-accentPink/15 hover:border-accentPink/30 hover:-translate-y-0.5 hover:shadow-sm text-navyBg font-extrabold text-xs transition-all duration-200"
            >
              <PlusCircle className="h-4.5 w-4.5 text-rose-400" />
              <span>Onboard a New Doctor Account</span>
            </Link>
            <Link
              href="/admin/doctors"
              className="flex items-center gap-3 px-4 py-3.5 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-accentPink/15 hover:border-accentPink/30 hover:-translate-y-0.5 hover:shadow-sm text-navyBg font-extrabold text-xs transition-all duration-200"
            >
              <Users className="h-4.5 w-4.5 text-rose-400" />
              <span>Configure Doctor Leave / Working Hours</span>
            </Link>
          </div>
        </Card>

        <Card className="p-6 space-y-4 rounded-[28px] border-slate-100 shadow-sm bg-white">
          <h2 className="text-md font-extrabold text-navyBg uppercase">System Logs & Integrity</h2>
          <div className="space-y-2.5 text-xs text-slate-600 font-semibold leading-relaxed">
            <div className="flex items-center gap-2 text-rose-500 font-black uppercase text-[10px]">
              <ShieldAlert className="h-4 w-4" />
              <span>Security Guard Activated</span>
            </div>
            <p>
              NextAuth session tokens are integrated with strict middleware gates. Unauthorized traffic to `/admin`, `/doctor`, and `/patient` directories is automatically blocked and redirected.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
