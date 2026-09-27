import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Option { id: number; name: string; hint?: string }

interface Props {
  id: string;
  options: Option[];
  value?: number;
  onChange: (id: number) => void;
  placeholder: string;
  searchPlaceholder: string;
}

/** shadcn's combobox pattern: a Popover holding a searchable Command list. Scales better than a native select. */
export function PersonCombobox({ id, options, value, onChange, placeholder, searchPlaceholder }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground')}
        >
          <span className="truncate">{selected?.name ?? placeholder}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`${o.name} ${o.id}`}
                  onSelect={() => { onChange(o.id); setOpen(false); }}
                >
                  <span className="flex-1 truncate">{o.name}</span>
                  {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                  <Check className={cn('ml-1', o.id === value ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}