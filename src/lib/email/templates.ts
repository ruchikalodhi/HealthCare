export interface EmailPayload {
  html: string;
  text: string;
  subject: string;
}

export function getBookingConfirmationEmail(
  patientName: string,
  doctorName: string,
  specialization: string,
  dateTime: string
): EmailPayload {
  const formattedDate = new Date(dateTime).toUTCString();
  const subject = `Appointment Confirmed: Dr. ${doctorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb; text-align: center;">Appointment Confirmation</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Your appointment has been successfully scheduled and booked with <strong>Dr. ${doctorName}</strong>.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Specialist:</strong> Dr. ${doctorName} (${specialization})</p>
        <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${formattedDate} (UTC)</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> HealthAlign Online Clinic</p>
      </div>

      <p>A calendar event has been added to your calendar. Please arrive 5 minutes early.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">HealthAlign Clinic Systems, Inc.</p>
    </div>
  `;

  const text = `
    Dear ${patientName},
    Your appointment is confirmed with Dr. ${doctorName} (${specialization}) on ${formattedDate} (UTC).
    HealthAlign Online Clinic.
  `;

  return { html, text, subject };
}

export function getCancellationEmail(
  patientName: string,
  doctorName: string,
  dateTime: string,
  rebookLink: string
): EmailPayload {
  const formattedDate = new Date(dateTime).toUTCString();
  const subject = `Cancelled: Appointment with Dr. ${doctorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; rounded: 8px;">
      <h2 style="color: #dc2626; text-align: center;">Appointment Cancellation</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>We regret to inform you that your appointment with <strong>Dr. ${doctorName}</strong> scheduled for <strong>${formattedDate} (UTC)</strong> has been cancelled due to sudden doctor unavailability or leave.</p>
      
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 5px 0; font-weight: bold; color: #d97706;">Reschedule Your Visit</p>
        <p style="margin: 10px 0; font-size: 13px;">Please select another time slot or clinician using the link below:</p>
        <a href="${rebookLink}" style="background-color: #2563eb; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold; margin-top: 5px;">Re-book Appointment</a>
      </div>

      <p>If you have any urgent concerns, please reach out to our support coordinates.</p>
      <hr style="border: 0; border-top: 1px solid #fee2e2; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">HealthAlign Clinic Systems, Inc.</p>
    </div>
  `;

  const text = `
    Dear ${patientName},
    Your appointment with Dr. ${doctorName} on ${formattedDate} (UTC) has been cancelled due to leave/unavailability.
    Please re-book here: ${rebookLink}
  `;

  return { html, text, subject };
}

export function getRescheduleEmail(
  patientName: string,
  doctorName: string,
  oldDateTime: string,
  newDateTime: string
): EmailPayload {
  const formattedOld = new Date(oldDateTime).toUTCString();
  const formattedNew = new Date(newDateTime).toUTCString();
  const subject = `Rescheduled: Appointment with Dr. ${doctorName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb; text-align: center;">Appointment Rescheduled</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Your appointment with <strong>Dr. ${doctorName}</strong> has been moved to a new time.</p>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0; text-decoration: line-through; color: #94a3b8;"><strong>Previous Time:</strong> ${formattedOld} (UTC)</p>
        <p style="margin: 5px 0; color: #1e293b;"><strong>New Time:</strong> ${formattedNew} (UTC)</p>
      </div>

      <p>Your calendar event has been updated automatically. Please arrive 5 minutes early for the new time.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">HealthAlign Clinic Systems, Inc.</p>
    </div>
  `;

  const text = `
    Dear ${patientName},
    Your appointment with Dr. ${doctorName} has been rescheduled from ${formattedOld} (UTC) to ${formattedNew} (UTC).
    Your calendar event has been updated automatically.
  `;

  return { html, text, subject };
}

export function getPostVisitSummaryEmail(
  patientName: string,
  doctorName: string,
  friendlySummary: string,
  lifestyleAdvice: string[],
  medsList: { name: string; dosage: string; frequency: string; durationDays: number }[]
): EmailPayload {
  const subject = `Clinical Care Plan - Dr. ${doctorName}`;

  const adviceHtml = lifestyleAdvice.map((item) => `<li>${item}</li>`).join('');
  const medsHtml = medsList
    .map(
      (m) =>
        `<li style="margin-bottom: 8px;"><strong>${m.name}</strong> - ${m.dosage} (${m.frequency}) for ${m.durationDays} days</li>`
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
      <h2 style="color: #2563eb; text-align: center;">Post-Visit Clinical Summary</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>Dr. <strong>${doctorName}</strong> has published your recovery plan and consultation summary.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #1e293b;">Doctor's Recovery Explanation:</h4>
        <p style="font-style: italic; color: #334155;">"${friendlySummary}"</p>
      </div>

      ${
        lifestyleAdvice.length > 0
          ? `
        <div style="margin: 20px 0;">
          <h4 style="color: #1e293b; margin: 0 0 5px 0;">Lifestyle & Daily Recovery Advice:</h4>
          <ul style="padding-left: 20px; margin: 0; color: #475569;">
            ${adviceHtml}
          </ul>
        </div>
      `
          : ''
      }

      ${
        medsList.length > 0
          ? `
        <div style="margin: 20px 0; border-top: 1px solid #e2e8f0; pt: 15px;">
          <h4 style="color: #1e293b; margin: 10px 0 5px 0;">Prescribed Medications & Schedule:</h4>
          <ul style="padding-left: 20px; margin: 0; color: #475569;">
            ${medsHtml}
          </ul>
        </div>
      `
          : ''
      }

      <p style="font-size: 13px; color: #64748b;">Please review complete medication dosage guidelines inside your Patient Portal.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">HealthAlign Clinic Systems, Inc.</p>
    </div>
  `;

  const text = `
    Dear ${patientName},
    Dr. ${doctorName} has published your clinical care plan.
    Summary: ${friendlySummary}
    Please view medication details on the Patient Portal.
  `;

  return { html, text, subject };
}

export function getMedicationReminderEmail(
  patientName: string,
  medicationName: string,
  dosage: string,
  frequency: string,
  instructions: string
): EmailPayload {
  const subject = `Medication Reminder: Daily Dose Alert`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dbeafe; rounded: 8px;">
      <h2 style="color: #1e40af; text-align: center;">Daily Medication Reminder</h2>
      <p>Dear <strong>${patientName}</strong>,</p>
      <p>This is a scheduled reminder to take your active prescription dose today:</p>
      
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 5px 0; font-size: 16px;"><strong>Medication Name:</strong> ${medicationName}</p>
        <p style="margin: 5px 0;"><strong>Dosage Rate:</strong> ${dosage}</p>
        <p style="margin: 5px 0;"><strong>Daily Frequency:</strong> ${frequency}</p>
        <p style="margin: 5px 0; font-style: italic; color: #1e3a8a;"><strong>Instructions:</strong> "${instructions || 'Take as directed by doctor.'}"</p>
      </div>

      <p style="font-size: 12px; color: #64748b;">Do not exceed the recommended dose. If you experience adverse reactions, consult the clinic immediately.</p>
      <hr style="border: 0; border-top: 1px solid #dbeafe; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b; text-align: center;">HealthAlign Clinic Systems, Inc.</p>
    </div>
  `;

  const text = `
    Dear ${patientName},
    Daily Medication Reminder: Take ${medicationName} (${dosage}), frequency: ${frequency}. Instruction: ${instructions}.
  `;

  return { html, text, subject };
}
