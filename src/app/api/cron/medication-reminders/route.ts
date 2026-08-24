import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailQueue } from '@/lib/queue/client';
import { getReminderIntervalMs } from '@/lib/medication/frequency';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleCron();
}

export async function POST(req: NextRequest) {
  return handleCron();
}

async function handleCron() {
  try {
    const now = new Date();

    // Query active medication schedules where current date is between start and end dates.
    // This is still a coarse filter - the actual "is this dose due" decision happens
    // below, based on each schedule's timesPerDay and lastRemindedAt.
    const activeSchedules = await prisma.medicationSchedule.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    console.log(`[Medication Cron] Found ${activeSchedules.length} active schedule(s) for ${now.toUTCString()}`);

    let remindersSent = 0;
    let skippedNotDue = 0;

    for (const schedule of activeSchedules) {
      const patient = schedule.appointment?.patient;
      if (!patient?.email) continue;

      const intervalMs = getReminderIntervalMs(schedule.timesPerDay);
      const dueSinceLastReminder =
        !schedule.lastRemindedAt || now.getTime() - schedule.lastRemindedAt.getTime() >= intervalMs;

      if (!dueSinceLastReminder) {
        skippedNotDue++;
        continue;
      }

      await emailQueue.add('send-medication-reminder', {
        patientEmail: patient.email,
        patientName: patient.name,
        medicationName: schedule.medicationName,
        dosage: schedule.dosage,
        frequency: schedule.frequency,
        instructions: schedule.instructions || 'Take as directed.',
      });

      // Record that a reminder was actually sent for this dose window so the
      // next cron run doesn't fire again until the next dose is due.
      await prisma.medicationSchedule.update({
        where: { id: schedule.id },
        data: { lastRemindedAt: now },
      });

      remindersSent++;
    }

    return NextResponse.json({
      message: 'Medication reminders dispatched successfully',
      remindersSentCount: remindersSent,
      skippedNotDueCount: skippedNotDue,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error running medication reminders cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
