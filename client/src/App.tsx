import { useState } from 'react';
import { LayoutList, Plus, Table2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Visit, VisitFilters } from '@/api';
import { errorText } from '@/api';
import { useClinicians, usePatients, useVisits } from '@/hooks';
import { initials, isOverdue, OVERDUE_DAYS, relativeTime } from '@/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RecordVisitSheet } from '@/components/RecordVisitSheet';
import { Roster, type RosterKind } from '@/components/Roster';
import { SummaryStrip } from '@/components/SummaryStrip';
import { VisitsEmpty, VisitsSkeleton, VisitTable, VisitTimeline } from '@/components/VisitViews';

type View = 'timeline' | 'table';

export default function App() {
  const [tab, setTab] = useState<RosterKind>('patients');
  const [filters, setFilters] = useState<VisitFilters>({});
  const [needsVisitOnly, setNeedsVisitOnly] = useState(false);
  const [view, setView] = useState<View>('timeline');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<number>();

  const patients = usePatients();
  const clinicians = useClinicians();
  const visits = useVisits(filters);
  const patient = patients.data?.find((p) => p.id === filters.patientId);
  const clinician = clinicians.data?.find((c) => c.id === filters.clinicianId);
  const filtered = Boolean(filters.patientId || filters.clinicianId);

  /** Clicking a person filters the timeline; clicking them again clears that filter. */
  function toggleFilter(kind: RosterKind, id: number) {
    const key = kind === 'patients' ? 'patientId' : 'clinicianId';
    setFilters((f) => ({ ...f, [key]: f[key] === id ? undefined : id }));
  }
  const showPatient = (id: number) => { setTab('patients'); setFilters((f) => ({ ...f, patientId: id })); };

  function onSaved(visit: Visit) {
    setSheetOpen(false);
    setHighlightId(visit.id);
    toast.success('Visit saved', { description: `${visit.patientName} with ${visit.clinicianName}` });
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-9" />
          <div>
            <h1 className="text-xl leading-tight font-bold">Visit log</h1>
          </div>
        </div>
       
        <Button onClick={() => setSheetOpen(true)}><Plus /> Record visit</Button>
      </header>

      <SummaryStrip onShowNeedsVisit={() => { setTab('patients'); setNeedsVisitOnly(true); }} />

      <div className="grid items-start gap-6 lg:grid-cols-[340px_1fr]">
        <div className="lg:sticky lg:top-6">
          <Roster
            tab={tab}
            onTabChange={setTab}
            selectedId={tab === 'patients' ? filters.patientId : filters.clinicianId}
            onSelect={toggleFilter}
            needsVisitOnly={needsVisitOnly}
            onNeedsVisitOnlyChange={setNeedsVisitOnly}
          />
        </div>

        <main className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-4">
            {patient ? (
              <div className="mr-auto flex items-center gap-3">
                <Avatar className="size-12"><AvatarFallback className="bg-primary font-bold text-primary-foreground">{initials(patient.name)}</AvatarFallback></Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{patient.name}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {patient.visitCount} {patient.visitCount === 1 ? 'visit' : 'visits'}
                    {patient.lastVisitAt && <>, last seen {relativeTime(patient.lastVisitAt)}</>}
                    {isOverdue(patient.lastVisitAt) && (
                      <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">Not seen in {OVERDUE_DAYS}+ days</Badge>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mr-auto">
                <h2 className="text-2xl font-bold">{clinician ? `Visits by ${clinician.name}` : 'All visits'}</h2>
                <p className="text-sm text-muted-foreground">
                  {clinician ? clinician.specialty ?? 'Clinician' : 'Newest first. Select a patient or clinician to filter.'}
                </p>
              </div>
            )}

            <ToggleGroup type="single" variant="outline" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="View">
              <ToggleGroupItem value="timeline" aria-label="Timeline view"><LayoutList /></ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view"><Table2 /></ToggleGroupItem>
            </ToggleGroup>
          </div>

          {filtered && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              {patient && <FilterChip label={`Patient: ${patient.name}`} onRemove={() => setFilters((f) => ({ ...f, patientId: undefined }))} />}
              {clinician && <FilterChip label={`Clinician: ${clinician.name}`} onRemove={() => setFilters((f) => ({ ...f, clinicianId: undefined }))} />}
              <Button variant="link" size="sm" onClick={() => setFilters({})}>Clear all</Button>
            </div>
          )}

          <div aria-busy={visits.isFetching} className={visits.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            {visits.isPending ? <VisitsSkeleton />
              : visits.isError ? <p role="alert" className="text-sm text-destructive">{errorText(visits.error)}</p>
              : visits.data.length === 0 ? <VisitsEmpty filtered={filtered} />
              : view === 'timeline'
                ? <VisitTimeline visits={visits.data} filters={filters} highlightId={highlightId} onSelectPatient={showPatient} />
                : <VisitTable visits={visits.data} filters={filters} highlightId={highlightId} onSelectPatient={showPatient} />}
          </div>
        </main>
      </div>

      <RecordVisitSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        defaultClinicianId={filters.clinicianId}
        defaultPatientId={filters.patientId}
        onSaved={onSaved}
      />
   
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 py-1 pr-1 pl-2.5 text-sm">
      {label}
      <button type="button" onClick={onRemove} className="rounded-full p-0.5 hover:bg-primary/10" aria-label={`Remove filter ${label}`}>
        <X className="size-3.5" />
      </button>
    </Badge>
  );
}