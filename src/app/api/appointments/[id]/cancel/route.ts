import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role, AppointmentStatus } from '@prisma/client';

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

    // Load existing appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify ownership
    const isPatientOwner = appointment.patientId === session.user.id;
    const isDoctorOwner = appointment.doctorProfile.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. You do not own this appointment.' }, { status: 403 });
    }

    // Update status to CANCELLED
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });

    return NextResponse.json({
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment,
    });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
