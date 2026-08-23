'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface MeResponse {
  googleAccount?: { updatedAt: string } | null;
}

export default function GoogleCalendarConnectCard() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get('google');

  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/user/me')
      .then((res) => res.json())
      .then((data: MeResponse) => setConnected(!!data.googleAccount))
      .catch(() => setConnected(false));
  }, [googleStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-navyBg" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Connect your Google account so booked appointments are automatically added to your
          calendar, and kept in sync when they're rescheduled or cancelled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {googleStatus === 'connected' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> Google Calendar connected successfully.
          </div>
        )}
        {googleStatus === 'denied' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
            <XCircle className="h-4 w-4" /> Google sign-in was cancelled. You can try again below.
          </div>
        )}
        {googleStatus === 'error' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <XCircle className="h-4 w-4" /> Something went wrong connecting Google Calendar. Please try again.
          </div>
        )}
        {googleStatus === 'not_configured' && (
          <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <XCircle className="h-4 w-4" /> Google Calendar isn't configured on this server yet.
          </div>
        )}

        {connected === null ? (
          <p className="text-sm text-slate-400">Checking connection status…</p>
        ) : connected ? (
          <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Connected
            </div>
            <a href="/api/auth/google/connect">
              <Button variant="outline" size="sm">
                Reconnect
              </Button>
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-500">Not connected</span>
            <a href="/api/auth/google/connect">
              <Button size="sm">Connect Google Calendar</Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
