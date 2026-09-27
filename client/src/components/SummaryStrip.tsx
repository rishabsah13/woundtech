import { CalendarCheck, CalendarRange, TriangleAlert } from 'lucide-react';
import { usePatients, useVisits } from '@/hooks';
import { isOverdue, isSameLocalDay, isWithinDays, OVERDUE_DAYS } from '@/format';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  onShowNeedsVisit: () => void;
}

/**
 * Three numbers a coordinator checks first. Computed client-side from data we already load;
 * with real volumes these would come from an aggregate endpoint.
 */
export function SummaryStrip({ onShowNeedsVisit }: Props) {
  const visits = useVisits({});
  const patients = usePatients();

  const today = visits.data?.filter((v) => isSameLocalDay(v.visitedAt)).length;
  const week = visits.data?.filter((v) => isWithinDays(v.visitedAt, 7)).length;
  const needsVisit = patients.data?.filter((p) => isOverdue(p.lastVisitAt)).length;

  return (
    <section
      aria-label="Summary"
      className="grid grid-cols-3 divide-x rounded-xl border bg-card"
    >
      <Stat icon={CalendarCheck} label="Visits today" value={today} />
      <Stat icon={CalendarRange} label="Visits in the last 7 days" value={week} />
      <button
        type="button"
        onClick={onShowNeedsVisit}
        disabled={!needsVisit}
        aria-label={`Show ${needsVisit ?? 0} ${needsVisit === 1 ? 'patient' : 'patients'} not seen in ${OVERDUE_DAYS}+ days`}
        className="text-left transition-colors hover:bg-warning-soft/60 focus-visible:outline-2 focus-visible:outline-ring disabled:hover:bg-transparent rounded-r-xl"
      >
        <Stat
          icon={TriangleAlert}
          label={`Patients not seen in ${OVERDUE_DAYS}+ days`}
          value={needsVisit}
          tone={needsVisit ? 'warning' : 'default'}
          hint={needsVisit ? 'Show them' : undefined}
        />
      </button>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'default',
  hint,
}: {
  icon: typeof CalendarCheck;
  label: string;
  value: number | undefined;
  tone?: 'default' | 'warning';
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-3 py-3 sm:px-5 sm:py-4">
      <span
        className={cn(
          'hidden size-10 shrink-0 place-items-center rounded-full sm:grid',
          tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-secondary text-primary',
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        {value === undefined ? (
          <Skeleton className="h-7 w-10" />
        ) : (
          <p className={cn('text-2xl font-bold tabular-nums', tone === 'warning' && 'text-warning')}>{value}</p>
        )}
        <p className="text-xs text-muted-foreground sm:text-sm">
          {label}
          {hint && <span className="ml-2 hidden font-bold text-warning underline underline-offset-2 sm:inline">{hint}</span>}
        </p>
      </div>
    </div>
  );
}