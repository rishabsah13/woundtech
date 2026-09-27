import express from 'express';
import type { DB } from './db/connection.js';
import { createRepos } from './repositories/index.js';
import { cliniciansRouter } from './routes/clinicians.js';
import { patientsRouter } from './routes/patients.js';
import { visitsRouter } from './routes/visits.js';
import { errorHandler, notFound } from './errors.js';

export function createApp(db: DB) {
  const repos = createRepos(db);
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/api/clinicians', cliniciansRouter(repos));
  app.use('/api/patients', patientsRouter(repos));
  app.use('/api/visits', visitsRouter(repos));

  app.use(notFound);
  app.use(errorHandler); // must be last
  return app;
}