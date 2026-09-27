import { useState, type FormEvent } from 'react';
import { Search, TriangleAlert, UserPlus } from 'lucide-react';
import { errorText, type Clinician, type Patient } from '@/api';
import { useClinicians, useCreateClinician, useCreatePatient, usePatients } from '@/hooks';
import { initials, isOverdue, OVERDUE_DAYS, relativeTime } from '@/format';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

export type RosterKind = 'patients' | 'clinicians';

interface Props {
  tab: RosterKind;
  onTabChange: (tab: RosterKind) => void;
  selectedId?: number;
  onSelect: (kind: RosterKind, id: number) => void;
  needsVisitOnly: boolean;
  onNeedsVisitOnlyChange: (on: boolean) => void;
}

export function Roster({ tab, onTabChange, selectedId, onSelect, needsVisitOnly, onNeedsVisitOnlyChange }: Props) {
  const patients = usePatients();
  const clinicians = useClinicians();
  const [search, setSearch] = useState('');
  const query = tab === 'patients' ? patients : clinicians;

  const term = search.trim().toLowerCase();
  const items = (query.data ?? [])
    .filter((p) => p.name.toLowerCase().includes(term))
    .filter((p) => tab === 'clinicians' || !needsVisitOnly || isOverdue(p.lastVisitAt));

  return (
    <nav aria-label="People" className="flex flex-col gap-3 rounded-xl border bg-card p-3">
      <Tabs value={tab} onValueChange={(v) => { onTabChange(v as RosterKind); setSearch(''); }}>
        <TabsList className="w-full">
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="clinicians">Clinicians</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label={`Search ${tab}`}
            placeholder={`Search ${tab}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {tab === 'patients' && (
          <Toggle
            variant="outline"
            pressed={needsVisitOnly}
            onPressedChange={onNeedsVisitOnlyChange}
            aria-label="Show only patients who need a visit"
            title={`Only patients not seen in ${OVERDUE_DAYS}+ days`}
            className="data-[state=on]:border-warning data-[state=on]:bg-warning-soft data-[state=on]:text-warning"
          >
            <TriangleAlert /> Needs visit
          </Toggle>
        )}
      </div>

      {query.isError && <p role="alert" className="px-1 text-sm text-destructive">{errorText(query.error)}</p>}

      <div className="-mx-1 max-h-[min(52vh,480px)] overflow-y-auto">
        <ul className="flex flex-col gap-0.5 px-1">
          {query.isPending &&
            Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
              </li>
            ))}
          {items.map((person) => (
            <li key={person.id}>
              <PersonRow person={person} kind={tab} selected={person.id === selectedId} onSelect={() => onSelect(tab, person.id)} />
            </li>
          ))}
        </ul>
        {query.data && items.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {term ? `No ${tab} match “${search.trim()}”.`
              : needsVisitOnly && tab === 'patients' ? `Every patient has been seen in the last ${OVERDUE_DAYS} days.`
              : `No ${tab} yet.`}
          </p>
        )}
      </div>

      <AddPersonDialog kind={tab} />
    </nav>
  );
}

function PersonRow({ person, kind, selected, onSelect }: {
  person: Patient | Clinician; kind: RosterKind; selected: boolean; onSelect: () => void;
}) {
  const overdue = kind === 'patients' && isOverdue(person.lastVisitAt);
  const specialty = kind === 'clinicians' ? (person as Clinician).specialty : null;
  const meta = kind === 'clinicians'
    ? [specialty, `${person.visitCount} ${person.visitCount === 1 ? 'visit' : 'visits'}`].filter(Boolean).join(', ')
    : person.lastVisitAt ? `Last seen ${relativeTime(person.lastVisitAt)}` : 'No visits yet';

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
        selected && 'bg-secondary ring-1 ring-primary/30 hover:bg-secondary',
      )}
    >
      <Avatar className="size-9">
        <AvatarFallback className={cn('text-xs font-bold', selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
          {initials(person.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{person.name}</span>
        <span className={cn('block truncate text-sm', overdue ? 'text-warning' : 'text-muted-foreground')}>{meta}</span>
      </span>
      {overdue && (
        <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">
          Needs visit<span className="sr-only">: not seen in over {OVERDUE_DAYS} days</span>
        </Badge>
      )}
    </button>
  );
}

function AddPersonDialog({ kind }: { kind: RosterKind }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const createPatient = useCreatePatient();
  const createClinician = useCreateClinician();
  const mutation = kind === 'patients' ? createPatient : createClinician;
  const noun = kind === 'patients' ? 'patient' : 'clinician';

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) { setName(''); setSpecialty(''); mutation.reset(); }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const onSuccess = () => onOpenChange(false); // close only after the save succeeds
    if (kind === 'patients') createPatient.mutate({ name }, { onSuccess });
    else createClinician.mutate({ name, specialty: specialty || undefined }, { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="justify-start text-primary">
          <UserPlus /> Add {noun}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add {noun}</DialogTitle>
            <DialogDescription>
              {kind === 'patients' ? 'They’ll appear in the roster and in the visit form.' : 'They can then be assigned to visits.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="person-name">Full name</Label>
            <Input id="person-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus required />
          </div>
          {kind === 'clinicians' && (
            <div className="grid gap-2">
              <Label htmlFor="person-specialty">Specialty (optional)</Label>
              <Input id="person-specialty" placeholder="Wound care" value={specialty} onChange={(e) => setSpecialty(e.target.value)} maxLength={100} />
            </div>
          )}
          {mutation.isError && <p role="alert" className="text-sm text-destructive">{errorText(mutation.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Adding…' : `Add ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}