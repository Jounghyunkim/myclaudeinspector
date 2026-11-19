-- Usage ranking: participants submit daily aggregated Claude usage metrics.
-- Tables are closed to anon/authenticated; access goes only through the RPCs below.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ranking_participants (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique check (char_length(nickname) between 2 and 24),
  secret_hash text not null,
  created_at timestamptz not null default now(),
  last_submitted_at timestamptz not null default now()
);

create table if not exists public.ranking_daily_usage (
  participant_id uuid not null references public.ranking_participants(id) on delete cascade,
  day date not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  sessions int not null default 0,
  messages int not null default 0,
  active_minutes int not null default 0,
  tool_calls int not null default 0,
  skill_calls int not null default 0,
  mcp_calls int not null default 0,
  subagent_calls int not null default 0,
  compactions int not null default 0,
  clears int not null default 0,
  max_concurrent int not null default 0,
  peak_context_pct numeric(5,1) not null default 0,
  avg_context_pct numeric(5,1) not null default 0,
  over70_sessions int not null default 0,
  primary key (participant_id, day)
);

alter table public.ranking_participants enable row level security;
alter table public.ranking_daily_usage enable row level security;
revoke all on public.ranking_participants from anon, authenticated;
revoke all on public.ranking_daily_usage from anon, authenticated;

-- Register (first call) or authenticate (later calls) by nickname + secret, then upsert days.
create or replace function public.ranking_submit(p_nickname text, p_secret text, p_days jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_hash text;
  d jsonb;
begin
  if p_secret is null or char_length(p_secret) < 16 then
    raise exception 'secret must be at least 16 characters';
  end if;

  select id, secret_hash into v_id, v_hash from ranking_participants where nickname = p_nickname;
  if v_id is null then
    insert into ranking_participants (nickname, secret_hash)
    values (p_nickname, crypt(p_secret, gen_salt('bf')))
    returning id into v_id;
  elsif crypt(p_secret, v_hash) <> v_hash then
    raise exception 'nickname already taken';
  end if;

  for d in select * from jsonb_array_elements(coalesce(p_days, '[]'::jsonb)) loop
    insert into ranking_daily_usage as u (
      participant_id, day, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens,
      sessions, messages, active_minutes, tool_calls, skill_calls, mcp_calls, subagent_calls,
      compactions, clears, max_concurrent, peak_context_pct, avg_context_pct, over70_sessions
    ) values (
      v_id, (d->>'day')::date,
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

  update ranking_participants set last_submitted_at = now() where id = v_id;
  return v_id;
end;
$$;

-- Per-participant totals over the last p_days days (null or 0 = all time). Ranking happens in the app.
create or replace function public.ranking_period_stats(p_days int default 7)
returns table (
  nickname text,
  last_submitted_at timestamptz,
  active_days bigint,
  input_tokens numeric,
  output_tokens numeric,
  cache_write_tokens numeric,
  cache_read_tokens numeric,
  sessions bigint,
  messages bigint,
  active_minutes bigint,
  tool_calls bigint,
  skill_calls bigint,
  mcp_calls bigint,
  subagent_calls bigint,
  compactions bigint,
  clears bigint,
  max_concurrent int,
  peak_context_pct numeric,
  avg_context_pct numeric,
  over70_sessions bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.nickname,
    p.last_submitted_at,
    count(u.day) filter (where u.sessions > 0),
    coalesce(sum(u.input_tokens), 0),
    coalesce(sum(u.output_tokens), 0),
    coalesce(sum(u.cache_write_tokens), 0),
    coalesce(sum(u.cache_read_tokens), 0),
    coalesce(sum(u.sessions), 0),
    coalesce(sum(u.messages), 0),
    coalesce(sum(u.active_minutes), 0),
    coalesce(sum(u.tool_calls), 0),
    coalesce(sum(u.skill_calls), 0),
    coalesce(sum(u.mcp_calls), 0),
    coalesce(sum(u.subagent_calls), 0),
    coalesce(sum(u.compactions), 0),
    coalesce(sum(u.clears), 0),
    coalesce(max(u.max_concurrent), 0),
    coalesce(max(u.peak_context_pct), 0),
    coalesce(round(sum(u.avg_context_pct * u.sessions) / nullif(sum(u.sessions), 0), 1), 0),
    coalesce(sum(u.over70_sessions), 0)
  from ranking_participants p
  left join ranking_daily_usage u
    on u.participant_id = p.id
   and (coalesce(p_days, 0) <= 0 or u.day > current_date - p_days)
  group by p.id;
$$;

revoke all on function public.ranking_submit(text, text, jsonb) from public;
revoke all on function public.ranking_period_stats(int) from public;
grant execute on function public.ranking_submit(text, text, jsonb) to anon, authenticated;
grant execute on function public.ranking_period_stats(int) to anon, authenticated;
