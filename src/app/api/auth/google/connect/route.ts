import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGoogleConsentUrl, isGoogleOAuthConfigured } from '@/lib/google-oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/connect
 * Redirects the logged-in user (patient or doctor) to Google's OAuth
 * consent screen requesting the `calendar.events` scope. On success Google
 * redirects to /api/auth/google/callback with a `code`.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!isGoogleOAuthConfigured) {
    const settingsPath = session.user.role === 'DOCTOR' ? '/doctor/settings' : '/patient/settings';
    const url = new URL(settingsPath, req.url);
    url.searchParams.set('google', 'not_configured');
    return NextResponse.redirect(url);
  }

  const consentUrl = getGoogleConsentUrl(session.user.id);
  return NextResponse.redirect(consentUrl);
}
