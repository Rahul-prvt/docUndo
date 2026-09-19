create extension if not exists "uuid-ossp";

create table if not exists doctors (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password text not null,
  name text not null,
  specialty text not null,
  license_no text not null,
  bio text,
  consult_fee numeric,
  available_days text[] not null default '{}',
  languages text[] not null default '{}',
  license_verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists clinics (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  name text,
  address text,
  lat double precision,
  lng double precision,
  opening_hours text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists availability (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null unique references doctors(id) on delete cascade,
  available boolean not null default false,
  updated_at timestamptz default now()
);

create index if not exists idx_clinics_doctor_id on clinics(doctor_id);
create index if not exists idx_doctors_specialty on doctors(specialty);

alter table doctors add column if not exists available_days text[] not null default '{}';
alter table doctors add column if not exists languages text[] not null default '{}';
alter table clinics add column if not exists phone text;
alter table clinics alter column address drop not null;
alter table clinics alter column lat drop not null;
alter table clinics alter column lng drop not null;
