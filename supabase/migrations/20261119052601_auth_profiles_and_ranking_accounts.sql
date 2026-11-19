-- 1) profiles: add creation time and email, let the database own the timestamps.
-- The profiles table, its owner-only RLS policies and the on_auth_user_created trigger already exist.

alter table public.profiles add column if not exists created_at timestamptz;
alter table public.profiles add column if not exists email text;

update public.profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
update public.profiles set created_at = now(), updated_at = now() where created_at is null;
update public.profiles set updated_at = now() where updated_at is null;

alter table public.profiles alter column created_at set default now();
alter table public.profiles alter column created_at set not null;
alter table public.profiles alter column updated_at set default now();
alter table public.profiles alter column updated_at set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now());
  return new;
end;
$$;

-- Keeps created_at and email fixed and moves updated_at on every update.
create or replace function public.profiles_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.email := old.email;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.profiles_touch() from public, anon, authenticated;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- 2) ranking: participants belong to an Auth user; scripts submit with a personal token.

alter table public.ranking_participants
  add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
alter table public.ranking_participants alter column secret_hash drop not null;

create table if not exists public.ranking_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.ranking_tokens enable row level security;
revoke all on public.ranking_tokens from anon, authenticated;

-- Anonymous nickname + secret registration is replaced by account tokens.
drop function if exists public.ranking_submit(text, text, jsonb);

-- Internal helper lives outside the exposed schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.ranking_upsert_days(p_participant uuid, p_days jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  d jsonb;
begin
  for d in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb)) loop
    insert into ranking_daily_usage as u (
      participant_id, day, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens,
      sessions, messages, active_minutes, tool_calls, skill_calls, mcp_calls, subagent_calls,
      compactions, clears, max_concurrent, peak_context_pct, avg_context_pct, over70_sessions
    ) values (
      p_participant, (d->>'day')::date,
      coalesce((d->>'inputTokens')::bigint, 0), coalesce((d->>'outputTokens')::bigint, 0),
      coalesce((d->>'cacheWriteTokens')::bigint, 0), coalesce((d->>'cacheReadTokens')::bigint, 0),
      coalesce((d->>'sessions')::int, 0), coalesce((d->>'messages')::int, 0),
      coalesce((d->>'activeMinutes')::int, 0), coalesce((d->>'toolCalls')::int, 0),
      coalesce((d->>'skillCalls')::int, 0), coalesce((d->>'mcpCalls')::int, 0),
      coalesce((d->>'subagentCalls')::int, 0), coalesce((d->>'compactions')::int, 0),
      coalesce((d->>'clears')::int, 0), coalesce((d->>'maxConcurrent')::int, 0),
      coalesce((d->>'peakContextPct')::numeric, 0), coalesce((d->>'avgContextPct')::numeric, 0),
      coalesce((d->>'over70Sessions')::int, 0)
    )
    on conflict (participant_id, day) do update set
      input_tokens = excluded.input_tokens, output_tokens = excluded.output_tokens,
      cache_write_tokens = excluded.cache_write_tokens, cache_read_tokens = excluded.cache_read_tokens,
      sessions = excluded.sessions, messages = excluded.messages, active_minutes = excluded.active_minutes,
      tool_calls = excluded.tool_calls, skill_calls = excluded.skill_calls, mcp_calls = excluded.mcp_calls,
      subagent_calls = excluded.subagent_calls, compactions = excluded.compactions, clears = excluded.clears,
      max_concurrent = excluded.max_concurrent, peak_context_pct = excluded.peak_context_pct,
      avg_context_pct = excluded.avg_context_pct, over70_sessions = excluded.over70_sessions;
  end loop;
end;
$$;

-- Signed-in user gets a new submit token; the previous one stops working. Returned once, stored hashed.
create or replace function public.ranking_issue_token()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then
    raise exception 'sign in required';
  end if;
  v_token := 'mci_' || encode(gen_random_bytes(24), 'hex');
  insert into ranking_tokens (user_id, token_hash)
  values (v_uid, encode(digest(v_token, 'sha256'), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
  return v_token;
end;
$$;

-- Script submission: the token identifies the account, the profile display name is the nickname.
create or replace function public.ranking_submit_with_token(p_token text, p_days jsonb)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_name text;
  v_id uuid;
begin
  select user_id into v_uid from ranking_tokens where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if v_uid is null then
    raise exception 'invalid token';
  end if;

  select trim(display_name) into v_name from profiles where id = v_uid;
  if v_name is null or char_length(v_name) not between 2 and 24 then
    raise exception 'display name required';
  end if;
  if exists (select 1 from ranking_participants where nickname = v_name and user_id is distinct from v_uid) then
    raise exception 'nickname already taken';
  end if;

  insert into ranking_participants (nickname, user_id)
  values (v_name, v_uid)
  on conflict (user_id) do update set nickname = excluded.nickname, last_submitted_at = now()
  returning id into v_id;

  perform private.ranking_upsert_days(v_id, p_days);
  return v_name;
end;
$$;

revoke all on function private.ranking_upsert_days(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.ranking_issue_token() from public, anon;
revoke all on function public.ranking_submit_with_token(text, jsonb) from public;
grant execute on function public.ranking_issue_token() to authenticated;
grant execute on function public.ranking_submit_with_token(text, jsonb) to anon, authenticated;
