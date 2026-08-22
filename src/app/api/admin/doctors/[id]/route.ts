import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateDoctorProfileSchema } from '@/lib/validations';
import { Role } from '@prisma/client';

import { emailQueue, calendarQueue } from '@/lib/queue/client';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const userId = params.id;

    // Check if the user exists and has a DOCTOR role
    const existingDoctor = await prisma.user.findUnique({
      where: { id: userId },
      include: { doctorProfile: true },
    });

    if (!existingDoctor || existingDoctor.role !== Role.DOCTOR || !existingDoctor.doctorProfile) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const body = await req.json();
    const result = updateDoctorProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { specialization, workingHoursStart, workingHoursEnd, slotDuration, leaveDays } = result.data;

    let cancelledCount = 0;
    let cancelledAppointmentsList: any[] = [];

    // Analyze conflict cascade if leaveDays are updated
    if (leaveDays !== undefined) {
      const currentLeaves = existingDoctor.doctorProfile.leaveDays;
      const addedLeaves = leaveDays.filter((day: string) => !currentLeaves.includes(day));

      if (addedLeaves.length > 0) {
        const doctorProfileId = existingDoctor.doctorProfile.id;

        // Perform cancellation query inside database transaction
        const conflictRes = await prisma.$transaction(async (tx) => {
          let subCancelledCount = 0;
          let subCancelledList: any[] = [];

          for (const addedDate of addedLeaves) {
            const startOfDay = new Date(`${addedDate}T00:00:00.000Z`);
            const endOfDay = new Date(`${addedDate}T23:59:59.999Z`);

            const conflictingAppts = await tx.appointment.findMany({
              where: {
                doctorProfileId,
                status: { in: ['BOOKED', 'SCHEDULED'] },
                dateTime: {
                  gte: startOfDay,
                  lte: endOfDay,
                },
              },
              select: {
                id: true,
                dateTime: true,
                googleEventId: true,
                patient: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            });

            if (conflictingAppts.length > 0) {
              const apptIds = conflictingAppts.map((a) => a.id);

              await tx.appointment.updateMany({
                where: {
                  id: { in: apptIds },
                },
                data: {
                  status: 'CANCELLED_BY_DOCTOR',
                },
              });

              subCancelledCount += conflictingAppts.length;
              subCancelledList.push(...conflictingAppts);
            }
          }
          return { count: subCancelledCount, list: subCancelledList };
        });

        cancelledCount = conflictRes.count;
        cancelledAppointmentsList = conflictRes.list;

        // Enqueue cancellation notices and Google Calendar event deletions asynchronously
        for (const appt of cancelledAppointmentsList) {
          await emailQueue.add('send-cancellation-notice', {
            patientEmail: appt.patient.email,
            patientName: appt.patient.name,
            doctorName: existingDoctor.name,
            dateTime: appt.dateTime.toISOString(),
            rebookLink: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/patient/book`,
          });

          if (appt.googleEventId) {
            await calendarQueue.add('delete-event', {
              googleEventId: appt.googleEventId,
            });
          }
        }
      }
    }

    // Update doctor profile details
    const updatedProfile = await prisma.doctorProfile.update({
      where: { userId },
      data: {
        ...(specialization !== undefined && { specialization }),
        ...(workingHoursStart !== undefined && { workingHoursStart }),
        ...(workingHoursEnd !== undefined && { workingHoursEnd }),
        ...(slotDuration !== undefined && { slotDuration }),
        ...(leaveDays !== undefined && { leaveDays }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Doctor profile updated successfully',
      cancelledCount,
      cancelledAppointments: cancelledAppointmentsList,
      doctor: {
        id: updatedProfile.user.id,
        name: updatedProfile.user.name,
        email: updatedProfile.user.email,
        role: Role.DOCTOR,
        doctorProfile: {
          id: updatedProfile.id,
          specialization: updatedProfile.specialization,
          workingHoursStart: updatedProfile.workingHoursStart,
          workingHoursEnd: updatedProfile.workingHoursEnd,
          slotDuration: updatedProfile.slotDuration,
          leaveDays: updatedProfile.leaveDays,
        },
      },
    });
  } catch (error: any) {
    console.error('Error updating doctor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
