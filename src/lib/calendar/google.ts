import { google } from 'googleapis';
import { getAuthorizedClientForUser } from '../google-oauth';

/**
 * Events are written to the calendar of the acting doctor's connected
 * Google account (i.e. `doctorUserId`'s GoogleAccount row), with the
 * patient and doctor added as attendees. If the doctor hasn't connected
 * Google Calendar yet (no GoogleAccount row), we fall back to the previous
 * mock/log behavior rather than throwing — booking should never fail just
 * because a doctor hasn't gone through the consent flow.
 */

interface CreateEventParams {
  doctorUserId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  specialization: string;
  dateTime: string; // ISO string, appointment start
  slotDurationMinutes: number;
  symptoms: string;
}

interface UpdateEventParams {
  doctorUserId: string;
  eventId: string;
  doctorName: string;
  dateTime: string; // ISO string, new appointment start
  slotDurationMinutes: number;
}

interface DeleteEventParams {
  doctorUserId: string;
  eventId: string;
}

function mockLog(label: string, body: string) {
  console.log(`\n================================================\n[MOCK GOOGLE CALENDAR ${label}]\n${body}\n================================================\n`);
}

/**
 * Creates a real Google Calendar event on the doctor's calendar and returns
 * the Google-issued event ID. Falls back to a mock ID (and console log) if
 * the doctor has no connected GoogleAccount.
 */
export async function createCalendarEvent({
  doctorUserId,
  patientName,
  patientEmail,
  doctorName,
  doctorEmail,
  specialization,
  dateTime,
  slotDurationMinutes,
  symptoms,
}: CreateEventParams): Promise<string> {
  const startDate = new Date(dateTime);
  const endDate = new Date(startDate.getTime() + slotDurationMinutes * 60 * 1000);

  const client = await getAuthorizedClientForUser(doctorUserId);

  if (!client) {
    console.log(`[Google Calendar] No GoogleAccount connected for doctor ${doctorUserId} — using mock fallback.`);
    mockLog(
      'EVENT CREATED (fallback)',
      `Event: Consult with Dr. ${doctorName} (${specialization})\nPatient: ${patientName}\nTime: ${startDate.toUTCString()}\nSymptoms Description: "${symptoms}"`
    );
    return `mock-google-event-id-${Date.now()}`;
  }

  console.log(`[Google Calendar API] Creating real event for Dr. ${doctorName} & Patient ${patientName} on ${startDate.toUTCString()}`);

  const calendar = google.calendar({ version: 'v3', auth: client });
  const event = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: {
      summary: `Consult: Dr. ${doctorName} & ${patientName}`,
      description: `Specialization: ${specialization}\n\nPatient-reported symptoms:\n${symptoms}`,
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
      attendees: [
        { email: patientEmail, displayName: patientName },
        { email: doctorEmail, displayName: doctorName },
      ],
    },
  });

  if (!event.data.id) {
    throw new Error('Google Calendar API did not return an event ID');
  }

  return event.data.id;
}

/**
 * Updates the start/end time of an existing Google Calendar event (used on
 * reschedule). Falls back to a no-op log if the doctor has no connected
 * GoogleAccount, since in that case the "event" was only ever a mock ID.
 */
export async function updateCalendarEvent({
  doctorUserId,
  eventId,
  doctorName,
  dateTime,
  slotDurationMinutes,
}: UpdateEventParams): Promise<boolean> {
  const startDate = new Date(dateTime);
  const endDate = new Date(startDate.getTime() + slotDurationMinutes * 60 * 1000);

  const client = await getAuthorizedClientForUser(doctorUserId);

  if (!client || eventId.startsWith('mock-google-event-id-')) {
    console.log(`[Google Calendar] No GoogleAccount connected (or mock event) for doctor ${doctorUserId} — using mock fallback.`);
    mockLog('EVENT UPDATED (fallback)', `Event ${eventId} (Dr. ${doctorName}) rescheduled to ${startDate.toUTCString()}`);
    return true;
  }

  console.log(`[Google Calendar API] Updating event ${eventId} for Dr. ${doctorName} to ${startDate.toUTCString()}`);

  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
    requestBody: {
      start: { dateTime: startDate.toISOString() },
      end: { dateTime: endDate.toISOString() },
    },
  });

  return true;
}

/**
 * Deletes a Google Calendar event (used on cancellation). Falls back to a
 * no-op log if the doctor has no connected GoogleAccount or the ID is a
 * mock ID from before the doctor connected their account.
 */
export async function deleteCalendarEvent({ doctorUserId, eventId }: DeleteEventParams): Promise<boolean> {
  if (!eventId) return false;

  const client = await getAuthorizedClientForUser(doctorUserId);

  if (!client || eventId.startsWith('mock-google-event-id-')) {
    console.log(`[Google Calendar] No GoogleAccount connected (or mock event) for doctor ${doctorUserId} — using mock fallback.`);
    mockLog('EVENT DELETED (fallback)', `Event ID: ${eventId}`);
    return true;
  }

  console.log(`[Google Calendar API] Deleting event: ${eventId}`);

  const calendar = google.calendar({ version: 'v3', auth: client });
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
  } catch (err: any) {
    // Google returns 410/404 if the event was already deleted manually —
    // treat that as success rather than surfacing a worker retry loop.
    if (err?.code === 410 || err?.code === 404) {
      console.log(`[Google Calendar API] Event ${eventId} was already deleted/gone.`);
      return true;
    }
    throw err;
  }

  return true;
}
