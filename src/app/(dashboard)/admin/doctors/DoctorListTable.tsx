'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { updateDoctorProfileSchema, UpdateDoctorProfileInput } from '@/lib/validations';
import { Calendar, Clock, Stethoscope, Trash, Edit, X, Plus } from 'lucide-react';

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

export default function DoctorListTable({ initialDoctors }: { initialDoctors: Doctor[] }) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [specialization, setSpecialization] = useState('');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [leaveDays, setLeaveDays] = useState<string[]>([]);
  const [newLeaveDate, setNewLeaveDate] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const startEditing = (doc: Doctor) => {
    setEditingDoctor(doc);
    setSpecialization(doc.doctorProfile?.specialization || '');
    setWorkingHoursStart(doc.doctorProfile?.workingHoursStart || '09:00');
    setWorkingHoursEnd(doc.doctorProfile?.workingHoursEnd || '17:00');
    setSlotDuration(doc.doctorProfile?.slotDuration || 30);
    setLeaveDays(doc.doctorProfile?.leaveDays || []);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingDoctor(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddLeaveDay = () => {
    if (!newLeaveDate) return;
    if (leaveDays.includes(newLeaveDate)) {
      setNewLeaveDate('');
      return;
    }
    setLeaveDays([...leaveDays, newLeaveDate].sort());
    setNewLeaveDate('');
  };

  const handleRemoveLeaveDay = (dateToRemove: string) => {
    setLeaveDays(leaveDays.filter((d) => d !== dateToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const payload: UpdateDoctorProfileInput = {
      specialization,
      workingHoursStart,
      workingHoursEnd,
      slotDuration,
      leaveDays,
    };

    // Zod client validation check
    const validation = updateDoctorProfileSchema.safeParse(payload);
    if (!validation.success) {
      let msg = 'Validation error: ';
      validation.error.errors.forEach((err) => {
        msg += `${err.path.join('.')}: ${err.message}. `;
      });
      setError(msg);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/doctors/${editingDoctor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update doctor profile');
      } else {
        let msg = 'Profile updated successfully!';
        if (data.cancelledCount > 0) {
          msg += ` WARNING: ${data.cancelledCount} conflicting appointment(s) cancelled due to new leave dates.`;
        }
        setSuccess(msg);
        // Update local doctors state
        setDoctors(
          doctors.map((d) => (d.id === editingDoctor.id ? { ...d, doctorProfile: data.doctor.doctorProfile } : d))
        );
        setTimeout(() => {
          setEditingDoctor(null);
        }, 1000);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during updating.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {editingDoctor && (
        <Card className="rounded-[28px] border-slate-100 bg-white p-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <div>
              <CardTitle className="text-navyBg font-extrabold uppercase text-sm">Edit Clinical Profile: {editingDoctor.name}</CardTitle>
              <CardDescription className="font-semibold text-slate-400">Configure working schedule and leaves below.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={cancelEditing} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4 text-slate-400" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {error && <div className="p-3 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</div>}
              {success && (
                <div className="p-3 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">{success}</div>
              )}

              <div className="grid gap-4 md:grid-cols-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Specialization</label>
                  <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} required className="rounded-full border-slate-200 px-4 h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Start Hours (24h HH:MM)</label>
                  <Input value={workingHoursStart} onChange={(e) => setWorkingHoursStart(e.target.value)} required className="rounded-full border-slate-200 px-4 h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">End Hours (24h HH:MM)</label>
                  <Input value={workingHoursEnd} onChange={(e) => setWorkingHoursEnd(e.target.value)} required className="rounded-full border-slate-200 px-4 h-10" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Slot Duration</label>
                  <select
                    className="flex h-10 w-full rounded-full border border-slate-200 bg-white px-4 py-1 text-xs shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-navyBg font-semibold text-slate-600"
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                  >
                    <option value="15">15 Mins</option>
                    <option value="30">30 Mins</option>
                    <option value="45">45 Mins</option>
                    <option value="60">60 Mins</option>
                  </select>
                </div>
              </div>

              {/* Leave days panel */}
              <div className="space-y-2 border-t pt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Manage Leave Days</label>
                <div className="flex gap-2 max-w-xs">
                  <Input type="date" value={newLeaveDate} onChange={(e) => setNewLeaveDate(e.target.value)} className="rounded-full border-slate-200 px-4 text-xs h-10" />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddLeaveDay} className="h-10 rounded-full border-slate-200 px-4 text-xs font-bold hover:bg-slate-50">
                    <Plus className="h-4 w-4 mr-1 text-slate-500" /> Add
                  </Button>
                </div>
                {leaveDays.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {leaveDays.map((date) => (
                      <span
                        key={date}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accentPink/20 border border-accentPink/35 text-navyBg text-xs font-bold"
                      >
                        {date}
                        <button type="button" onClick={() => handleRemoveLeaveDay(date)} className="text-rose-500 hover:text-rose-700">
                          <X className="h-3 w-3 ml-1" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-semibold">No leaves scheduled.</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={cancelEditing} disabled={isLoading} className="rounded-full px-5 h-9 text-xs font-bold border-slate-300">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-navyBg hover:bg-navyBg/90 text-white rounded-full px-6 h-9 text-xs font-bold" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[28px] border-slate-100 shadow-sm bg-white p-2 overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500">
              <thead className="text-[10px] text-navyBg uppercase bg-slate-50 border-b border-slate-100 font-bold tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">Doctor Name</th>
                  <th scope="col" className="px-6 py-4">Specialization</th>
                  <th scope="col" className="px-6 py-4">Hours Shift</th>
                  <th scope="col" className="px-6 py-4">Slot Duration</th>
                  <th scope="col" className="px-6 py-4">Scheduled Leaves</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic font-bold">
                      No doctor accounts onboarded yet.
                    </td>
                  </tr>
                ) : (
                  doctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 bg-white transition font-semibold text-slate-600">
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-navyBg text-sm">{doc.name}</div>
                        <div className="text-[10px] font-semibold text-slate-400">{doc.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 text-xs">
                          <Stethoscope className="h-3.5 w-3.5 text-rose-400" />
                          {doc.doctorProfile?.specialization || 'Not configured'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-700 text-xs">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {doc.doctorProfile
                            ? `${doc.doctorProfile.workingHoursStart} - ${doc.doctorProfile.workingHoursEnd}`
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {doc.doctorProfile ? `${doc.doctorProfile.slotDuration} mins` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        {doc.doctorProfile && doc.doctorProfile.leaveDays.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accentYellow text-yellow-900 border border-amber-300 text-[10px] font-black uppercase">
                            <Calendar className="h-3.5 w-3.5" />
                            {doc.doctorProfile.leaveDays.length} leaves
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 uppercase">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] font-bold h-8 px-4 rounded-full border-slate-200 hover:bg-slate-50 text-slate-700"
                          onClick={() => startEditing(doc)}
                        >
                          Configure
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
