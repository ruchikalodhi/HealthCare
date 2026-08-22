import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ConsultationWorkspace from './ConsultationWorkspace';

export const revalidate = 0; // Disable server rendering cache for clinical workspaces

export default async function DoctorAppointmentPage({
  params,
}: {
  params: { id: string };
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      dateTime: true,
      status: true,
      symptoms: true,
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

  // Cast type to fit expectations safely
  const formattedAppt = {
    ...appointment,
    dateTime: appointment.dateTime.toISOString(),
  };

  return <ConsultationWorkspace appointment={formattedAppt} />;
}
