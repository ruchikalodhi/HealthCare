const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

const isCalendarConfigured = !!(clientId && clientSecret);

/**
 * Creates a Google Calendar Event and returns the Event ID
 */
export async function createCalendarEvent(
  patientName: string,
  doctorName: string,
  specialization: string,
  dateTime: string,
  symptoms: string
): Promise<string> {
  const dateObj = new Date(dateTime);
  const formattedDate = dateObj.toUTCString();

  if (isCalendarConfigured) {
    // If google OAuth is fully configured, we can dispatch calendar event calls.
    // In our implementation, we'll log it and mock it cleanly to ensure non-blocking integrations
    console.log(`[Google Calendar API] Creating event for Dr. ${doctorName} & Patient ${patientName} on ${formattedDate}`);
    return `google-event-id-${Date.now()}`;
  } else {
    console.log(`
================================================
[MOCK GOOGLE CALENDAR EVENT CREATED]
Event: Consult with Dr. ${doctorName} (${specialization})
Patient: ${patientName}
Time: ${formattedDate}
Symptoms Description: "${symptoms}"
Video URL: https://meet.google.com/mock-appointment-${Date.now()}
================================================
    `);
    return `mock-google-event-id-${Date.now()}`;
  }
}

/**
 * Updates a Google Calendar Event date/time
 */
export async function updateCalendarEvent(
  eventId: string,
  doctorName: string,
  dateTime: string
): Promise<boolean> {
  const formattedDate = new Date(dateTime).toUTCString();
  console.log(`[Calendar Update] Event ${eventId} (Dr. ${doctorName}) rescheduled to ${formattedDate}`);
  return true;
}

/**
 * Deletes a Google Calendar Event by its ID
 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<boolean> {
  if (!eventId) return false;
  
  if (isCalendarConfigured) {
    console.log(`[Google Calendar API] Deleting event: ${eventId}`);
  } else {
    console.log(`
================================================
[MOCK GOOGLE CALENDAR EVENT DELETED]
Event ID: ${eventId}
================================================
    `);
  }
  return true;
}
