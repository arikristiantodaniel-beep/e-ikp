-- E-IKP initial database schema.
-- Row Level Security is enabled with no client policies yet: browser/API access
-- remains denied until authentication and role-specific policies are configured.

do $$
begin
  create type public.ikp_grade as enum ('BIRU', 'HIJAU', 'KUNING', 'MERAH');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.ikp_report_status as enum (
    'draft',
    'submitted',
    'investigating',
    'completed',
    'rejected'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.incident_reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique default (
    'IKP-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') ||
    '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  reported_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,

  patient_name text not null,
  medical_record_number text not null,
  room text not null,
  patient_age text not null,
  age_group text not null,
  gender text not null check (gender in ('Laki-laki', 'Perempuan')),
  payer text not null,

  incident_date date not null,
  incident_time time not null,
  incident_summary text not null,
  chronology text not null,
  incident_type text not null check (
    incident_type in ('KPC', 'KNC', 'KTC', 'KTD', 'Sentinel')
  ),
  related_service text not null,
  impact text not null,
  probability text not null,
  first_reporter text not null,
  incident_concerns text not null,
  incident_location text not null,
  responsible_department text not null,
  immediate_action text not null,
  action_taken_by text not null,
  happened_before boolean not null,
  previous_prevention text,

  reporter_name text not null,
  reporter_signature_path text,
  initial_grade public.ikp_grade,
  receiver_name text,
  receiver_signature_path text,
  received_at date,
  status public.ikp_report_status not null default 'draft',
  attachment_path text,
  final_grade public.ikp_grade,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ikp_investigations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.incident_reports(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,

  timeline text not null,
  problem text not null,
  immediate_cause text not null,
  root_cause text not null,
  contributor_component text not null,
  contributor_subcomponent text not null,
  action_taken text not null,
  action_owner text not null,
  action_date date not null,
  recommendation_short_term text not null,
  recommendation_medium_term text not null,
  recommendation_long_term text not null,

  manager_name text not null,
  investigation_start_date date not null,
  investigation_end_date date,
  manager_signature_path text,
  investigation_complete boolean,
  needs_further_investigation boolean,
  revised_grade public.ikp_grade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incident_reports_reported_at_idx
  on public.incident_reports (reported_at desc);
create index if not exists incident_reports_status_idx
  on public.incident_reports (status);
create index if not exists incident_reports_room_idx
  on public.incident_reports (room);
create index if not exists incident_reports_grade_idx
  on public.incident_reports (final_grade, initial_grade);
create index if not exists ikp_investigations_report_id_idx
  on public.ikp_investigations (report_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists incident_reports_set_updated_at on public.incident_reports;
create trigger incident_reports_set_updated_at
before update on public.incident_reports
for each row execute function public.set_updated_at();

drop trigger if exists ikp_investigations_set_updated_at on public.ikp_investigations;
create trigger ikp_investigations_set_updated_at
before update on public.ikp_investigations
for each row execute function public.set_updated_at();

alter table public.incident_reports enable row level security;
alter table public.ikp_investigations enable row level security;

comment on table public.incident_reports is
  'Confidential patient safety incident reports. Keep RLS enabled.';
comment on column public.incident_reports.medical_record_number is
  'Sensitive patient identifier; restrict access to authorized staff only.';
comment on column public.incident_reports.attachment_path is
  'Object path in a private Supabase Storage bucket, never a public URL.';
comment on table public.ikp_investigations is
  'Confidential follow-up investigations for patient safety incident reports.';
