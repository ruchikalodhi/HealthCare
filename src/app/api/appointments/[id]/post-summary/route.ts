import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePostVisitSummary } from '@/lib/ai/summaries';
import { Role, AppointmentStatus } from '@prisma/client';
import { emailQueue } from '@/lib/queue/client';
import { parseFrequencyToTimesPerDay } from '@/lib/medication/frequency';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appointmentId = params.id;

    // Fetch the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Auth verification (must be doctor assigned to appointment or admin)
    const isDoctorOwner = appointment.doctorProfile.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isDoctorOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. Access restricted to assigned doctor.' }, { status: 403 });
    }

    const { clinicalNotes } = await req.json();
    if (!clinicalNotes || !clinicalNotes.trim()) {
      return NextResponse.json({ error: 'Clinical notes are required' }, { status: 400 });
    }

    // Call LLM for post-visit summary + medications parsing
    const summaryResult = await generatePostVisitSummary(clinicalNotes);

    // Atomically execute db updates inside transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Upsert the AI Summary record
      const aiSummary = await tx.aISummary.upsert({
        where: { appointmentId },
        update: {
          postVisitSummary: summaryResult.patientFriendlySummary,
          lifestyleAdvice: summaryResult.lifestyleAdvice,
          isFallback: summaryResult.isFallback,
        },
        create: {
          appointmentId,
          preVisitSummary: 'Intake symptoms logged.',
          postVisitSummary: summaryResult.patientFriendlySummary,
          lifestyleAdvice: summaryResult.lifestyleAdvice,
          isFallback: summaryResult.isFallback,
        },
      });

      // 2. Clear out any previous medication schedules for this appointment to prevent duplication on runs
      await tx.medicationSchedule.deleteMany({
        where: { appointmentId },
      });

      // 3. Create medication schedules
      const createdMeds = [];
      const now = new Date();

      for (const med of summaryResult.medications) {
        const endDate = new Date();
        endDate.setDate(now.getDate() + med.durationDays);

        const medRecord = await tx.medicationSchedule.create({
          data: {
            appointmentId,
            medicationName: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            timesPerDay: med.timesPerDay ?? parseFrequencyToTimesPerDay(med.frequency),
            instructions: med.instructions,
            startDate: now,
            endDate: endDate,
          },
        });
        createdMeds.push(medRecord);
      }

      // 4. Update the main appointment status to COMPLETED
      const updatedAppt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
        },
      });

      return { aiSummary, createdMeds, appointment: updatedAppt };
    });

    // Enqueue the post-visit summary email asynchronously
    await emailQueue.add('send-post-visit-summary', {
      patientEmail: appointment.patient.email,
      patientName: appointment.patient.name,
      doctorName: appointment.doctorProfile.user.name,
      friendlySummary: summaryResult.patientFriendlySummary,
      lifestyleAdvice: summaryResult.lifestyleAdvice,
      medications: summaryResult.medications,
    });

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('x-ai-status', summaryResult.isFallback ? 'FALLBACK' : 'SUCCESS');

    return new NextResponse(
      JSON.stringify({
        message: 'Clinical summary generated and prescriptions stored',
        aiStatus: summaryResult.isFallback ? 'FALLBACK' : 'SUCCESS',
        ...transactionResult,
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (error: any) {
    console.error('Error in post-visit clinical AI summary route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
