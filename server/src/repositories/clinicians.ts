import type { DB } from '../db/connection.js';

export interface Clinician {
  id: number;
  name: string;
  specialty: string | null;
  visitCount: number;
  lastVisitAt: string | null;
}

// Visit stats come from a LEFT JOIN so people with no visits still appear.
const SELECT = `
  SELECT c.id, c.name, c.specialty,
         COUNT(v.id)       AS visitCount,
         MAX(v.visited_at) AS lastVisitAt
  FROM clinicians c
  LEFT JOIN visits v ON v.clinician_id = c.id`;

export function cliniciansRepo(db: DB) {
  const getById = (id: number) =>
    db.prepare(`${SELECT} WHERE c.id = ? GROUP BY c.id`).get(id) as unknown as Clinician | undefined;

  return {
    getById,
    list: () => db.prepare(`${SELECT} GROUP BY c.id ORDER BY c.name COLLATE NOCASE`).all() as unknown as Clinician[],
    create(input: { name: string; specialty?: string }) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO clinicians (name, specialty) VALUES (?, ?)')
        .run(input.name, input.specialty ?? null);
      return getById(Number(lastInsertRowid))!;
    },
  };
}