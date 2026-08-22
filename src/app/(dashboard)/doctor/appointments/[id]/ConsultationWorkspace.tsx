'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar, Clock, User, HeartPulse, Plus, Trash, Check, AlertCircle } from 'lucide-react';

interface MedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  symptoms: string | null;
  patient: {
    name: string;
    email: string;
  };
  aiSummary: {
    urgency: string;
    chiefComplaint: string;
    suggestedQuestions: string[];
    preVisitSummary: string;
    postVisitSummary: string;
    isFallback: boolean;
  } | null;
}

export default function ConsultationWorkspace({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const [clinicalNotes, setClinicalNotes] = useState('');
  
  // Medications state
  const [meds, setMeds] = useState<MedicationInput[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedDuration, setNewMedDuration] = useState(7);
  const [newMedInstructions, setNewMedInstructions] = useState('');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any | null>(null);

  const handleAddMedication = () => {
    if (!newMedName.trim() || !newMedDosage.trim() || !newMedFreq.trim()) return;
    
    const newMed: MedicationInput = {
      name: newMedName,
      dosage: newMedDosage,
      frequency: newMedFreq,
      durationDays: Number(newMedDuration),
      instructions: newMedInstructions || 'Take as directed.',
    };

    setMeds([...meds, newMed]);
    
    // Clear inputs
    setNewMedName('');
    setNewMedDosage('');
    setNewMedFreq('');
    setNewMedDuration(7);
    setNewMedInstructions('');
  };

  const handleRemoveMedication = (index: number) => {
    setMeds(meds.filter((_, i) => i !== index));
  };

  // Triggers clinical note parsing and AI translation
  const handleAIParse = async () => {
    if (!clinicalNotes.trim()) {
      setError('Please type clinical notes first.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/appointments/${appointment.id}/post-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicalNotes: `${clinicalNotes}. Prescribed: ${meds.map(m => `${m.name} ${m.dosage} ${m.frequency} for ${m.durationDays} days. Instruction: ${m.instructions}`).join(', ')}`
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'AI summary translation failed.');
      } else {
        setAiResult(data);
        setSuccess(
          data.aiStatus === 'FALLBACK' 
            ? 'Consultation saved! AI returned default fallback summary.' 
            : 'Consultation successfully processed and summarized by AI!'
        );
        setTimeout(() => {
          router.push('/doctor');
          router.refresh();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during AI processing.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-navyBg uppercase tracking-tight">Consultation Workspace</h1>
          <p className="text-slate-500 font-medium">Intake evaluation, clinical editor, and medication manager.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/doctor')} className="rounded-full border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs">
          Exit Workspace
        </Button>
      </div>

      {error && <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</div>}
      {success && <div className="p-3 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl">{success}</div>}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: Intake Review */}
        <div className="md:col-span-1 space-y-6">
          <Card className="rounded-[24px] border-slate-100 shadow-sm p-1 bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xs font-extrabold text-navyBg uppercase flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-slate-400" /> Patient Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-2 font-semibold text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Name:</span>
                <span className="text-navyBg font-black block mt-0.5">{appointment.patient.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Email:</span>
                <span className="text-navyBg block mt-0.5">{appointment.patient.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Date/Time:</span>
                <span className="text-navyBg block mt-0.5">
                  {new Date(appointment.dateTime).toLocaleDateString()} at{' '}
                  {new Date(appointment.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (UTC)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI pre-visit insights */}
          <Card className="rounded-[24px] border-slate-100 shadow-sm p-1 bg-white">
            <CardHeader className="pb-3 border-b bg-accentBlue/10 rounded-t-[20px]">
              <CardTitle className="text-xs font-extrabold text-navyBg uppercase flex items-center gap-1.5">
                <HeartPulse className="h-4.5 w-4.5 text-rose-400 fill-rose-400" /> Pre-Visit Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs font-semibold text-slate-600">
              {appointment.aiSummary ? (
                <>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">AI Urgency</span>
                    <span className="mt-1 inline-block">
                      {appointment.aiSummary.urgency === 'EMERGENCY' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider animate-pulse border border-red-200">Emergency</span>
                      )}
                      {appointment.aiSummary.urgency === 'URGENT' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-accentYellow text-yellow-900 text-[9px] font-black uppercase tracking-wider border border-amber-300">Urgent</span>
                      )}
                      {appointment.aiSummary.urgency === 'ROUTINE' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-accentGreen text-emerald-900 text-[9px] font-black uppercase tracking-wider border border-emerald-300">Routine</span>
                      )}
                      {appointment.aiSummary.urgency === 'PENDING_REVIEW' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider">Pending Review</span>
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Chief Complaint</span>
                    <p className="text-slate-700 italic mt-1 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{appointment.aiSummary.chiefComplaint}"
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wide">Suggested Diagnostics Questions</span>
                    <ul className="list-disc pl-4 mt-1.5 space-y-1 text-slate-500 font-bold">
                      {appointment.aiSummary.suggestedQuestions.map((q, idx) => (
                        <li key={idx} className="leading-relaxed">{q}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 italic">No pre-visit AI insights available. Summarizer has not run.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Clinical Note Editor */}
        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-[28px] border-slate-100 shadow-sm p-2 bg-white">
            <CardHeader>
              <CardTitle className="text-navyBg font-extrabold uppercase text-sm">Consultation Notes & Prescriptions</CardTitle>
              <CardDescription className="font-semibold text-slate-400">Enter clinical findings and structure medication directives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Clinical Findings & Diagnosis</label>
                <textarea
                  rows={6}
                  required
                  placeholder="E.g., Patient presented with mild throat inflammation. Clear breath sounds. Diagnosed with viral pharyngitis. Instructed plenty of warm fluids."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  className="flex w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-navyBg"
                />
              </div>

              {/* Prescription Manager */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-extrabold text-navyBg uppercase">Prescription Manager</h4>

                <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                    <Input placeholder="Aspirin" value={newMedName} onChange={(e) => setNewMedName(e.target.value)} className="rounded-full border-slate-200 text-xs font-semibold px-4" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Dosage</label>
                    <Input placeholder="81mg" value={newMedDosage} onChange={(e) => setNewMedDosage(e.target.value)} className="rounded-full border-slate-200 text-xs font-semibold px-4" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Frequency</label>
                    <Input placeholder="Once daily" value={newMedFreq} onChange={(e) => setNewMedFreq(e.target.value)} className="rounded-full border-slate-200 text-xs font-semibold px-4" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Duration (Days)</label>
                    <Input type="number" min={1} value={newMedDuration} onChange={(e) => setNewMedDuration(Number(e.target.value))} className="rounded-full border-slate-200 text-xs font-semibold px-4" />
                  </div>
                  <div className="space-y-1 sm:col-span-1 flex items-end">
                    <Button type="button" variant="outline" onClick={handleAddMedication} className="w-full rounded-full h-10 border-slate-200 hover:bg-slate-50 text-xs font-bold">
                      <Plus className="h-4 w-4 mr-1 text-slate-500" /> Add
                    </Button>
                  </div>
                </div>

                <div className="col-span-full space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Instructions / Notes</label>
                  <Input placeholder="Take with food" value={newMedInstructions} onChange={(e) => setNewMedInstructions(e.target.value)} className="rounded-full border-slate-200 text-xs font-semibold px-4" />
                </div>

                {/* Added medications table */}
                {meds.length > 0 && (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden mt-3 bg-[#FDFBFE]">
                    <table className="w-full text-xs text-left text-slate-500">
                      <thead className="bg-slate-50 text-navyBg uppercase font-bold text-[10px] tracking-wide border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2.5">Medication</th>
                          <th className="px-4 py-2.5">Dosage</th>
                          <th className="px-4 py-2.5">Frequency</th>
                          <th className="px-4 py-2.5">Duration</th>
                          <th className="px-4 py-2.5 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {meds.map((med, idx) => (
                          <tr key={idx} className="bg-white hover:bg-slate-50 font-semibold text-slate-600">
                            <td className="px-4 py-3 font-extrabold text-navyBg">{med.name}</td>
                            <td className="px-4 py-3">{med.dosage}</td>
                            <td className="px-4 py-3">{med.frequency}</td>
                            <td className="px-4 py-3">{med.durationDays} days</td>
                            <td className="px-4 py-3 text-right">
                              <button type="button" onClick={() => handleRemoveMedication(idx)} className="text-red-500 hover:text-red-700 px-2.5">
                                <Trash className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-slate-50/40 border-t pt-4 rounded-b-[24px]">
              <Button type="button" variant="outline" onClick={() => router.push('/doctor')} disabled={isLoading} className="rounded-full text-xs font-bold border-slate-300">
                Discard
              </Button>
              <Button type="button" onClick={handleAIParse} className="bg-navyBg hover:bg-navyBg/90 text-white rounded-full text-xs font-bold px-6 py-2.5" disabled={isLoading || !clinicalNotes.trim()}>
                {isLoading ? 'Processing Summary...' : 'Save & Publish Consultation'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
