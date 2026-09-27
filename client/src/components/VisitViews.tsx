import { CalendarX2 } from 'lucide-react';
import type { Visit, VisitFilters } from '@/api';
import { dayKey, dayLabel, formatTime, initials } from '@/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ViewProps {
  visits: Visit[];
  filters: VisitFilters;
  highlightId?: number;
  onSelectPatient: (id: number) => void;
}

/** Group an already newest-first list into consecutive local days. */
function groupByDay(visits: Visit[]) {
  const groups: { key: string; label: string; visits: Visit[] }[] = [];
  for (const v of visits) {
    const key = dayKey(v.visitedAt);
    const last = groups.at(-1);
    if (last?.key === key) last.visits.push(v);
    else groups.push({ key, label: dayLabel(v.visitedAt), visits: [v] });
  }
  return groups;
}

export function VisitTimeline({ visits, filters, highlightId, onSelectPatient }: ViewProps) {
  return (
    <div className="flex flex-col gap-8">
      {groupByDay(visits).map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h3 className="mb-3 flex items-center gap-3 text-sm font-bold text-muted-foreground">
            {day.label}
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="font-normal tabular-nums">{day.visits.length} {day.visits.length === 1 ? 'visit' : 'visits'}</span>
          </h3>
          <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[calc(5.625rem-0.5px)] before:w-px before:bg-border">
            {day.visits.map((v) => (
              <li key={v.id} className="grid grid-cols-[4.5rem_1.5rem_1fr] items-start gap-x-1.5">
                <time dateTime={v.visitedAt} className="pt-3 text-right text-sm font-bold tabular-nums whitespace-nowrap">
                  {formatTime(v.visitedAt)}
                </time>
                <span className="relative z-10 mt-4 size-3 justify-self-center rounded-full border-2 border-card bg-primary ring-2 ring-primary/20" aria-hidden />
                <article
                  className={cn(
                    'rounded-lg border bg-card p-3 transition-colors',
                    v.id === highlightId && 'animate-in fade-in slide-in-from-top-1 border-primary/40 bg-secondary duration-500',
                  )}
                >
                  {!(filters.patientId && filters.clinicianId) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {!filters.patientId && (
                        <button
                          type="button"
                          onClick={() => onSelectPatient(v.patientId)}
                          className="rounded font-bold hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {v.patientName}
                        </button>
                      )}
                      {!filters.clinicianId && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Avatar className="size-5"><AvatarFallback className="bg-secondary text-[0.6rem] font-bold text-secondary-foreground">{initials(v.clinicianName)}</AvatarFallback></Avatar>
                          {v.clinicianName}
                        </span>
                      )}
                    </div>
                  )}
                  <p className={cn('text-sm', v.notes ? 'mt-1 text-foreground/80' : 'text-muted-foreground italic', filters.patientId && filters.clinicianId && 'mt-0')}>
                    {v.notes ?? 'No notes'}
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

const tableDate = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function VisitTable({ visits, highlightId, onSelectPatient }: ViewProps) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">When</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Clinician</TableHead>
            <TableHead className="hidden md:table-cell">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visits.map((v) => (
            <TableRow key={v.id} className={cn(v.id === highlightId && 'bg-secondary')}>
              <TableCell className="tabular-nums"><time dateTime={v.visitedAt}>{tableDate.format(new Date(v.visitedAt))}</time></TableCell>
              <TableCell>
                <button type="button" onClick={() => onSelectPatient(v.patientId)} className="font-bold hover:underline">{v.patientName}</button>
              </TableCell>
              <TableCell>{v.clinicianName}</TableCell>
              <TableCell className="hidden max-w-[28ch] truncate text-muted-foreground md:table-cell" title={v.notes ?? undefined}>
                {v.notes ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function VisitsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading visits">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="ml-20 h-16" />)}
    </div>
  );
}

export function VisitsEmpty({ filtered }: { filtered: boolean }) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon"><CalendarX2 /></EmptyMedia>
        <EmptyTitle>{filtered ? 'No visits for this filter' : 'No visits recorded yet'}</EmptyTitle>
        <EmptyDescription>Use “Record visit” to log one.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}