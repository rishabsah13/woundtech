import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type NewVisit, type VisitFilters } from './api';

export const useClinicians = () => useQuery({ queryKey: ['clinicians'], queryFn: api.clinicians.list });
export const usePatients = () => useQuery({ queryKey: ['patients'], queryFn: api.patients.list });

export const useVisits = (filters: VisitFilters) =>
  useQuery({
    queryKey: ['visits', filters], // filters in the key: each combination is cached and refetched on change
    queryFn: () => api.visits.list(filters),
    placeholderData: keepPreviousData, // keep showing the old list while the new one loads
  });

export const useCreateClinician = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.clinicians.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinicians'] }),
  });
};

export const useCreatePatient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.patients.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
};

export const useCreateVisit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: NewVisit) => api.visits.create(v),
    // A new visit changes the timeline AND the "last seen" stats on both rosters.
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['visits'] }),
        qc.invalidateQueries({ queryKey: ['patients'] }),
        qc.invalidateQueries({ queryKey: ['clinicians'] }),
      ]),
  });
};