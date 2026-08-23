import { google } from 'googleapis';
import { prisma } from './prisma';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
// NOTE: this is a distinct redirect URI from NextAuth's own
// /api/auth/callback/[provider] route — this project does not register a
// NextAuth Google provider (see src/lib/auth.ts), since the built-in
// provider doesn't request the calendar.events scope or reliably expose a
// long-lived refresh token. Instead we drive a standalone OAuth2Client flow
// solely for Calendar access.
const redirectUri =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const isGoogleOAuthConfigured = !!(clientId && clientSecret);

/**
 * Bare (unauthenticated) OAuth2 client used to build the consent URL and to
 * exchange an authorization code for tokens.
 */
export function createOAuth2Client() {
  if (!isGoogleOAuthConfigured) {
    throw new Error('Google OAuth is not configured (missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Builds the Google consent screen URL for a given user. We pass the userId
 * as `state` so the callback route knows whose GoogleAccount row to write,
 * without relying on cookies/session persisting across the redirect.
 */
export function getGoogleConsentUrl(userId: string) {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline', // required to receive a refresh_token
    prompt: 'consent', // forces refresh_token on every connect, even for repeat users
    scope: [GOOGLE_CALENDAR_SCOPE, 'https://www.googleapis.com/auth/userinfo.email'],
    state: userId,
  });
}

/**
 * Exchanges an authorization code for tokens and persists them to the
 * GoogleAccount table for the given user.
 */
export async function connectGoogleAccountFromCode(userId: string, code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    // Google only returns a refresh_token the first time a user consents
    // (or when prompt=consent forces re-issuance, which we always do above).
    throw new Error('Google did not return an access_token/refresh_token pair');
  }

  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

  await prisma.googleAccount.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate,
      scope: tokens.scope,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate,
      scope: tokens.scope,
    },
  });
}

/**
 * Returns an authenticated OAuth2Client for the given user, refreshing (and
 * persisting) the access token first if it has expired. Returns null if the
 * user has never connected a Google account — callers should treat this as
 * "fall back to mock behavior", not throw.
 */
export async function getAuthorizedClientForUser(userId: string) {
  if (!isGoogleOAuthConfigured) return null;

  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.expiryDate.getTime(),
  });

  // Refresh if the token is expired (or about to expire in the next minute).
  if (account.expiryDate.getTime() < Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);

    await prisma.googleAccount.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token || account.accessToken,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : account.expiryDate,
      },
    });
  }

  return client;
}
