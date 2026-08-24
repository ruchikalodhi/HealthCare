import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, id } = session.user;

    if (role === Role.PATIENT) {
      const appointments = await prisma.appointment.findMany({
        where: { patientId: id },
        include: {
          doctorProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          aiSummary: true,
          medicationSchedules: true,
        },
        orderBy: {
          dateTime: 'desc',
        },
      });
      return NextResponse.json(appointments);
    }

    if (role === Role.DOCTOR) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId: id },
      });

      if (!doctorProfile) {
        return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
      }

      const appointments = await prisma.appointment.findMany({
        where: { doctorProfileId: doctorProfile.id },
        include: {
          patient: {
            select: {
              name: true,
              email: true,
            },
          },
          aiSummary: true,
          medicationSchedules: true,
        },
        orderBy: {
          dateTime: 'desc',
        },
      });
      return NextResponse.json(appointments);
    }

    return NextResponse.json({ error: 'Invalid role for fetching appointments' }, { status: 400 });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
