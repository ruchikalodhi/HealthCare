import { Suspense } from 'react';
import GoogleCalendarConnectCard from '@/components/shared/GoogleCalendarConnectCard';

export const dynamic = 'force-dynamic';

export default function PatientSettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-navyBg">Settings</h1>
        <p className="text-slate-500 text-sm">Manage integrations for your patient account.</p>
      </div>
      <Suspense fallback={<div className="text-xs text-slate-400 font-bold italic animate-pulse">Loading settings...</div>}>
        <GoogleCalendarConnectCard />
      </Suspense>
    </div>
  );
}
