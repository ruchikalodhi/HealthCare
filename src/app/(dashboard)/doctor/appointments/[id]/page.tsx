import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import ConsultationWorkspace from './ConsultationWorkspace';

export const revalidate = 0; // Disable server rendering cache for clinical workspaces

export default async function DoctorAppointmentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/login');
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      dateTime: true,
      status: true,
      symptoms: true,
      doctorProfile: {
        select: {
          userId: true,
        },
      },
      patient: {
        select: {
          name: true,
          email: true,
        },
      },
      aiSummary: {
        select: {
          urgency: true,
          chiefComplaint: true,
          suggestedQuestions: true,
          preVisitSummary: true,
          postVisitSummary: true,
          isFallback: true,
        },
      },
    },
  });

  if (!appointment) {
    notFound();
  }

  // Ownership check: only the doctor assigned to this appointment (or an
  // admin) may view its clinical workspace. Without this, any authenticated
  // doctor could load another doctor's patient data just by guessing/typing
  // an appointment id in the URL.
  const isAssignedDoctor = appointment.doctorProfile.userId === session.user.id;
  const isAdmin = session.user.role === Role.ADMIN;
  if (!isAssignedDoctor && !isAdmin) {
    notFound();
  }

  // Cast type to fit expectations safely
  const { doctorProfile, ...rest } = appointment;
  const formattedAppt = {
    ...rest,
    dateTime: appointment.dateTime.toISOString(),
  };

  return <ConsultationWorkspace appointment={formattedAppt} />;
}
