-- =============================================================
-- DoctorUndo MVP — Database Schema
-- Safe to re-run: all statements use IF NOT EXISTS guards
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLES (create only if they don't already exist)
-- ─────────────────────────────────────────────────────────────

create table if not exists doctors (
  id              uuid primary key default gen_random_uuid(),
  auth_user_id    uuid references auth.users(id) on delete cascade,
  email           text,
  name            text not null,
  specialty       text not null,
  license_no      text not null unique,
  license_verified boolean default false,
  bio             text,
  consult_fee     numeric,
  admin_notes     text,
  available_days  text[] default '{}',
  languages       text[] default '{"English"}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists clinics (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid references doctors(id) on delete cascade not null,
  name          text,
  address       text,
  lat           double precision,
  lng           double precision,
  opening_hours text,
  phone         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists availability (
  doctor_id  uuid primary key references doctors(id) on delete cascade,
  available  boolean default false,
  updated_at timestamptz default now()
);

create table if not exists symptom_logs (
  id                 uuid primary key default gen_random_uuid(),
  patient_session    text,
  symptoms_text      text not null,
  suggested_specialty text,
  ai_available       boolean,
  created_at         timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. COLUMNS (add only if the column doesn't already exist)
--    Safe to re-run on existing databases.
-- ─────────────────────────────────────────────────────────────

-- doctors
alter table doctors add column if not exists auth_user_id    uuid references auth.users(id) on delete cascade;
alter table doctors add column if not exists email           text;
alter table doctors add column if not exists license_verified boolean default false;
alter table doctors add column if not exists bio             text;
alter table doctors add column if not exists consult_fee     numeric;
alter table doctors add column if not exists admin_notes     text;
alter table doctors add column if not exists available_days  text[] default '{}';
alter table doctors add column if not exists languages       text[] default '{"English"}';
alter table doctors add column if not exists created_at      timestamptz default now();
alter table doctors add column if not exists updated_at      timestamptz default now();

-- clinics (address/lat/lng now nullable to allow stub rows)
alter table clinics add column if not exists name          text;
alter table clinics add column if not exists address       text;
alter table clinics add column if not exists lat           double precision;
alter table clinics add column if not exists lng           double precision;
alter table clinics add column if not exists opening_hours text;
alter table clinics add column if not exists phone         text;
alter table clinics add column if not exists created_at    timestamptz default now();
alter table clinics add column if not exists updated_at    timestamptz default now();

-- availability
alter table availability add column if not exists updated_at timestamptz default now();

-- symptom_logs
alter table symptom_logs add column if not exists patient_session     text;
alter table symptom_logs add column if not exists suggested_specialty text;
alter table symptom_logs add column if not exists ai_available        boolean;

-- ─────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_doctors_specialty       on doctors(specialty);
create index if not exists idx_doctors_license_verified on doctors(license_verified);
create index if not exists idx_clinics_doctor_id       on clinics(doctor_id);
create index if not exists idx_clinics_location        on clinics using gist(ll_to_earth(lat, lng))
  where lat is not null and lng is not null;
create index if not exists idx_availability_available  on availability(available);

-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

alter table doctors      enable row level security;
alter table clinics      enable row level security;
alter table availability enable row level security;
alter table symptom_logs enable row level security;

-- doctors: public read, self write
drop policy if exists "doctors_self_read"   on doctors;
drop policy if exists "doctors_self_update" on doctors;
drop policy if exists "doctors_self_insert" on doctors;

create policy "doctors_self_read" on doctors for select
  using (true);

create policy "doctors_self_update" on doctors for update
  using (auth_user_id = auth.uid());

create policy "doctors_self_insert" on doctors for insert
  with check (auth_user_id = auth.uid());

-- clinics: public read, self write
drop policy if exists "clinics_self_read"   on clinics;
drop policy if exists "clinics_self_manage" on clinics;
drop policy if exists "clinics_self_insert" on clinics;

create policy "clinics_self_read" on clinics for select
  using (true);

create policy "clinics_self_manage" on clinics for update
  using (doctor_id in (select id from doctors where auth_user_id = auth.uid()));

create policy "clinics_self_insert" on clinics for insert
  with check (doctor_id in (select id from doctors where auth_user_id = auth.uid()));

-- availability: public read, self write
drop policy if exists "availability_self_read"   on availability;
drop policy if exists "availability_self_manage" on availability;
drop policy if exists "availability_self_insert" on availability;

create policy "availability_self_read" on availability for select
  using (true);

create policy "availability_self_manage" on availability for update
  using (doctor_id in (select id from doctors where auth_user_id = auth.uid()));

create policy "availability_self_insert" on availability for insert
  with check (doctor_id in (select id from doctors where auth_user_id = auth.uid()));

-- symptom_logs: public read only
drop policy if exists "symptom_logs_public_read" on symptom_logs;

create policy "symptom_logs_public_read" on symptom_logs for select
  using (true);
