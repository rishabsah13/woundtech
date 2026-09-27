export interface Clinician {
  id: number;
  name: string;
  specialty: string | null;
  visitCount: number;
  lastVisitAt: string | null;
}
export interface Patient {
  id: number;
  name: string;
  visitCount: number;
  lastVisitAt: string | null;
}
export interface Visit {
  id: number;
  visitedAt: string;
  notes: string | null;
  clinicianId: number;
  clinicianName: string;
  patientId: number;
  patientName: string;
}
export interface VisitFilters {
  clinicianId?: number;
  patientId?: number;
}
export interface NewVisit {
  clinicianId: number;
  patientId: number;
  visitedAt: string;
  notes?: string;
}

interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: FieldError[];
  constructor(status: number, message: string, details: FieldError[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that the API is running.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`, body?.details);
  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(data) });

export const api = {
  clinicians: {
    list: () => request<Clinician[]>('/clinicians'),
    create: (input: { name: string; specialty?: string }) => post<Clinician>('/clinicians', input),
  },
  patients: {
    list: () => request<Patient[]>('/patients'),
    create: (input: { name: string }) => post<Patient>('/patients', input),
  },
  visits: {
    list: (f: VisitFilters) => {
      const qs = new URLSearchParams();
      if (f.clinicianId) qs.set('clinicianId', String(f.clinicianId));
      if (f.patientId) qs.set('patientId', String(f.patientId));
      const q = qs.toString();
      return request<Visit[]>(`/visits${q ? `?${q}` : ''}`);
    },
    create: (v: NewVisit) => post<Visit>('/visits', v),
  },
};

export function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Something went wrong. Try again.';
  if (!e.details.length) return e.message;
  return e.details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('. ');
}