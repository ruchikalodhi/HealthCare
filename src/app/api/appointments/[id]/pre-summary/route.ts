import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePreVisitSummary } from '@/lib/ai/summaries';
import { Role } from '@prisma/client';

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
        doctorProfile: true,
        aiSummary: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Role-based access validation
    const isPatient = appointment.patientId === session.user.id;
    const isDoctor = appointment.doctorProfile.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!appointment.symptoms) {
      return NextResponse.json({ error: 'No symptoms recorded to summarize' }, { status: 400 });
    }

    // Generate summary with fallbacks
    const summaryResult = await generatePreVisitSummary(appointment.symptoms);

    // Save to database
    const updatedSummary = await prisma.aISummary.upsert({
      where: { appointmentId },
      update: {
        urgency: summaryResult.urgency,
        chiefComplaint: summaryResult.chiefComplaint,
        suggestedQuestions: summaryResult.suggestedQuestions,
        isFallback: summaryResult.isFallback,
        preVisitSummary: `Pre-visit symptom review. Urgency: ${summaryResult.urgency}. Complaint: ${summaryResult.chiefComplaint}`,
      },
      create: {
        appointmentId,
        urgency: summaryResult.urgency,
        chiefComplaint: summaryResult.chiefComplaint,
        suggestedQuestions: summaryResult.suggestedQuestions,
        isFallback: summaryResult.isFallback,
        preVisitSummary: `Pre-visit symptom review. Urgency: ${summaryResult.urgency}. Complaint: ${summaryResult.chiefComplaint}`,
        postVisitSummary: 'Clinical checkup pending.',
      },
    });

    // Set custom headers for fallback tracking
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('x-ai-status', summaryResult.isFallback ? 'FALLBACK' : 'SUCCESS');

    return new NextResponse(
      JSON.stringify({
        message: 'Pre-visit symptom summary computed successfully',
        aiStatus: summaryResult.isFallback ? 'FALLBACK' : 'SUCCESS',
        aiSummary: updatedSummary,
      }),
      {
        status: 200,
        headers: responseHeaders,
      }
    );
  } catch (error: any) {
    console.error('Error generating pre-visit intake AI summary:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
