import { z } from 'zod';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const createDoctorSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  specialization: z.string().min(2, 'Specialization is required'),
  workingHoursStart: z.string().regex(timeRegex, 'Must be in HH:MM format (24h)'),
  workingHoursEnd: z.string().regex(timeRegex, 'Must be in HH:MM format (24h)'),
  slotDuration: z.coerce
    .number()
    .int()
    .positive('Slot duration must be positive')
    .refine((val) => [15, 30, 45, 60].includes(val), {
      message: 'Slot duration must be 15, 30, 45, or 60 minutes',
    }),
  leaveDays: z.array(z.string().regex(dateRegex, 'Must be in YYYY-MM-DD format')).default([]),
}).refine((data) => {
  const [startHour, startMin] = data.workingHoursStart.split(':').map(Number);
  const [endHour, endMin] = data.workingHoursEnd.split(':').map(Number);
  const startMins = startHour * 60 + startMin;
  const endMins = endHour * 60 + endMin;
  return startMins < endMins;
}, {
  message: 'Working hours end time must be after start time',
  path: ['workingHoursEnd'],
});

export const updateDoctorProfileSchema = z.object({
  specialization: z.string().min(2, 'Specialization is required').optional(),
  workingHoursStart: z.string().regex(timeRegex, 'Must be in HH:MM format (24h)').optional(),
  workingHoursEnd: z.string().regex(timeRegex, 'Must be in HH:MM format (24h)').optional(),
  slotDuration: z.coerce
    .number()
    .int()
    .positive()
    .refine((val) => [15, 30, 45, 60].includes(val), {
      message: 'Slot duration must be 15, 30, 45, or 60 minutes',
    })
    .optional(),
  leaveDays: z.array(z.string().regex(dateRegex, 'Must be in YYYY-MM-DD format')).optional(),
}).refine((data) => {
  if (data.workingHoursStart && data.workingHoursEnd) {
    const [startHour, startMin] = data.workingHoursStart.split(':').map(Number);
    const [endHour, endMin] = data.workingHoursEnd.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    return startMins < endMins;
  }
  return true;
}, {
  message: 'Working hours end time must be after start time',
  path: ['workingHoursEnd'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorProfileInput = z.infer<typeof updateDoctorProfileSchema>;
