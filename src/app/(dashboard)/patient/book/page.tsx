'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar, Clock, Stethoscope, ArrowLeft, ArrowRight, ShieldCheck, HeartPulse } from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  email: string;
  doctorProfile: {
    id: string;
    specialization: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    slotDuration: number;
    leaveDays: string[];
  } | null;
}

interface Slot {
  time: string;
  dateTime: string;
}

export default function BookAppointmentPage() {
  const router = useRouter();

  // Booking Flow Steps
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [symptoms, setSymptoms] = useState('');

  // Lock Hold Settings
  const [isHolding, setIsHolding] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. Fetch doctors list
  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/doctors');
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  // 2. Fetch available slots when doctor and date are set
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;

    const fetchSlots = async () => {
      setSlotsLoading(true);
      setError(null);
      setSelectedSlot(null);
      try {
        const res = await fetch(`/api/slots?doctorId=${selectedDoctor.id}&date=${selectedDate}`);
        const data = await res.json();
        if (res.ok) {
          setSlots(data.slots || []);
        } else {
          setError(data.error || 'Failed to fetch slots');
        }
      } catch (err) {
        console.error(err);
        setError('Error calculating slots.');
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // 3. Timer Countdown Handler
  useEffect(() => {
    if (isHolding && secondsLeft > 0) {
      timerRef.current = setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isHolding && secondsLeft === 0) {
      setIsHolding(false);
      setSelectedSlot(null);
      setError('Your temporary slot hold has expired. Please choose a slot again.');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHolding, secondsLeft]);

  // 4. Action: Acquire temporary hold
  const handleAcquireHold = async (slot: Slot) => {
    setError(null);
    setIsLoading(true);
    try {
      // If there's an active hold already, release it first
      if (selectedSlot) {
        await releaseHold(selectedDoctor!.id, selectedSlot.dateTime);
      }

      const res = await fetch('/api/slots/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: selectedDoctor!.id, dateTime: slot.dateTime }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Conflict: Slot could not be reserved.');
      } else {
        setSelectedSlot(slot);
        setIsHolding(true);
        setSecondsLeft(data.ttl || 300);
        setStep(3); // Advance to symptom and confirmation step
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while reserving slot.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Action: Release hold
  const releaseHold = async (docId: string, dtISO: string) => {
    try {
      await fetch('/api/slots/hold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: docId, dateTime: dtISO }),
      });
    } catch (err) {
      console.error('Error releasing hold:', err);
    }
  };

  // 6. Action: Cancel checkout flow
  const handleBackToSlots = async () => {
    if (selectedSlot && selectedDoctor) {
      setIsLoading(true);
      await releaseHold(selectedDoctor.id, selectedSlot.dateTime);
      setIsHolding(false);
      setSelectedSlot(null);
      setIsLoading(false);
    }
    setStep(2);
  };

  // 7. Action: Confirm booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot || !symptoms.trim()) {
      setError('Please fill in your symptoms before booking.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/slots/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          dateTime: selectedSlot.dateTime,
          symptoms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to complete transaction.');
      } else {
        setSuccess('Appointment confirmed successfully! Redirecting...');
        setIsHolding(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        setTimeout(() => {
          router.push('/patient');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during booking checkouts.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper formatting for countdown
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/patient')} className="h-8 rounded-full border-slate-200 hover:bg-slate-50 text-slate-600">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-black text-navyBg tracking-tight uppercase">Book Appointment</h1>
        <p className="text-slate-500 font-medium">Search clinician calendars and secure dynamic consultation blocks.</p>
      </div>

      {error && (
        <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">
          {success}
        </div>
      )}

      {/* STEP 1: CHOOSE DOCTOR */}
      {step === 1 && (
        <Card className="rounded-[28px] border-slate-100 shadow-md p-2 bg-white">
          <CardHeader>
            <CardTitle className="text-navyBg font-extrabold uppercase tracking-tight text-lg">Step 1: Choose Medical Specialist</CardTitle>
            <CardDescription className="font-medium text-slate-400">Select an onboarded clinician to view schedules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-center text-slate-400 py-6 font-semibold">Loading doctor listings...</p>
            ) : doctors.length === 0 ? (
              <p className="text-center text-slate-400 py-6 italic">No doctor profiles are available at this clinic yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {doctors.map((doc, idx) => {
                  const colors = ['bg-accentYellow/20 border-accentYellow', 'bg-accentGreen/20 border-accentGreen', 'bg-accentPink/20 border-accentPink', 'bg-accentBlue/20 border-accentBlue'];
                  const colorClass = colors[idx % colors.length];
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setStep(2);
                      }}
                      className={`p-5 border rounded-[22px] hover:-translate-y-0.5 hover:shadow-md transition-all text-left flex items-start gap-3 w-full bg-[#FDFBFE]`}
                    >
                      <div className="h-10 w-10 rounded-full bg-navyBg flex items-center justify-center font-bold text-accentPink shrink-0 text-xs">
                        DR
                      </div>
                      <div>
                        <h4 className="font-extrabold text-navyBg leading-tight">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mb-2">{doc.email}</p>
                        <span className="px-2.5 py-1 rounded-full bg-accentBlue/40 text-navyBg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit">
                          <Stethoscope className="h-3.5 w-3.5" />
                          {doc.doctorProfile?.specialization}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 2: CHOOSE DATE & TIME SLOT */}
      {step === 2 && selectedDoctor && (
        <Card className="rounded-[28px] border-slate-100 shadow-md p-2 bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <div>
              <CardTitle className="text-navyBg font-extrabold uppercase tracking-tight text-lg">Step 2: Select Date & Time</CardTitle>
              <CardDescription className="font-medium text-slate-400">
                Schedule with <strong className="text-navyBg font-bold">{selectedDoctor.name}</strong> ({selectedDoctor.doctorProfile?.specialization})
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8 rounded-full hover:bg-slate-50 text-navyBg font-extrabold text-xs">
              Change Doctor
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-xs space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Choose Appointment Date</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-full border-slate-200 text-xs font-semibold px-4"
              />
            </div>

            {selectedDate && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-xs font-bold text-navyBg uppercase flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accentPink fill-accentPink" /> Available Shift Slots
                </h4>

                {slotsLoading ? (
                  <p className="text-xs text-slate-400 font-bold italic animate-pulse">Calculating availability...</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-100 italic font-semibold">
                    No available time slots found on this date. The doctor may be on leave or fully booked.
                  </p>
                ) : (
                  <div className="grid gap-2 grid-cols-3 sm:grid-cols-5">
                    {slots.map((slot) => (
                      <Button
                        key={slot.dateTime}
                        variant="outline"
                        onClick={() => handleAcquireHold(slot)}
                        className="text-xs py-2 rounded-full border-slate-200 hover:border-navyBg hover:bg-navyBg hover:text-white transition font-bold"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: SYMPTOMS & CONFIRMATION */}
      {step === 3 && selectedDoctor && selectedSlot && (
        <Card className="rounded-[28px] border-slate-100 shadow-md p-2 bg-white">
          <CardHeader className="bg-slate-50/50 rounded-t-[24px] border-b pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-navyBg font-extrabold uppercase tracking-tight text-lg">Step 3: Patient Intake & Checkout</CardTitle>
                <CardDescription className="font-medium text-slate-400">Re-verify appointment parameters and outline symptoms.</CardDescription>
              </div>
              {isHolding && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accentYellow text-navyBg text-xs font-black border border-amber-400/30 shadow-sm shrink-0">
                  <Clock className="h-3.5 w-3.5 animate-pulse" />
                  Hold: {formatTime(secondsLeft)}
                </div>
              )}
            </div>
          </CardHeader>
          <form onSubmit={handleConfirmBooking}>
            <CardContent className="space-y-6 pt-5">
              <div className="p-4 bg-slate-50/80 border rounded-2xl space-y-2 text-xs text-slate-600 font-semibold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  <span className="font-black text-navyBg uppercase">Lock Hold Confirmed</span>
                </div>
                <div>
                  <span className="text-slate-400">Doctor:</span> {selectedDoctor.name} ({selectedDoctor.doctorProfile?.specialization})
                </div>
                <div>
                  <span className="text-slate-400">Scheduled Time:</span> {new Date(selectedSlot.dateTime).toLocaleDateString()} at{' '}
                  {selectedSlot.time} (UTC)
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="symptoms">
                  Describe Symptoms & Reasons for Visit
                </label>
                <textarea
                  id="symptoms"
                  rows={4}
                  required
                  placeholder="E.g. experiencing chest congestion and light coughing since Tuesday night."
                  disabled={isLoading}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="flex w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-navyBg disabled:opacity-50"
                />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end border-t pt-4 bg-slate-50/30 rounded-b-[24px]">
              <Button type="button" variant="outline" onClick={handleBackToSlots} disabled={isLoading} className="rounded-full h-10 text-xs font-bold px-4 border-slate-300">
                Change Slot
              </Button>
              <Button type="submit" className="bg-navyBg hover:bg-navyBg/90 text-white font-bold rounded-full h-10 text-xs px-6" disabled={isLoading || !symptoms.trim()}>
                {isLoading ? 'Processing Transaction...' : 'Confirm Appointment'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
