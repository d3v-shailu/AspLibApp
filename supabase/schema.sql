-- ============================================================
-- DLMS — Supabase / PostgreSQL Schema
-- Run this in Supabase SQL Editor (or `psql -f schema.sql`)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- ENUM-ish CHECKS are inline; tables below ----------

-- ============================================================
-- LIBRARIES (tenants)
-- ============================================================
create table if not exists libraries (
  id               uuid primary key default uuid_generate_v4(),
  name             varchar(150) not null,
  address          text,
  phone            varchar(20),
  created_by       uuid,                       -- developer (FK added after users exists)
  status           varchar(20) not null default 'active'
                   check (status in ('active','suspended','archived')),
  latitude         numeric(10,8),              -- geofence center
  longitude        numeric(11,8),              -- geofence center
  radius_meters    int default 100,            -- check-in allowed within this
  geofence_polygon jsonb,                      -- optional polygon [{lat,lng},...]
  advance_booking_days int default 7,          -- how far ahead students can book
  checkin_grace_minutes int default 15,        -- auto-release window
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ============================================================
-- USERS (all roles in one table — backbone of multi-tenancy)
-- ============================================================
create table if not exists users (
  id                  uuid primary key default uuid_generate_v4(),
  email               varchar(150) unique,
  phone               varchar(20) unique,
  password_hash       text not null,
  role                varchar(20) not null check (role in ('developer','admin','student')),
  library_id          uuid references libraries(id) on delete set null, -- NULL for developer
  full_name           varchar(150),
  gender              varchar(10) check (gender in ('male','female','other')),
  photo_url           text,
  must_reset_password boolean default true,
  status              varchar(20) not null default 'active'
                      check (status in ('active','blocked','inactive')),
  created_by          uuid references users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_users_library on users(library_id);
create index if not exists idx_users_role    on users(role);

alter table libraries
  add constraint fk_libraries_created_by
  foreign key (created_by) references users(id) on delete set null;

-- ============================================================
-- SEATS (per library)
-- ============================================================
create table if not exists seats (
  id          uuid primary key default uuid_generate_v4(),
  library_id  uuid not null references libraries(id) on delete cascade,
  seat_number varchar(20) not null,
  zone        varchar(50),                    -- e.g. "Quiet", "Group"
  seat_type   varchar(20) not null default 'standard'
              check (seat_type in ('standard','premium','quiet')),
  status      varchar(20) not null default 'available'
              check (status in ('available','maintenance')),
  created_at  timestamptz default now(),
  unique (library_id, seat_number)
);

create index if not exists idx_seats_library on seats(library_id);

-- ============================================================
-- TIME SLOTS (per library, admin-defined)
-- ============================================================
create table if not exists time_slots (
  id         uuid primary key default uuid_generate_v4(),
  library_id uuid not null references libraries(id) on delete cascade,
  name       varchar(50) not null,            -- "Morning", "Afternoon"
  start_time time not null,
  end_time   time not null,
  price      numeric(10,2) default 0,
  is_active  boolean default true,
  created_at timestamptz default now(),
  check (end_time > start_time)
);

create index if not exists idx_slots_library on time_slots(library_id);

-- ============================================================
-- BOOKINGS (with geo-fence proof)
-- ============================================================
create table if not exists bookings (
  id                uuid primary key default uuid_generate_v4(),
  library_id        uuid not null references libraries(id) on delete cascade,
  student_id        uuid not null references users(id) on delete cascade,
  seat_id           uuid not null references seats(id) on delete cascade,
  slot_id           uuid not null references time_slots(id) on delete cascade,
  booking_date      date not null,
  check_in_at       timestamptz,
  check_out_at      timestamptz,
  status            varchar(20) not null default 'booked'
                    check (status in ('booked','checked_in','completed','no_show','cancelled')),
  -- geo proof
  checkin_lat       numeric(10,8),
  checkin_lng       numeric(11,8),
  checkin_accuracy  numeric(6,2),
  checkin_distance  numeric(8,2),
  checkout_lat      numeric(10,8),
  checkout_lng      numeric(11,8),
  checkout_distance numeric(8,2),
  is_geofence_valid boolean,
  created_at        timestamptz default now()
);

create index if not exists idx_bookings_student     on bookings(student_id);
create index if not exists idx_bookings_library_date on bookings(library_id, booking_date);
create index if not exists idx_bookings_seat_slot   on bookings(seat_id, slot_id, booking_date);

-- Prevent double-booking of the same seat/slot/date
create unique index if not exists uniq_active_booking
  on bookings (seat_id, slot_id, booking_date)
  where status in ('booked','checked_in');

-- Prevent a student holding two active seats in the same slot/date
create unique index if not exists uniq_student_active_booking
  on bookings (student_id, slot_id, booking_date)
  where status in ('booked','checked_in');

-- ============================================================
-- CHECK-IN ATTEMPT LOG (audit — keep rejected attempts too)
-- ============================================================
create table if not exists checkin_attempts (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid references bookings(id) on delete cascade,
  user_id      uuid references users(id) on delete set null,
  kind         varchar(10) not null default 'checkin' check (kind in ('checkin','checkout')),
  lat          numeric(10,8),
  lng          numeric(11,8),
  accuracy     numeric(6,2),
  distance_m   numeric(8,2),
  inside       boolean,
  reason       varchar(100),
  attempted_at timestamptz default now()
);

create index if not exists idx_attempts_booking on checkin_attempts(booking_id);

-- ============================================================
-- WAITLIST (optional feature — slot full → waitlist)
-- ============================================================
create table if not exists waitlist (
  id           uuid primary key default uuid_generate_v4(),
  library_id   uuid not null references libraries(id) on delete cascade,
  student_id   uuid not null references users(id) on delete cascade,
  slot_id      uuid not null references time_slots(id) on delete cascade,
  booking_date date not null,
  status       varchar(20) not null default 'waiting' check (status in ('waiting','notified','converted','cancelled')),
  created_at   timestamptz default now(),
  unique (student_id, slot_id, booking_date)
);

-- ============================================================
-- CHAT CHANNELS + MESSAGES (gender-routed, per library)
-- ============================================================
create table if not exists chat_channels (
  id         uuid primary key default uuid_generate_v4(),
  library_id uuid not null references libraries(id) on delete cascade,
  name       varchar(100) not null,           -- "ABC (Male)"
  gender     varchar(10) not null default 'all' check (gender in ('male','female','all')),
  created_at timestamptz default now()
);

create index if not exists idx_channels_library on chat_channels(library_id);

create table if not exists chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  channel_id uuid not null references chat_channels(id) on delete cascade,
  sender_id  uuid not null references users(id) on delete cascade,
  message    text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_channel on chat_messages(channel_id, created_at desc);

-- ============================================================
-- AUDIT LOG (manual overrides, admin actions)
-- ============================================================
create table if not exists audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references users(id) on delete set null,
  library_id  uuid references libraries(id) on delete cascade,
  action      varchar(100) not null,
  target_type varchar(50),
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_audit_library on audit_logs(library_id, created_at desc);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated on users;
create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_libraries_updated on libraries;
create trigger trg_libraries_updated before update on libraries
  for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY — defense in depth.
-- The Node API connects with the service role / direct Postgres
-- connection (bypasses RLS). These policies DENY all direct
-- anon/authenticated Supabase client access so data can only be
-- reached through the backend.
-- ============================================================
alter table libraries        enable row level security;
alter table users            enable row level security;
alter table seats            enable row level security;
alter table time_slots       enable row level security;
alter table bookings         enable row level security;
alter table checkin_attempts enable row level security;
alter table waitlist         enable row level security;
alter table chat_channels    enable row level security;
alter table chat_messages    enable row level security;
alter table audit_logs       enable row level security;

-- No policies created => deny-by-default for anon/authenticated roles.
-- (service_role and direct connections bypass RLS.)
