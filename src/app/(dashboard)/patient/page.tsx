'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Calendar, Clock, Stethoscope, AlertTriangle, CheckCircle, XCircle, Plus, ArrowRight } from 'lucide-react';

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  symptoms: string | null;
  doctorProfile: {
    specialization: string;
    user: {
      name: string;
    };
  };
  aiSummary: {
    preVisitSummary: string;
    postVisitSummary: string;
  } | null;
  medicationSchedules: {
    id: string;
    medicationName: string;
    dosage: string;
    frequency: string;
  }[];
}

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        // Refresh local listings
        await fetchAppointments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOOKED':
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
            Scheduled
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
            <CheckCircle className="h-3 w-3" /> Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
            Cancelled
          </span>
        );
      case 'CANCELLED_BY_DOCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            <AlertTriangle className="h-3 w-3 animate-pulse" /> Doctor Cancelled
          </span>
        );
      case 'PENDING_RESCHEDULE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
            Rescheduling Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Navy Greeting Header Card */}
      <div className="bg-navyBg rounded-[28px] p-6 text-white relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-lg border border-navyBg/40">
        <div className="absolute top-0 right-4 text-[6rem] font-black text-white/5 uppercase select-none pointer-events-none select-none z-0">
          Care
        </div>
        <div className="z-10 space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-accentGreen text-emerald-950 text-[9px] font-black uppercase tracking-wider">
            Patient Portal
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight mt-1.5">Welcome back, {session?.user?.name}!</h1>
          <p className="text-slate-300 text-xs font-semibold">Track clinician calendars, locks slots, and manage recovery schedules.</p>
        </div>
      </div>

      {/* 3-Column Metrics Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Next Visit */}
        <div className="p-5 rounded-2xl bg-accentGreen/25 border border-accentGreen/15 flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Appointment Lock</span>
            <h3 className="text-navyBg text-md font-extrabold mt-1">Book New Consultation</h3>
            <p className="text-slate-500 text-[11px] font-semibold mt-1">Secure real-time slot holds with doctor schedules.</p>
          </div>
          <Link href="/patient/book" className="mt-3 inline-flex items-center justify-center rounded-full bg-navyBg text-white text-xs font-bold py-2 w-fit px-4 hover:opacity-95 transition">
            Book Slot <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        {/* Active Prescriptions */}
        <div className="p-5 rounded-2xl bg-accentPink/25 border border-accentPink/15 flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider">Daily Plans</span>
            <h3 className="text-navyBg text-md font-extrabold mt-1">Active Prescriptions</h3>
            <p className="text-slate-500 text-[11px] font-semibold mt-1">Verify clinical instructions & daily dosage times.</p>
          </div>
          <div className="text-xs font-extrabold text-navyBg uppercase tracking-wide mt-3 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping" />
            <span>Reminders Enabled</span>
          </div>
        </div>

        {/* Past Summaries */}
        <div className="p-5 rounded-2xl bg-accentBlue/25 border border-accentBlue/15 flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Clinical Summaries</span>
            <h3 className="text-navyBg text-md font-extrabold mt-1 font-black">AI Translated Notes</h3>
            <p className="text-slate-500 text-[11px] font-semibold mt-1">Review recovery plans parsed in plain English.</p>
          </div>
          <span className="text-[10px] text-blue-900 font-extrabold uppercase mt-3">Verified by Doctor</span>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-[28px] border-slate-100 shadow-md p-2 bg-white">
          <CardHeader>
            <CardTitle className="text-navyBg font-extrabold uppercase tracking-tight text-lg">My Consultation Records</CardTitle>
            <CardDescription className="font-medium text-slate-400">All scheduled visits, AI summaries, and medication tracking.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-center text-slate-400 font-bold py-6 animate-pulse">Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <div className="text-center text-slate-400 py-12 border border-dashed rounded-[20px] bg-slate-50/50">
                <p className="italic font-semibold text-slate-500">You have no appointments booked.</p>
                <Link href="/patient/book" className="text-navyBg font-black hover:underline mt-2 inline-block text-xs uppercase tracking-wider bg-accentPink px-4 py-2 rounded-full border">
                  Schedule your first appointment
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => {
                  const date = new Date(appt.dateTime);
                  const isUpcoming = appt.status === 'BOOKED' || appt.status === 'SCHEDULED';
                  return (
                    <div
                      key={appt.id}
                      className="p-5 border rounded-[22px] hover:shadow-sm transition bg-white space-y-4 border-slate-100"
                    >
                      {/* Top status */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-navyBg flex items-center justify-center font-bold text-accentPink text-xs">
                            DR
                          </div>
                          <div>
                            <h4 className="font-extrabold text-navyBg leading-tight">{appt.doctorProfile.user.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Stethoscope className="h-3.5 w-3.5" /> {appt.doctorProfile.specialization}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(appt.status)}
                          {isUpcoming && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === appt.id}
                              onClick={() => handleCancel(appt.id)}
                              className="text-red-500 hover:bg-red-50 text-[10px] font-bold px-3 h-8 rounded-full border border-red-200"
                            >
                              {actionLoading === appt.id ? 'Cancelling...' : 'Cancel'}
                            </Button>
                          )}
                          {appt.status === 'COMPLETED' && (
                            <Link href={`/patient/appointments/${appt.id}`}>
                              <Button
                                size="sm"
                                className="bg-navyBg hover:bg-navyBg/90 text-white text-[10px] font-bold px-4 h-8 rounded-full"
                              >
                                View Care Plan
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Detail Body */}
                      <div className="grid gap-4 md:grid-cols-3 text-xs">
                        {/* Time */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</p>
                          <p className="flex items-center gap-2 font-semibold text-slate-700">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {date.toLocaleDateString()}
                          </p>
                          <p className="flex items-center gap-2 font-semibold text-slate-700">
                            <Clock className="h-4 w-4 text-slate-400" />
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (UTC)
                          </p>
                        </div>

                        {/* Symptoms */}
                        <div className="space-y-1 col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Symptoms Shared</p>
                          <p className="text-slate-600 italic font-semibold">
                            {appt.symptoms ? `"${appt.symptoms}"` : 'No symptoms provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Post-visit follow-up detail */}
                      {appt.aiSummary && appt.status === 'COMPLETED' && (
                        <div className="p-3 bg-accentBlue/10 border border-accentBlue/20 rounded-xl space-y-1 text-xs">
                          <p className="font-extrabold text-navyBg uppercase text-[10px] tracking-wide">Doctor Explanation Summary</p>
                          <p className="text-slate-600 font-semibold leading-relaxed">{appt.aiSummary.postVisitSummary}</p>
                        </div>
                      )}

                      {/* Cancelled impact notice */}
                      {appt.status === 'CANCELLED_BY_DOCTOR' && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold">
                          The doctor is unavailable due to leave schedule. You can reschedule this slot or contact clinic support.
                        </div>
                      )}
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
