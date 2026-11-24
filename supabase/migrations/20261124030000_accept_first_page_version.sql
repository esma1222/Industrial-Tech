-- Keep the first version of the page (still live on Vercel) working.
-- It inserts {full_name, email, newsletter_opt_in, source, language, page_url}
-- straight into the table with the publishable key. These rows are split into
-- first/last name and forwarded to the techspheres-signup function for Mailchimp.
create extension if not exists pg_net with schema extensions;

alter table public.whitepaper_requests add column if not exists full_name text
  check (char_length(full_name) <= 200);

alter table public.whitepaper_requests drop constraint if exists whitepaper_requests_names_present;
alter table public.whitepaper_requests add constraint whitepaper_requests_names_present
  check (char_length(first_name) > 0 and char_length(last_name) > 0
         and (salutation <> '' or full_name is not null)) not valid;

create or replace function public.whitepaper_requests_split_full_name()
returns trigger language plpgsql set search_path = '' as $$
declare n text := btrim(coalesce(new.full_name, ''));
begin
  if new.full_name is not null and coalesce(new.first_name, '') = '' then
    if n = '' then raise exception 'full_name is empty'; end if;
    new.first_name := split_part(n, ' ', 1);
    new.last_name  := coalesce(nullif(btrim(substr(n, char_length(split_part(n, ' ', 1)) + 1)), ''), '-');
    new.salutation := coalesce(new.salutation, '');
    new.consent_text := coalesce(new.consent_text,
      'I would like to subscribe to TechSphere and receive technology M&A insights, market updates and research from atares.');
  end if;
  return new;
end $$;

drop trigger if exists split_full_name on public.whitepaper_requests;
create trigger split_full_name before insert on public.whitepaper_requests
  for each row execute function public.whitepaper_requests_split_full_name();

create or replace function public.whitepaper_requests_forward_to_mailchimp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://abzzpobaifjmrxatvtry.supabase.co/functions/v1/techspheres-signup',
    body := jsonb_build_object('sync_id', new.id),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return null;
end $$;
revoke execute on function public.whitepaper_requests_forward_to_mailchimp() from public, anon, authenticated;

drop trigger if exists forward_to_mailchimp on public.whitepaper_requests;
create trigger forward_to_mailchimp after insert on public.whitepaper_requests
  for each row when (new.full_name is not null)
  execute function public.whitepaper_requests_forward_to_mailchimp();

-- The first page version may insert, only with the subscription ticked.
grant insert (full_name, email, newsletter_opt_in, source, language, page_url)
  on public.whitepaper_requests to anon;
drop policy if exists "First page version can submit subscribed requests" on public.whitepaper_requests;
create policy "First page version can submit subscribed requests"
  on public.whitepaper_requests for insert to anon
  with check (newsletter_opt_in = true and full_name is not null);
