-- Leads captured by the Industrial Tech M&A 2026 whitepaper landing page.
create table if not exists public.whitepaper_requests (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  full_name        text not null check (char_length(full_name) between 1 and 200),
  email            text not null check (char_length(email) <= 320 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  newsletter_opt_in boolean not null default false,
  source           text not null default 'Industrial Tech M&A 2026 Whitepaper' check (char_length(source) <= 200),
  language         text not null default 'en' check (language in ('en', 'de')),
  page_url         text check (char_length(page_url) <= 2000)
);

create index if not exists whitepaper_requests_email_idx on public.whitepaper_requests (lower(email));
create index if not exists whitepaper_requests_created_at_idx on public.whitepaper_requests (created_at desc);

-- The page writes with the publishable (anon) key: allow INSERT only, never read back.
alter table public.whitepaper_requests enable row level security;

revoke all on public.whitepaper_requests from anon, authenticated;
grant insert (full_name, email, newsletter_opt_in, source, language, page_url)
  on public.whitepaper_requests to anon, authenticated;

drop policy if exists "Landing page can submit requests" on public.whitepaper_requests;
create policy "Landing page can submit requests"
  on public.whitepaper_requests
  for insert
  to anon, authenticated
  with check (true);
