import { createDb, transaction } from './connection.js';

// Fictional demo data only. Times are relative to "now" so the timeline always looks current.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const db = createDb();

transaction(db, () => {
  db.exec('DELETE FROM visits; DELETE FROM patients; DELETE FROM clinicians;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('visits','patients','clinicians');");

  const c = db.prepare('INSERT INTO clinicians (name, specialty) VALUES (?, ?)');
  const p = db.prepare('INSERT INTO patients (name) VALUES (?)');
  const v = db.prepare(
    'INSERT INTO visits (clinician_id, patient_id, visited_at, notes) VALUES (?, ?, ?, ?)',
  );

  [
    ['Dr. Asha Rao', 'Wound care'],
    ['Daniel Kim, NP', 'Podiatry'],
    ['Meera Iyer, PA', 'Wound care'],
  ].forEach(([name, specialty]) => c.run(name, specialty));

  ['John Carter', 'Maria Lopez', 'Ravi Shah', 'Grace Okafor'].forEach((name) => p.run(name));

  const visits: [number, number, number, string | null][] = [
    [1, 1, 2, 'Stage 2 pressure injury on sacrum. Cleaned, foam dressing applied.'],
    [2, 2, 5, 'Diabetic foot ulcer, left heel. Granulation improving.'],
    [3, 4, 26, null],
    [1, 2, 30, 'Measured wound: 2.1 x 1.4 cm, down from 2.6 x 1.8 cm.'],
    [1, 1, 74, 'Dressing change. Mild exudate, no signs of infection.'],
    [2, 3, 170, 'Initial assessment. Care plan shared with family.'],
  ];
  visits.forEach(([clinicianId, patientId, h, notes]) => v.run(clinicianId, patientId, hoursAgo(h), notes));
});

console.log('Seeded demo data (reset existing rows).');