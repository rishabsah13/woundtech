import type { DB } from '../db/connection.js';
import { cliniciansRepo } from './clinicians.js';
import { patientsRepo } from './patients.js';
import { visitsRepo } from './visits.js';

export const createRepos = (db: DB) => ({
  clinicians: cliniciansRepo(db),
  patients: patientsRepo(db),
  visits: visitsRepo(db),
});
export type Repos = ReturnType<typeof createRepos>;