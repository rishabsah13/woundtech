import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const BASE = 'http://localhost/api';

/** Tests run at a fixed local time, so "today" never flips at midnight. */
export const NOW = new Date(2026, 8, 24, 15, 0); // 24 Sep 2026, 3 pm local
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

export const clinicians = [
  { id: 1, name: 'Dr. Asha Rao', specialty: 'Wound care', visitCount: 1, lastVisitAt: hoursAgo(1) },
  { id: 2, name: 'Daniel Kim, NP', specialty: null, visitCount: 1, lastVisitAt: hoursAgo(240) },
];
export const patients = [
  { id: 1, name: 'John Carter', visitCount: 1, lastVisitAt: hoursAgo(1) },
  { id: 2, name: 'Maria Lopez', visitCount: 1, lastVisitAt: hoursAgo(240) }, // 10 days: overdue
  { id: 3, name: 'Grace Okafor', visitCount: 0, lastVisitAt: null },
];
export const visits = [
  { id: 2, visitedAt: hoursAgo(1), notes: 'Dressing changed', clinicianId: 1,
    clinicianName: 'Dr. Asha Rao', patientId: 1, patientName: 'John Carter' },
  { id: 1, visitedAt: hoursAgo(240), notes: null, clinicianId: 2,
    clinicianName: 'Daniel Kim, NP', patientId: 2, patientName: 'Maria Lopez' },
];

export const server = setupServer(
  http.get(`${BASE}/clinicians`, () => HttpResponse.json(clinicians)),
  http.get(`${BASE}/patients`, () => HttpResponse.json(patients)),
  http.get(`${BASE}/visits`, () => HttpResponse.json(visits)),
);