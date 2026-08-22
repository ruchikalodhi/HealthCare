import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailQueue } from '@/lib/queue/client';

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

    // Query active medication schedules where current date is between start and end dates
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

    for (const schedule of activeSchedules) {
      const patient = schedule.appointment?.patient;
      if (patient?.email) {
        await emailQueue.add('send-medication-reminder', {
          patientEmail: patient.email,
          patientName: patient.name,
          medicationName: schedule.medicationName,
          dosage: schedule.dosage,
          frequency: schedule.frequency,
          instructions: schedule.instructions || 'Take as directed.',
        });
        remindersSent++;
      }
    }

    return NextResponse.json({
      message: 'Medication reminders dispatched successfully',
      remindersSentCount: remindersSent,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Error running medication reminders cron:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
