import { Router } from 'express';
import type { Repos } from '../repositories/index.js';
import { HttpError } from '../errors.js';
import { createClinicianSchema, idParam } from '../validation.js';

export function cliniciansRouter({ clinicians }: Repos) {
  const r = Router();
  r.get('/', (_req, res) => { res.json(clinicians.list()); });
  r.get('/:id', (req, res) => {
    const found = clinicians.getById(idParam.parse(req.params).id);
    if (!found) throw new HttpError(404, 'Clinician not found');
    res.json(found);
  });
  r.post('/', (req, res) => { res.status(201).json(clinicians.create(createClinicianSchema.parse(req.body))); });
  return r;
}