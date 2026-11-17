-- Reporter-only access for the initial E-IKP rollout.
-- Shared test passwords are for synthetic data and local development only.

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  unit text not null,
  role text not null check (role in ('pelapor', 'karu', 'pmkp')),
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using (id = (select auth.uid()));

alter table public.incident_reports
  alter column created_by set default auth.uid();

drop policy if exists "Reporters can read their own reports" on public.incident_reports;
create policy "Reporters can read their own reports"
on public.incident_reports
for select
to authenticated
using (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'pelapor'
      and profile.unit = incident_reports.room
  )
  and status = 'submitted'
  and receiver_name is null
  and receiver_signature_path is null
  and received_at is null
  and final_grade is null
  and verified_by is null
  and verified_at is null
);

drop policy if exists "Reporters can submit reports for their unit" on public.incident_reports;
create policy "Reporters can submit reports for their unit"
on public.incident_reports
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'pelapor'
      and profile.unit = incident_reports.room
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ikp-attachments',
  'ikp-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Reporters can upload their own attachments" on storage.objects;
create policy "Reporters can upload their own attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ikp-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'pelapor'
  )
);

drop policy if exists "Reporters can read their own attachments" on storage.objects;
create policy "Reporters can read their own attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ikp-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'pelapor'
  )
);

drop policy if exists "Reporters can delete their own attachments" on storage.objects;
create policy "Reporters can delete their own attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ikp-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'pelapor'
  )
);
