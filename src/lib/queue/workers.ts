import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../prisma';
import { sendEmail } from '../email/client';
import {
  getBookingConfirmationEmail,
  getCancellationEmail,
  getPostVisitSummaryEmail,
  getMedicationReminderEmail,
} from '../email/templates';
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '../calendar/google';

const redisUrl = process.env.REDIS_URL;
const isRedisConfigured = !!redisUrl;

/**
 * Common entry point to process jobs asynchronously.
 */
export async function processJobInline(
  queueName: string,
  jobName: string,
  data: any
): Promise<any> {
  console.log(`[Worker Processing] Queue: "${queueName}", Job: "${jobName}"`);

  try {
    // ---- 1. EMAIL QUEUE PROCESSOR ----
    if (queueName === 'email-queue') {
      switch (jobName) {
        case 'send-booking-confirmation': {
          const { patientEmail, doctorEmail, patientName, doctorName, specialization, dateTime } = data;
          
          // Generate template
          const { html, text, subject } = getBookingConfirmationEmail(
            patientName,
            doctorName,
            specialization,
            dateTime
          );

          // Dispatch to Patient
          await sendEmail(patientEmail, subject, html, text);
          
          // Dispatch to Doctor
          if (doctorEmail) {
            await sendEmail(
              doctorEmail,
              `New Patient Scheduled: ${patientName}`,
              html,
              text
            );
          }
          break;
        }

        case 'send-cancellation-notice': {
          const { patientEmail, patientName, doctorName, dateTime, rebookLink } = data;
          
          const { html, text, subject } = getCancellationEmail(
            patientName,
            doctorName,
            dateTime,
            rebookLink
          );

          await sendEmail(patientEmail, subject, html, text);
          break;
        }

        case 'send-post-visit-summary': {
          const { patientEmail, patientName, doctorName, friendlySummary, lifestyleAdvice, medications } = data;
          
          const { html, text, subject } = getPostVisitSummaryEmail(
            patientName,
            doctorName,
            friendlySummary,
            lifestyleAdvice,
            medications
          );

          await sendEmail(patientEmail, subject, html, text);
          break;
        }

        case 'send-medication-reminder': {
          const { patientEmail, patientName, medicationName, dosage, frequency, instructions } = data;
          
          const { html, text, subject } = getMedicationReminderEmail(
            patientName,
            medicationName,
            dosage,
            frequency,
            instructions
          );

          await sendEmail(patientEmail, subject, html, text);
          break;
        }

        default:
          console.warn(`[Worker Warning] Unknown job type "${jobName}" in email-queue`);
      }
    }

    // ---- 2. CALENDAR QUEUE PROCESSOR ----
    if (queueName === 'calendar-queue') {
      switch (jobName) {
        case 'create-event': {
          const { appointmentId, doctorId, patientName, doctorName, specialization, dateTime, symptoms } = data;
          
          // Call API
          const googleEventId = await createCalendarEvent(
            patientName,
            doctorName,
            specialization,
            dateTime,
            symptoms
          );

          // Store event ID in Appointment model
          await prisma.appointment.update({
            where: { id: appointmentId },
            data: { googleEventId },
          });
          
          console.log(`[Worker Success] Linked googleEventId "${googleEventId}" to appointment ${appointmentId}`);
          break;
        }

        case 'delete-event': {
          const { googleEventId } = data;
          await deleteCalendarEvent(googleEventId);
          break;
        }

        case 'update-event': {
          const { googleEventId, doctorName, dateTime } = data;
          await updateCalendarEvent(googleEventId, doctorName, dateTime);
          break;
        }

        default:
          console.warn(`[Worker Warning] Unknown job type "${jobName}" in calendar-queue`);
      }
    }
  } catch (err) {
    console.error(`[Worker Error] Failed to complete job "${jobName}" in "${queueName}":`, err);
    throw err; // Throwing error triggers BullMQ retry policy
  }
}

// Start active background workers if Redis connection is active
if (isRedisConfigured) {
  const connection = new IORedis(redisUrl!, { maxRetriesPerRequest: null });

  const workerOptions = {
    connection,
    limiter: {
      max: 10,
      duration: 1000, // Limiting to 10 jobs per second max
    },
  };

  const emailWorker = new Worker(
    'email-queue',
    async (job) => {
      await processJobInline('email-queue', job.name, job.data);
    },
    workerOptions
  );

  const calendarWorker = new Worker(
    'calendar-queue',
    async (job) => {
      await processJobInline('calendar-queue', job.name, job.data);
    },
    workerOptions
  );

  emailWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker Fail] email-queue job ${job?.id} failed:`, err);
  });

  calendarWorker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker Fail] calendar-queue job ${job?.id} failed:`, err);
  });

  console.log('BullMQ background workers initialized.');
}
