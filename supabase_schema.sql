-- =============================================
-- GYMOS - Schema de base de datos para Supabase
-- Correlo en: supabase.com → SQL Editor → New query
-- =============================================

-- TABLA: gyms (un registro por gimnasio)
create table gyms (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  name        text not null,
  city        text,
  phone       text,
  instagram   text,
  plan        text default 'free' check (plan in ('free','pro')),
  owner_id    uuid references auth.users(id) on delete cascade
);

-- TABLA: profiles (un registro por usuario: admin o cliente)
create table profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  created_at  timestamptz default now(),
  full_name   text,
  role        text default 'client' check (role in ('admin','client')),
  gym_id      uuid references gyms(id) on delete cascade,
  routine_id  uuid,
  avatar_url  text
);

-- TABLA: routines
create table routines (
  id             uuid default gen_random_uuid() primary key,
  created_at     timestamptz default now(),
  gym_id         uuid references gyms(id) on delete cascade,
  name           text not null,
  description    text,
  days_per_week  int default 3
);

-- TABLA: exercises (ejercicios dentro de cada rutina)
create table exercises (
  id          uuid default gen_random_uuid() primary key,
  routine_id  uuid references routines(id) on delete cascade,
  name        text not null,
  sets        text,
  reps        text,
  weight      text,
  description text,
  day_label   text,
  order_index int default 0
);

-- TABLA: memberships (estado de pago por cliente)
create table memberships (
  id          uuid default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  client_id   uuid references profiles(id) on delete cascade,
  gym_id      uuid references gyms(id) on delete cascade,
  status      text default 'active' check (status in ('active','pending','overdue')),
  expires_at  date,
  amount      numeric default 0
);

-- TABLA: body_measures (medidas corporales por cliente)
create table body_measures (
  id           uuid default gen_random_uuid() primary key,
  created_at   timestamptz default now(),
  client_id    uuid references profiles(id) on delete cascade,
  weight_kg    numeric,
  body_fat_pct numeric,
  waist_cm     numeric,
  hip_cm       numeric,
  chest_cm     numeric,
  muscle_kg    numeric,
  notes        text
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) - Cada gym solo ve sus datos
-- =============================================

alter table gyms       enable row level security;
alter table profiles   enable row level security;
alter table routines   enable row level security;
alter table exercises  enable row level security;
alter table memberships enable row level security;
alter table body_measures enable row level security;

-- Admins ven su propio gym
create policy "Admin manages own gym" on gyms
  for all using (owner_id = auth.uid());

-- Usuarios ven su propio perfil y los de su gym
create policy "Users see own profile" on profiles
  for select using (id = auth.uid() or gym_id in (
    select id from gyms where owner_id = auth.uid()
  ));

create policy "Admin updates profiles in gym" on profiles
  for update using (gym_id in (
    select id from gyms where owner_id = auth.uid()
  ));

create policy "Users insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Rutinas: el admin de ese gym las gestiona
create policy "Admin manages routines" on routines
  for all using (gym_id in (
    select id from gyms where owner_id = auth.uid()
  ));

create policy "Clients read routines of their gym" on routines
  for select using (gym_id in (
    select gym_id from profiles where id = auth.uid()
  ));

-- Ejercicios
create policy "Admin manages exercises" on exercises
  for all using (routine_id in (
    select id from routines where gym_id in (
      select id from gyms where owner_id = auth.uid()
    )
  ));

create policy "Clients read exercises" on exercises
  for select using (routine_id in (
    select routine_id from profiles where id = auth.uid()
  ));

-- Membresías
create policy "Admin manages memberships" on memberships
  for all using (gym_id in (
    select id from gyms where owner_id = auth.uid()
  ));

-- Medidas corporales
create policy "Clients manage own measures" on body_measures
  for all using (client_id = auth.uid());

create policy "Admin reads client measures" on body_measures
  for select using (client_id in (
    select id from profiles where gym_id in (
      select id from gyms where owner_id = auth.uid()
    )
  ));
