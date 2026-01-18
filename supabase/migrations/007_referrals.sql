-- ============================================================
-- 007_referrals.sql
-- Invites + referral progress + entitlements overlay
-- ============================================================

-- 1) Invite tokens
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'created' check (status in ('created','opened','accepted','expired')),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index if not exists idx_invites_inviter on public.invites(inviter_user_id, created_at desc);
create index if not exists idx_invites_invitee on public.invites(invitee_user_id, created_at desc);
create index if not exists idx_invites_status on public.invites(status, expires_at);

-- 2) Referral progress (counts "activated" invitees)
create table if not exists public.referral_progress (
  inviter_user_id uuid primary key references auth.users(id) on delete cascade,
  activated_invitees_count int not null default 0,
  last_activated_at timestamptz,
  reward_granted_at timestamptz
);

-- 3) Entitlements overlay (Stripe-safe)
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null, -- 'pro' | 'elite'
  source text not null,      -- 'referral' | 'trial' | 'admin'
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, entitlement, source, expires_at)
);

create index if not exists idx_entitlements_user_expires on public.entitlements(user_id, expires_at desc);

-- 4) Track which invite triggered activation (prevent double-count)
create table if not exists public.invite_activations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid references public.invites(id) on delete set null,
  activated_at timestamptz not null default now(),
  unique (inviter_user_id, invitee_user_id)
);

-- RLS (keep tight)
alter table public.invites enable row level security;
alter table public.referral_progress enable row level security;
alter table public.entitlements enable row level security;
alter table public.invite_activations enable row level security;

-- Invites: inviter can read their own
drop policy if exists "inviter can read invites" on public.invites;
create policy "inviter can read invites"
on public.invites for select
using (auth.uid() = inviter_user_id);

-- Invites: inviter can create
drop policy if exists "inviter can create invites" on public.invites;
create policy "inviter can create invites"
on public.invites for insert
with check (auth.uid() = inviter_user_id);

-- Progress: user can read own progress
drop policy if exists "user can read referral progress" on public.referral_progress;
create policy "user can read referral progress"
on public.referral_progress for select
using (auth.uid() = inviter_user_id);

-- Entitlements: user can read own entitlements
drop policy if exists "user can read own entitlements" on public.entitlements;
create policy "user can read own entitlements"
on public.entitlements for select
using (auth.uid() = user_id);

-- PostgreSQL function to safely increment referral progress
create or replace function increment_referral_progress(p_inviter_user_id uuid)
returns void as $$
begin
  insert into public.referral_progress (inviter_user_id, activated_invitees_count, last_activated_at)
  values (p_inviter_user_id, 1, now())
  on conflict (inviter_user_id) do update
  set 
    activated_invitees_count = public.referral_progress.activated_invitees_count + 1,
    last_activated_at = now();
end;
$$ language plpgsql security definer;

select 'Referral tables ready: invites, referral_progress, entitlements, invite_activations' as status;
