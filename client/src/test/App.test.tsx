import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from '@/App';
import { BASE, server, visits } from './server';

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); // fresh cache per test
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

const roster = () => screen.getByRole('navigation', { name: 'People' });

describe('Visit log', () => {
  it('groups visits by day, newest first', async () => {
    renderApp();
    const today = await screen.findByRole('region', { name: 'Today' });
    expect(within(today).getByText('John Carter')).toBeInTheDocument();
    expect(within(today).getByText('Dressing changed')).toBeInTheDocument();
    const days = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(days[0]).toMatch(/^Today/);
    expect(days).toHaveLength(2);
  });

  it('filters by the selected patient and clears with the chip', async () => {
    const requested: (string | null)[] = [];
    server.use(
      http.get(`${BASE}/visits`, ({ request }) => {
        requested.push(new URL(request.url).searchParams.get('patientId'));
        return HttpResponse.json(visits);
      }),
    );
    const user = userEvent.setup();
    renderApp();

    await user.click(await within(roster()).findByRole('button', { name: /john carter/i }));
    expect(await screen.findByRole('heading', { level: 2, name: 'John Carter' })).toBeInTheDocument();
    expect(requested).toContain('1');

    await user.click(screen.getByRole('button', { name: /remove filter patient: john carter/i }));
    expect(await screen.findByRole('heading', { level: 2, name: 'All visits' })).toBeInTheDocument();
  });

    it('summarises today, the week, and patients needing a visit', async () => {
    renderApp();
    const summary = screen.getByRole('region', { name: 'Summary' });
    expect(await within(summary).findByText('Visits today')).toBeInTheDocument();
    await within(summary).findByRole('button', { name: /show 1 patient/i });
  });

  it('flags patients not seen in over a week and can show only them', async () => {
    const user = userEvent.setup();
    renderApp();
    const maria = await within(roster()).findByRole('button', { name: /maria lopez/i });
    expect(maria).toHaveTextContent(/needs visit/i);

    await user.click(within(roster()).getByRole('button', { name: 'Show only patients who need a visit' }));
    expect(within(roster()).queryByRole('button', { name: /john carter/i })).not.toBeInTheDocument();
    expect(within(roster()).getByRole('button', { name: /maria lopez/i })).toBeInTheDocument();
  });

  it('searches the roster', async () => {
    const user = userEvent.setup();
    renderApp();
    await within(roster()).findByRole('button', { name: /john carter/i });
    await user.type(within(roster()).getByRole('searchbox', { name: /search patients/i }), 'mar');
    expect(within(roster()).getByRole('button', { name: /maria lopez/i })).toBeInTheDocument();
    expect(within(roster()).queryByRole('button', { name: /john carter/i })).not.toBeInTheDocument();
  });

  it('switches between timeline and table views', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole('region', { name: 'Today' });
    await user.click(screen.getByRole('radio', { name: 'Table view' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2
  });

  it('records a visit prefilled from the filter, sending UTC time', async () => {
    let posted: Record<string, unknown> | undefined;
    server.use(
      http.post(`${BASE}/visits`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(visits[0], { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp();

    await user.click(await within(roster()).findByRole('button', { name: /john carter/i }));
    await user.click(screen.getByRole('button', { name: /record visit/i }));

    const form = await screen.findByRole('form', { name: 'Record a visit' });
    expect(within(form).getByRole('combobox', { name: 'Patient' })).toHaveTextContent('John Carter');
    const save = within(form).getByRole('button', { name: 'Save visit' });
    expect(save).toBeDisabled(); // clinician still missing

    await user.click(within(form).getByRole('combobox', { name: 'Clinician' }));
    await user.click(await screen.findByRole('option', { name: /dr\. asha rao/i }));
    await user.click(within(form).getByRole('radio', { name: '30 min ago' }));
    await user.type(within(form).getByLabelText(/notes/i), 'Foam dressing applied');
    await user.click(save);

    expect(await screen.findByText('Visit saved')).toBeInTheDocument();
    expect(posted).toMatchObject({ patientId: 1, clinicianId: 1, notes: 'Foam dressing applied' });
    const sentMinutesAgo = (Date.now() - new Date(String(posted?.visitedAt)).getTime()) / 60_000;
    expect(String(posted?.visitedAt)).toMatch(/Z$/);
    expect(Math.round(sentMinutesAgo)).toBe(30);
  });

  it('shows the server error when saving fails', async () => {
    server.use(http.post(`${BASE}/visits`, () => HttpResponse.json({ error: 'Patient does not exist' }, { status: 422 })));
    const user = userEvent.setup();
    renderApp();
    await within(roster()).findByRole('button', { name: /john carter/i });
    await user.click(screen.getByRole('button', { name: /record visit/i }));
    const form = await screen.findByRole('form', { name: 'Record a visit' });

    await user.click(within(form).getByRole('combobox', { name: 'Patient' }));
    await user.click(await screen.findByRole('option', { name: /john carter/i }));
    await user.click(within(form).getByRole('combobox', { name: 'Clinician' }));
    await user.click(await screen.findByRole('option', { name: /dr\. asha rao/i }));
    await user.click(within(form).getByRole('button', { name: 'Save visit' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent('Patient does not exist');
  });

  it('explains when the visits request fails', async () => {
    server.use(http.get(`${BASE}/visits`, () => HttpResponse.json({ error: 'Database unavailable' }, { status: 500 })));
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
  });
});