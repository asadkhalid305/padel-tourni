create table public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email <> ''),
  display_name text not null default '',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create index app_users_role_idx on public.app_users(role);

create trigger app_users_set_updated_at
before update on public.app_users
for each row execute function app_private.set_updated_at();

alter table public.app_users enable row level security;

revoke all on table public.app_users from anon, authenticated;
grant all on table public.app_users to service_role;
