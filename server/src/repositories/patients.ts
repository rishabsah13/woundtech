import type { DB } from '../db/connection.js';

export interface Patient {
  id: number;
  name: string;
  visitCount: number;
  lastVisitAt: string | null;
}

const SELECT = `
  SELECT p.id, p.name,
         COUNT(v.id)       AS visitCount,
         MAX(v.visited_at) AS lastVisitAt
  FROM patients p
  LEFT JOIN visits v ON v.patient_id = p.id`;

export function patientsRepo(db: DB) {
  const getById = (id: number) =>
    db.prepare(`${SELECT} WHERE p.id = ? GROUP BY p.id`).get(id) as unknown as Patient | undefined;

  return {
    getById,
    list: () => db.prepare(`${SELECT} GROUP BY p.id ORDER BY p.name COLLATE NOCASE`).all() as unknown as Patient[],
    create(input: { name: string }) {
      const { lastInsertRowid } = db.prepare('INSERT INTO patients (name) VALUES (?)').run(input.name);
      return getById(Number(lastInsertRowid))!;
    },
  };
}