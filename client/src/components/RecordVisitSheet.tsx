import { useState, type FormEvent } from 'react';
import { errorText, type Visit } from '@/api';
import { useClinicians, useCreateVisit, usePatients } from '@/hooks';
import { toDatetimeLocal } from '@/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PersonCombobox } from './PersonCombobox';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClinicianId?: number;
  defaultPatientId?: number;
  onSaved: (visit: Visit) => void;
}

export function RecordVisitSheet({ open, onOpenChange, ...rest }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Record a visit</SheetTitle>
          <SheetDescription>Log a completed visit. It appears at the top of the timeline.</SheetDescription>
        </SheetHeader>
        {/* Mounted only while open, so every opening starts from fresh defaults. */}
        {open && <VisitForm {...rest} onCancel={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

/** Most visits are logged right after they happen, so offer one-tap times and keep "custom" for back-dating. */
const QUICK_TIMES = [
  { value: 'now', label: 'Just now', minutes: 0 },
  { value: '30m', label: '30 min ago', minutes: 30 },
  { value: '1h', label: '1 hour ago', minutes: 60 },
  { value: 'custom', label: 'Earlier', minutes: null },
] as const;
type QuickTime = (typeof QUICK_TIMES)[number]['value'];

function VisitForm({ defaultClinicianId, defaultPatientId, onSaved, onCancel }: Omit<Props, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const clinicians = useClinicians();
  const patients = usePatients();
  const createVisit = useCreateVisit();

  // Prefilled from the current filter: if you're looking at John's visits, you're probably logging one for John.
  const [patientId, setPatientId] = useState(defaultPatientId);
  const [clinicianId, setClinicianId] = useState(defaultClinicianId);
  const [quick, setQuick] = useState<QuickTime>('now');
  const [custom, setCustom] = useState(() => toDatetimeLocal());
  const [notes, setNotes] = useState('');

  const canSave = patientId !== undefined && clinicianId !== undefined && (quick !== 'custom' || custom !== '') && !createVisit.isPending;

  function visitedAtIso() {
    const q = QUICK_TIMES.find((t) => t.value === quick)!;
    if (q.minutes === null) return new Date(custom).toISOString(); // local input -> UTC
    return new Date(Date.now() - q.minutes * 60_000).toISOString();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (patientId === undefined || clinicianId === undefined) return;
    createVisit.mutate(
      { patientId, clinicianId, visitedAt: visitedAtIso(), notes: notes.trim() || undefined },
      { onSuccess: onSaved },
    );
  }

  return (
    <form onSubmit={submit} aria-label="Record a visit" className="flex flex-1 flex-col overflow-y-auto">
      <div className="grid gap-5 p-4">
        <div className="grid gap-2">
          <Label htmlFor="visit-patient">Patient</Label>
          <PersonCombobox
            id="visit-patient"
            options={patients.data ?? []}
            value={patientId}
            onChange={setPatientId}
            placeholder="Choose a patient"
            searchPlaceholder="Search patients"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="visit-clinician">Clinician</Label>
          <PersonCombobox
            id="visit-clinician"
            options={(clinicians.data ?? []).map((c) => ({ id: c.id, name: c.name, hint: c.specialty ?? undefined }))}
            value={clinicianId}
            onChange={setClinicianId}
            placeholder="Choose a clinician"
            searchPlaceholder="Search clinicians"
          />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">When</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            value={quick}
            onValueChange={(v) => v && setQuick(v as QuickTime)}
            className="w-full flex-wrap"
          >
            {QUICK_TIMES.map((t) => (
              <ToggleGroupItem key={t.value} value={t.value} className="flex-1 data-[state=on]:bg-secondary data-[state=on]:text-primary">
                {t.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {quick === 'custom' && (
            <Input
              type="datetime-local"
              aria-label="Visit date and time"
              value={custom}
              max={toDatetimeLocal()}
              onChange={(e) => setCustom(e.target.value)}
              required
            />
          )}
        </fieldset>

        <div className="grid gap-2">
          <Label htmlFor="visit-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea
            id="visit-notes"
            rows={5}
            maxLength={2000}
            placeholder="Wound size, dressing used, next steps"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">{notes.length}/2000</p>
        </div>

        {createVisit.isError && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorText(createVisit.error)}
          </p>
        )}
      </div>

      <SheetFooter className="mt-auto flex-row justify-end border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!canSave}>{createVisit.isPending ? 'Saving…' : 'Save visit'}</Button>
      </SheetFooter>
    </form>
  );
}