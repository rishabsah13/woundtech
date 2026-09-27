import { Router } from 'express';
import type { Repos } from '../repositories/index.js';
import { HttpError } from '../errors.js';
import { createPatientSchema, idParam } from '../validation.js';

export function patientsRouter({ patients }: Repos) {
  const r = Router();
  r.get('/', (_req, res) => { res.json(patients.list()); });
  r.get('/:id', (req, res) => {
    const found = patients.getById(idParam.parse(req.params).id);
    if (!found) throw new HttpError(404, 'Patient not found');
    res.json(found);
  });
  r.post('/', (req, res) => { res.status(201).json(patients.create(createPatientSchema.parse(req.body))); });
  return r;
}