import { Router } from 'express';
import type { Repos } from '../repositories/index.js';
import { HttpError } from '../errors.js';
import { createVisitSchema, listVisitsQuery } from '../validation.js';

export function visitsRouter({ visits, clinicians, patients }: Repos) {
  const r = Router();

  r.get('/', (req, res) => {
    res.json(visits.list(listVisitsQuery.parse(req.query)));
  });

  r.post('/', (req, res) => {
    const body = createVisitSchema.parse(req.body);
    // Friendly 422s; the foreign keys remain the safety net.
    if (!clinicians.getById(body.clinicianId)) throw new HttpError(422, 'Clinician does not exist');
    if (!patients.getById(body.patientId)) throw new HttpError(422, 'Patient does not exist');
    res.status(201).json(visits.create(body));
  });

  return r;
}