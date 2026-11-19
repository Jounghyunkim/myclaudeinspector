-- Let a user remove all of their own ranking records with their submit token (desktop app "기록 삭제").
-- The Auth user and the submit token stay, so the next upload starts a fresh record.

-- Internal: the Auth user that owns a submit token, or null.
create or replace function private.ranking_token_user(p_token text)
returns uuid
language sql
stable
set search_path = public, extensions
as $$
  select user_id from ranking_tokens
  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

revoke all on function private.ranking_token_user(text) from public, anon, authenticated;

-- How many days of records the token owner has (for the confirmation dialog).
create or replace function public.ranking_my_record_days(p_token text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := private.ranking_token_user(p_token);
begin
  if v_uid is null then
    raise exception 'invalid token';
  end if;
  return (
    select count(*)::int
    from ranking_daily_usage d
    join ranking_participants p on p.id = d.participant_id
    where p.user_id = v_uid
  );
end;
$$;

-- Deletes the token owner's participant row; daily rows go with it (on delete cascade),
-- so the nickname disappears from every ranking. Returns the number of deleted days.
create or replace function public.ranking_delete_my_records(p_token text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := private.ranking_token_user(p_token);
  v_days int;
begin
  if v_uid is null then
    raise exception 'invalid token';
  end if;
  select count(*)::int into v_days
  from ranking_daily_usage d
  join ranking_participants p on p.id = d.participant_id
  where p.user_id = v_uid;

  delete from ranking_participants where user_id = v_uid;
  return v_days;
end;
$$;

revoke all on function public.ranking_my_record_days(text) from public;
revoke all on function public.ranking_delete_my_records(text) from public;
grant execute on function public.ranking_my_record_days(text) to anon, authenticated;
grant execute on function public.ranking_delete_my_records(text) to anon, authenticated;
