import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, Heart, MessageSquare, AlertCircle } from 'lucide-react';
import { AppointmentStatus } from '@prisma/client';

export const revalidate = 0; // Disable static routing optimization to display real-time consultations

export default async function DoctorDashboard() {
  const session = await getServerSession(authOptions);

  // Load the doctor profile
  const doc = await prisma.user.findUnique({
    where: { id: session?.user?.id },
    include: { doctorProfile: true },
  });

  // Query upcoming booked sessions
  let appointments: any[] = [];
  if (doc?.doctorProfile) {
    appointments = await prisma.appointment.findMany({
      where: {
        doctorProfileId: doc.doctorProfile.id,
        status: {
          in: ['BOOKED', 'SCHEDULED'],
        },
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        aiSummary: true,
      },
      orderBy: {
        dateTime: 'asc', // Soonest first
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Navy Greeting Header Card */}
      <div className="bg-navyBg rounded-[28px] p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-lg border border-navyBg/40">
        <div className="absolute top-0 right-4 text-[6rem] font-black text-white/5 uppercase select-none pointer-events-none select-none z-0">
          MD
        </div>
        <div className="z-10 space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-accentBlue text-blue-950 text-[9px] font-black uppercase tracking-wider">
            Clinician Console
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight mt-1.5">Welcome back, {doc?.name}!</h1>
          <p className="text-slate-300 text-xs font-semibold">Monitor daily consult schedules, check patient records, and read AI symptom summaries.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1 h-fit rounded-[24px] border-slate-100 shadow-sm p-1 bg-white">
          <CardHeader>
            <CardTitle className="text-navyBg font-extrabold uppercase text-sm">My Medical Profile</CardTitle>
            <CardDescription className="font-semibold text-slate-400">Verified clinician settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs font-semibold text-slate-600">
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">Doctor Name:</span>
              <span className="text-navyBg font-black">{doc?.name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">Email:</span>
              <span className="text-navyBg font-bold">{doc?.email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">Specialization:</span>
              <span className="text-navyBg font-extrabold flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-full bg-accentBlue/30 text-navyBg text-[10px] uppercase font-bold">{doc?.doctorProfile?.specialization}</span>
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">Shift Hours:</span>
              <span className="text-navyBg">
                {doc?.doctorProfile?.workingHoursStart} - {doc?.doctorProfile?.workingHoursEnd} (UTC)
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-slate-400">Slot Duration:</span>
              <span className="text-navyBg">{doc?.doctorProfile?.slotDuration} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Leave Days:</span>
              <span className="text-rose-600 font-extrabold">
                {doc?.doctorProfile?.leaveDays.length === 0
                  ? 'None Active'
                  : `${doc?.doctorProfile?.leaveDays.length} active dates`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Timeline */}
        <Card className="lg:col-span-2 rounded-[28px] border-slate-100 shadow-sm p-2 bg-white">
          <CardHeader>
            <CardTitle className="text-navyBg font-extrabold uppercase text-sm">Consultations Timeline</CardTitle>
            <CardDescription className="font-semibold text-slate-400">Upcoming booked sessions and patient-submitted symptoms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.length === 0 ? (
              <div className="text-center text-slate-400 py-12 border border-dashed rounded-[20px] bg-slate-50/50">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="italic font-bold">No upcoming consultations are scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => {
                  const date = new Date(appt.dateTime);
                  return (
                    <div
                      key={appt.id}
                      className="p-5 border rounded-[22px] hover:shadow-sm transition bg-white space-y-4 border-slate-100"
                    >
                      {/* Patient metadata header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-3 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="h-4.5 w-4.5 text-slate-400" />
                          <div>
                            <span className="font-extrabold text-navyBg">{appt.patient.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-medium">({appt.patient.email})</span>
                          </div>
                          {appt.aiSummary?.urgency && (
                            <div className="ml-2">
                              {appt.aiSummary.urgency === 'EMERGENCY' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider animate-pulse border border-red-200">Emergency</span>
                              )}
                              {appt.aiSummary.urgency === 'URGENT' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-accentYellow text-yellow-900 text-[9px] font-black uppercase tracking-wider border border-amber-300">Urgent</span>
                              )}
                              {appt.aiSummary.urgency === 'ROUTINE' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-accentGreen text-emerald-900 text-[9px] font-black uppercase tracking-wider border border-emerald-300">Routine</span>
                              )}
                              {appt.aiSummary.urgency === 'PENDING_REVIEW' && (
                                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">Pending Review</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 font-semibold text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {date.toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (UTC)
                          </span>
                          <a
                            href={`/doctor/appointments/${appt.id}`}
                            className="inline-flex items-center justify-center rounded-full bg-navyBg px-4 py-2 text-[10px] font-black text-white hover:bg-navyBg/90 shadow transition-all hover:scale-105 active:scale-95"
                          >
                            Open Clinic
                          </a>
                        </div>
                      </div>

                      {/* Symptoms & AI summaries */}
                      <div className="space-y-3 text-xs font-semibold text-slate-600">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">
                            Patient Note (Intake)
                          </span>
                          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic mt-1 font-medium">
                            "{appt.symptoms || 'No descriptions provided.'}"
                          </p>
                        </div>

                        {appt.aiSummary && (
                          <div className="p-3.5 bg-accentBlue/10 border border-accentBlue/20 rounded-xl space-y-1">
                            <div className="flex items-center gap-1 font-black text-navyBg uppercase text-[10px] tracking-wide">
                              <Heart className="h-3.5 w-3.5 fill-accentPink text-accentPink" />
                              <span>AI Symptom Intake Analysis</span>
                            </div>
                            <p className="text-slate-600 leading-relaxed font-semibold">{appt.aiSummary.preVisitSummary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
