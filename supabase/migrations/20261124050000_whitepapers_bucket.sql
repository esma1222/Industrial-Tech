-- Public bucket for the whitepaper PDF (served via its unguessable object URL;
-- no listing policy, no public upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whitepapers', 'whitepapers', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;
