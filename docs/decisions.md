# Decisions

Each entry: what I chose, why, and what I'd change as the product grows.

## Product and UI

**Design around the coordinator's day, not the tables.** The brief asks for lists and a visits table. I assumed the main user is a care coordinator or clinician who opens this to answer two questions: *what happened recently?* and *who hasn't been seen?* So the screen leads with a summary strip, puts a patient/clinician roster beside a day-grouped timeline instead of two flat tables, and makes logging a visit a few taps in a side sheet rather than a full page.

**Summary strip.** Visits today, visits in the last 7 days, and a count of patients not seen in 7+ days (clicking it filters the roster to just them). These are derived client-side from data already loaded; at real volume this would become one aggregate endpoint instead.

**"Last seen" and an overdue flag.** Wound care typically needs at least weekly visits, so a patient not seen in 7+ days gets an amber "Needs visit" badge. The threshold is one constant (`OVERDUE_DAYS` in `format.ts`); in a real product it would come from each patient's care plan rather than a global default.

**Record-visit sheet, prefilled from the current filter.** If you're looking at John's visits, you're probably logging one for him. Clinician and patient use a searchable combobox rather than a native `<select>`, since that scales once there are hundreds of names. One-tap time chips ("Just now", "30 min ago", "1 hour ago") cover the common case; "Earlier" reveals a full date picker for back-dating.

**Timeline and table, switchable.** The brief allows either representation. The timeline suits "what happened recently"; the table suits scanning and comparing. A toggle offers both instead of picking one.

**Accessibility as a baseline, not an add-on.** shadcn/ui sits on Radix primitives, which handle focus management and keyboard navigation for dialogs, popovers, and toggles. On top of that: explicit accessible names on every control, `role="alert"`/`role="status"` messages, reduced-motion support, and the Atkinson Hyperlegible typeface (designed for low-vision readers).

**Dropped the ⌘K command menu.** I built one using `cmdk`, but hit an unresolved compatibility issue between `cmdk` (1.0.4 and 1.1.1, the two newest versions) and React 19.3 — a store-initialization crash inside the library itself (`Cannot read properties of undefined (reading 'subscribe')`), not in my code. I ruled out duplicate React installs and duplicate `cmdk` installs, and confirmed it reproduces on a clean dependency tree. Rather than burn hours of a 3–6 hour budget chasing a third-party bug against a very recent React version, I cut the feature. The roster's search and filters cover the same need at this scale.

## Back end

| Decision | Why | Tradeoff / later |
| --- | --- | --- |
| SQLite via Node's built-in `node:sqlite`, raw SQL | Nothing to compile, so `npm install` works on any machine with Node 22+. I started with `better-sqlite3`, a native module whose install can fail without a C++ toolchain; the built-in module avoids that entirely | Single writer; `node:sqlite` is still marked experimental in Node 22. Postgres (Neon) for production |
| Repository layer over the DB | All SQL lives in one place; tests run against a fresh `:memory:` database; swapping to Postgres later touches only these files | A few extra files at this size |
| No service layer | No business rules yet beyond existence checks | Add one for scheduling rules, permissions, or overlap validation |
| zod at the API boundary | One schema gives both runtime validation and inferred TypeScript types; unknown fields are stripped automatically | — |
| 400 vs 422 | 400 = malformed request; 422 = well-formed but references a clinician/patient that doesn't exist | — |
| ISO-8601 UTC timestamps | Same-format strings sort correctly as text, and it avoids time-zone bugs between the US and India teams. The API normalises any incoming offset to UTC | — |
| Reject future visit times | A visit log records what happened, not what's scheduled | Scheduling would be a separate concept |
| `ON DELETE RESTRICT`, foreign keys on | Clinical records must never disappear as a side effect of deleting a person | Soft delete + audit log in a real product |
| Composite indexes `(clinician_id, visited_at DESC)` etc. | One index scan serves both the filter and the newest-first sort | Verify against real query plans at scale |
| `createApp(db)` separate from `.listen()` | Lets Supertest exercise the real Express app with no open port | — |

## Front end

| Decision | Why | Tradeoff / later |
| --- | --- | --- |
| TanStack Query for server state | Caching, loading/error states, and cache invalidation without hand-written `useEffect` fetching | One dependency |
| Filters in the query key | Changing a filter refetches automatically; each combination is cached separately | — |
| Invalidate on write, not optimistic updates | Clinical records should show confirmed writes, not a guess that might roll back | Optimistic updates would suit lower-risk actions |
| One `api.ts` for all HTTP | Components never call `fetch` directly; adding auth headers later is a one-file change | Client types are hand-written, not shared with the server |
| shadcn/ui + Tailwind CSS v4 | Accessible Radix primitives, and the component code lives in the repo rather than a black-box dependency, so it can be re-themed freely | Longer class strings; a design-system package if multiple apps shared it |
| No router or global state store | One screen; the little client state that exists lives in `App` | Add a router (and URL-synced filters) as more screens appear |

## Testing

- **API (12 tests):** Supertest against the real Express app, with a fresh in-memory SQLite database created per test via `beforeEach`, so tests never leak state into each other.
- **UI (9 tests):** React Testing Library with `msw` mocking the network, so the real hooks and `api.ts` run end to end. Tests query by role and accessible name, the way a screen reader or a real user would, and the clock is frozen (`vi.useFakeTimers`) so "today" never flips at midnight — a bug I actually hit by running the suite late one night, and fixed by controlling time rather than adding a retry.