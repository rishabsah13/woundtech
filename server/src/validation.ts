import { z } from 'zod';

const name = z.string().trim().min(1, 'Name is required').max(100);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((s) => (s ? s : undefined)); // '' -> undefined
const queryId = z.coerce.number().int().positive();

export const createClinicianSchema = z.object({ name, specialty: optionalText(100) });
export const createPatientSchema = z.object({ name });

export const createVisitSchema = z.object({
  clinicianId: z.number().int().positive(),
  patientId: z.number().int().positive(),
  visitedAt: z.iso
    .datetime({ offset: true })
    .transform((s) => new Date(s).toISOString()) // normalise every timestamp to UTC
    .refine((s) => new Date(s).getTime() <= Date.now() + 5 * 60_000, 'Visit time cannot be in the future'),
  notes: optionalText(2000),
});

export const listVisitsQuery = z.object({
  clinicianId: queryId.optional(),
  patientId: queryId.optional(),
});
export const idParam = z.object({ id: queryId });