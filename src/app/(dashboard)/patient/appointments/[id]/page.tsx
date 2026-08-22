import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Stethoscope, HeartPulse, CheckSquare, Pill, AlertTriangle, ArrowLeft } from 'lucide-react';

export const revalidate = 0;

export default async function PatientAppointmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    include: {
      doctorProfile: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      aiSummary: true,
      medicationSchedules: true,
    },
  });

  if (!appointment) {
    notFound();
  }

  const date = new Date(appointment.dateTime);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center">
        <Link href="/patient">
          <Button variant="ghost" size="sm" className="h-8 rounded-full border-slate-200 hover:bg-slate-50 text-slate-600">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navyBg uppercase tracking-tight">Clinical Checkup Follow-Up</h1>
          <p className="text-slate-500 font-medium">Detailed observations and recovery schedules.</p>
        </div>
        <div>
          {appointment.status === 'COMPLETED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accentGreen text-emerald-950 text-xs font-black border border-accentGreen/50">
              Completed Consultation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accentBlue text-blue-950 text-xs font-black border border-accentBlue/50">
              Upcoming Lock
            </span>
          )}
        </div>
      </div>

      {appointment.aiSummary?.isFallback && (
        <div className="p-4 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold uppercase">Generative Analysis Warning</p>
            <p className="font-semibold text-amber-700/90 mt-1">
              AI translation returned fallback defaults due to system response timeouts. Please consult clinic coordinates directly for confirmation on notes or medication dosage queries.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Col: Consult Details */}
        <div className="md:col-span-1 space-y-6">
          <Card className="rounded-[24px] border-slate-100 shadow-sm p-1 bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-extrabold text-navyBg uppercase flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-accentPink fill-accentPink" /> Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3 font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Clinician:</span>
                <span className="text-navyBg font-black text-sm block mt-0.5">{appointment.doctorProfile.user.name}</span>
                <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wide">{appointment.doctorProfile.specialization}</span>
              </div>
              <div className="border-t pt-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Consultation Date:</span>
                <span className="text-navyBg block mt-0.5">{date.toLocaleDateString()}</span>
              </div>
              <div className="border-t pt-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Consultation Time:</span>
                <span className="text-navyBg block mt-0.5">
                  {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (UTC)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-slate-100 shadow-sm p-1 bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-extrabold text-navyBg uppercase flex items-center gap-2">
                <HeartPulse className="h-4.5 w-4.5 text-rose-400" /> Intake Symptoms
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs font-semibold text-slate-600">
              <p className="text-slate-600 italic leading-relaxed">
                "{appointment.symptoms || 'No symptoms were specified.'}"
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Post Visit Plans */}
        <div className="md:col-span-2 space-y-6">
          {/* Friendly Summary */}
          <Card className="rounded-[28px] border-slate-100 shadow-sm p-2 bg-white">
            <CardHeader>
              <CardTitle className="text-navyBg font-extrabold uppercase text-md">Doctor Explanation (Plain English)</CardTitle>
              <CardDescription className="font-medium text-slate-400">A jargon-free breakdown of your diagnosis and the clinician's findings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed text-xs font-semibold">
                {appointment.aiSummary?.postVisitSummary || 'Observations pending. Your plan will be updated as soon as the doctor publishes notes.'}
              </p>
            </CardContent>
          </Card>

          {/* Lifestyle advice */}
          {appointment.aiSummary && appointment.aiSummary.lifestyleAdvice.length > 0 && (
            <Card className="rounded-[28px] border-slate-100 shadow-sm p-2 bg-white">
              <CardHeader>
                <CardTitle className="text-navyBg font-extrabold uppercase text-md flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-emerald-600" /> Recommended Recovery Advice
                </CardTitle>
                <CardDescription className="font-medium text-slate-400">Daily habits and recovery guidelines to speed up healing.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4 font-semibold">
                  {appointment.aiSummary.lifestyleAdvice.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Medications list */}
          <Card className="rounded-[28px] border-slate-100 shadow-sm p-2 bg-white">
            <CardHeader>
              <CardTitle className="text-navyBg font-extrabold uppercase text-md flex items-center gap-2">
                <Pill className="h-5 w-5 text-accentPink" /> Prescriptions & Medication Schedule
              </CardTitle>
              <CardDescription className="font-medium text-slate-400">Dosages and instructions. Please take medications precisely as directed.</CardDescription>
            </CardHeader>
            <CardContent>
              {appointment.medicationSchedules.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4 border rounded-xl border-dashed">
                  No active prescriptions logged for this consultation.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {appointment.medicationSchedules.map((med) => {
                    const start = new Date(med.startDate);
                    const end = new Date(med.endDate);
                    return (
                      <div key={med.id} className="p-4 border border-slate-100 rounded-2xl bg-accentPink/15 space-y-2.5">
                        <div>
                          <h4 className="font-black text-navyBg text-sm uppercase tracking-tight">{med.medicationName}</h4>
                          <span className="text-[10px] bg-white px-2 py-0.5 border rounded-full font-bold text-slate-500 inline-block mt-1">{med.dosage}</span>
                        </div>
                        <div className="text-[10px] space-y-1 text-slate-500 font-bold uppercase">
                          <div>
                            <span className="text-slate-400">Frequency:</span> {med.frequency}
                          </div>
                          <div>
                            <span className="text-slate-400">Course:</span> {start.toLocaleDateString()} to {end.toLocaleDateString()}
                          </div>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-rose-100 text-xs text-rose-800 font-semibold italic">
                          "{med.instructions}"
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
    </div>
  );
}
