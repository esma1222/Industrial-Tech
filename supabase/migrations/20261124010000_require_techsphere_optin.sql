-- Whitepaper access requires a TechSphere subscription.
drop policy if exists "Landing page can submit requests" on public.whitepaper_requests;
create policy "Landing page can submit requests"
  on public.whitepaper_requests for insert to anon, authenticated
  with check (newsletter_opt_in = true);
