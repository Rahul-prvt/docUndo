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
  license_verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists clinics (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references doctors(id) on delete cascade,
  name text,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  opening_hours text,
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
