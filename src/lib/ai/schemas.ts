import { z } from 'zod';

export const PreVisitSummarySchema = z.object({
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
  chiefComplaint: z.string().min(1, 'Chief complaint overview is required'),
  suggestedQuestions: z.array(z.string()).min(1, 'At least one suggested question is required'),
});

export const PostVisitSummarySchema = z.object({
  patientFriendlySummary: z.string().min(1, 'Patient friendly summary is required'),
  lifestyleAdvice: z.array(z.string()).min(1, 'At least one bullet point of advice is required'),
  medications: z.array(
    z.object({
      name: z.string().min(1, 'Medication name is required'),
      dosage: z.string().min(1, 'Dosage description is required'),
      frequency: z.string().min(1, 'Frequency instruction is required'),
      timesPerDay: z.coerce.number().int().positive().optional(),
      durationDays: z.coerce.number().int().positive('Duration days must be positive'),
      instructions: z.string().min(1, 'Instructions details are required'),
    })
  ).default([]),
});

export type PreVisitSummaryInput = z.infer<typeof PreVisitSummarySchema>;
export type PostVisitSummaryInput = z.infer<typeof PostVisitSummarySchema>;
