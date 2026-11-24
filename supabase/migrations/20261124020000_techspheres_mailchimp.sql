-- Align the lead table with the atares TechSpheres (Mailchimp) sign-up form
-- and move writes behind the techspheres-signup Edge Function.
alter table public.whitepaper_requests
  add column if not exists salutation text not null default '' check (salutation in ('', 'Mr', 'Ms', 'Mx')),
  add column if not exists first_name text not null default '' check (char_length(first_name) <= 200),
  add column if not exists last_name  text not null default '' check (char_length(last_name) <= 200),
  add column if not exists company    text check (char_length(company) <= 200),
  add column if not exists position   text check (char_length(position) <= 200),
  add column if not exists consent_text text,
  add column if not exists mailchimp_status text not null default 'pending_sync'
    check (mailchimp_status in ('pending_sync', 'pending_confirmation', 'subscribed', 'not_configured', 'error')),
  add column if not exists mailchimp_error text,
  add column if not exists mailchimp_synced_at timestamptz;

-- Carry over rows captured by the first version of the form (full name only).
update public.whitepaper_requests
   set first_name = split_part(trim(full_name), ' ', 1),
       last_name  = coalesce(nullif(trim(substr(trim(full_name), char_length(split_part(trim(full_name), ' ', 1)) + 1)), ''), '-'),
       mailchimp_status = 'not_configured'
 where first_name = '';
alter table public.whitepaper_requests drop column if exists full_name;

alter table public.whitepaper_requests alter column salutation drop default;
alter table public.whitepaper_requests alter column first_name drop default;
alter table public.whitepaper_requests alter column last_name  drop default;
alter table public.whitepaper_requests add constraint whitepaper_requests_names_present
  check (char_length(first_name) > 0 and char_length(last_name) > 0 and salutation <> '') not valid;  -- older rows have no salutation

-- Only the Edge Function (service role) writes now; the public key gets no access.
drop policy if exists "Landing page can submit requests" on public.whitepaper_requests;
revoke all on public.whitepaper_requests from anon, authenticated;
