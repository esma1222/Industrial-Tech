-- The techspheres-signup Edge Function uses the service role; it needs table access.
grant select, insert, update, delete on public.whitepaper_requests to service_role;
