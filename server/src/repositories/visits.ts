import type { DB } from '../db/connection.js';

export interface Visit {
  id: number;
  visitedAt: string;
  notes: string | null;
  clinicianId: number;
  clinicianName: string;
  patientId: number;
  patientName: string;
}
export interface VisitFilters { clinicianId?: number; patientId?: number }
export interface NewVisit { clinicianId: number; patientId: number; visitedAt: string; notes?: string }

const SELECT = `
  SELECT v.id, v.visited_at AS visitedAt, v.notes,
         c.id AS clinicianId, c.name AS clinicianName,
         p.id AS patientId,   p.name AS patientName
  FROM visits v
  JOIN clinicians c ON c.id = v.clinician_id
  JOIN patients   p ON p.id = v.patient_id`;

export function visitsRepo(db: DB) {
  const getById = (id: number) => db.prepare(`${SELECT} WHERE v.id = ?`).get(id) as unknown as Visit | undefined;

  return {
    getById,
    create(v: NewVisit) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO visits (clinician_id, patient_id, visited_at, notes) VALUES (?, ?, ?, ?)')
        .run(v.clinicianId, v.patientId, v.visitedAt, v.notes ?? null);
      return getById(Number(lastInsertRowid))!;
    },
    list(f: VisitFilters = {}) {
      // Conditions come from a fixed set; values always go through ? placeholders.
      const where: string[] = [];
      const params: number[] = [];
      if (f.clinicianId) { where.push('v.clinician_id = ?'); params.push(f.clinicianId); }
      if (f.patientId)   { where.push('v.patient_id = ?');   params.push(f.patientId); }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return db
        .prepare(`${SELECT} ${clause} ORDER BY v.visited_at DESC, v.id DESC`)
        .all(...params) as unknown as Visit[];
    },
  };
}