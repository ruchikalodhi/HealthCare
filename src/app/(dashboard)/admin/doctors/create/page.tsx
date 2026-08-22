'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createDoctorSchema, CreateDoctorInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';

const customResolver = (schema: any) => async (values: any) => {
  try {
    const data = schema.parse(values);
    return { values: data, errors: {} };
  } catch (err: any) {
    const errors: any = {};
    if (err.errors) {
      err.errors.forEach((e: any) => {
        const path = e.path.join('.');
        errors[path] = { message: e.message, type: 'validation' };
      });
    }
    return { values: {}, errors };
  }
};

export default function CreateDoctorPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Leave days state managed alongside react-hook-form
  const [leaveDaysList, setLeaveDaysList] = useState<string[]>([]);
  const [newLeaveDate, setNewLeaveDate] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateDoctorInput>({
    resolver: customResolver(createDoctorSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      specialization: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      slotDuration: 30,
      leaveDays: [],
    },
  });

  const handleAddLeaveDay = () => {
    if (!newLeaveDate) return;
    if (leaveDaysList.includes(newLeaveDate)) {
      setNewLeaveDate('');
      return;
    }
    const updated = [...leaveDaysList, newLeaveDate].sort();
    setLeaveDaysList(updated);
    setValue('leaveDays', updated);
    setNewLeaveDate('');
  };

  const handleRemoveLeaveDay = (dateToRemove: string) => {
    const updated = leaveDaysList.filter((d) => d !== dateToRemove);
    setLeaveDaysList(updated);
    setValue('leaveDays', updated);
  };

  const onSubmit = async (data: CreateDoctorInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Failed to onboard doctor. Please try again.');
        setIsLoading(false);
      } else {
        setSuccess('Doctor onboarded and profile configured successfully!');
        setTimeout(() => {
          router.push('/admin/doctors');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please check network logs.');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-navyBg uppercase tracking-tight">Onboard Doctor</h1>
        <p className="text-slate-500 font-medium">Create login credentials and configure the clinical scheduling profile.</p>
      </div>

      <Card className="rounded-[28px] border-slate-100 shadow-md p-2 bg-white">
        <CardHeader>
          <CardTitle className="text-navyBg font-extrabold uppercase text-sm">Doctor Information & Settings</CardTitle>
          <CardDescription className="font-semibold text-slate-400">Onboarding details will immediately grant portal access to the doctor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">
                {success}
              </div>
            )}

            {/* General Info */}
            <div className="grid gap-4 md:grid-cols-2 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="name">
                  Full Name (e.g. Dr. Jane Smith)
                </label>
                <Input
                  id="name"
                  placeholder="Dr. Jane Smith"
                  disabled={isLoading}
                  className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="specialization">
                  Specialization
                </label>
                <Input
                  id="specialization"
                  placeholder="Cardiology, Dermatology..."
                  disabled={isLoading}
                  className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                  {...register('specialization')}
                />
                {errors.specialization && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.specialization.message}</p>
                )}
              </div>
            </div>

            {/* Credentials */}
            <div className="grid gap-4 md:grid-cols-2 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="email">
                  Onboarding Email (Username)
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="doctor@healthalign.com"
                  disabled={isLoading}
                  className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="password">
                  Initial Login Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Schedule Settings */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-extrabold text-navyBg text-xs uppercase">Clinical Working Hours & Slots</h3>

              <div className="grid gap-4 md:grid-cols-3 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="workingHoursStart">
                    Shift Start (HH:MM)
                  </label>
                  <Input
                    id="workingHoursStart"
                    placeholder="09:00"
                    disabled={isLoading}
                    className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                    {...register('workingHoursStart')}
                  />
                  {errors.workingHoursStart && (
                    <p className="text-[10px] text-red-600 font-semibold">{errors.workingHoursStart.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="workingHoursEnd">
                    Shift End (HH:MM)
                  </label>
                  <Input
                    id="workingHoursEnd"
                    placeholder="17:00"
                    disabled={isLoading}
                    className="rounded-full border-slate-200 px-4 h-10 text-xs font-semibold"
                    {...register('workingHoursEnd')}
                  />
                  {errors.workingHoursEnd && (
                    <p className="text-[10px] text-red-600 font-semibold">{errors.workingHoursEnd.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase" htmlFor="slotDuration">
                    Slot Duration
                  </label>
                  <select
                    id="slotDuration"
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-full border border-slate-200 bg-white px-4 py-1 text-xs shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-navyBg font-semibold text-slate-600"
                    {...register('slotDuration')}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="30">30 Minutes</option>
                    <option value="45">45 Minutes</option>
                    <option value="60">60 Minutes</option>
                  </select>
                  {errors.slotDuration && (
                    <p className="text-[10px] text-red-600 font-semibold">{errors.slotDuration.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Leave Days */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-extrabold text-navyBg text-xs uppercase">Configure Leave Days (Unavailable Dates)</h3>

              <div className="flex gap-2 max-w-md">
                <Input
                  type="date"
                  disabled={isLoading}
                  value={newLeaveDate}
                  onChange={(e) => setNewLeaveDate(e.target.value)}
                  className="rounded-full border-slate-200 px-4 text-xs h-10 font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleAddLeaveDay}
                  className="flex items-center gap-1.5 shrink-0 rounded-full h-10 border-slate-200 hover:bg-slate-50 font-bold text-xs px-4"
                >
                  <Plus className="h-4 w-4" /> Add Date
                </Button>
              </div>

              {leaveDaysList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {leaveDaysList.map((date) => (
                    <span
                      key={date}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accentPink/20 border border-accentPink/35 text-navyBg text-xs font-bold"
                    >
                      {date}
                      <button
                        type="button"
                        onClick={() => handleRemoveLeaveDay(date)}
                        className="text-rose-500 hover:text-rose-700 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic font-semibold">No leave dates configured for this doctor profile yet.</p>
              )}
            </div>

            {/* Submit */}
            <div className="border-t pt-4 flex gap-2 justify-end rounded-b-[24px]">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => router.push('/admin/doctors')}
                className="rounded-full text-xs font-bold border-slate-300 h-10 px-4"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-navyBg hover:bg-navyBg/90 text-white rounded-full text-xs font-bold px-6 h-10">
                {isLoading ? 'Creating profile...' : 'Save & Onboard'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
