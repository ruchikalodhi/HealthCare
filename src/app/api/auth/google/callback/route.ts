import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectGoogleAccountFromCode } from '@/lib/google-oauth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback?code=...&state=<userId>
 * Exchanges the authorization code for access/refresh tokens and stores
 * them in the GoogleAccount table for the user identified by `state`.
 *
 * We use `state` (rather than only the current session) because it is the
 * value Google round-trips back to us verbatim, and it lets us verify the
 * callback matches the session that initiated the flow.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const settingsPath = (role?: Role) => (role === 'DOCTOR' ? '/doctor/settings' : '/patient/settings');

  if (!session || !session.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectTo = new URL(settingsPath(session.user.role), req.url);

  if (error) {
    redirectTo.searchParams.set('google', 'denied');
    return NextResponse.redirect(redirectTo);
  }

  if (!code || !state || state !== session.user.id) {
    redirectTo.searchParams.set('google', 'error');
    return NextResponse.redirect(redirectTo);
  }

  try {
    await connectGoogleAccountFromCode(session.user.id, code);
    redirectTo.searchParams.set('google', 'connected');
  } catch (err) {
    console.error('[Google OAuth Callback] Failed to exchange code for tokens:', err);
    redirectTo.searchParams.set('google', 'error');
  }

  return NextResponse.redirect(redirectTo);
}
