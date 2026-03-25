create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;
alter table public.waitlist_signups force row level security;

revoke all on public.waitlist_signups from anon;
revoke all on public.waitlist_signups from authenticated;
grant insert on public.waitlist_signups to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waitlist_signups'
      and policyname = 'Allow anon waitlist inserts'
  ) then
    create policy "Allow anon waitlist inserts"
      on public.waitlist_signups
      for insert
      to anon
      with check (true);
  end if;
end
$$;
