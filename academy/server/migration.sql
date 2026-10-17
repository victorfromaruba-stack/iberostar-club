-- Street practice: AI role-play chats for Show-Up Academy.
-- Only the sua-roleplay Edge Function (service role) can read or write these.
-- Undo: drop function sua_rp_status, sua_rp_start, sua_rp_load, sua_rp_save, sua_rp_coach_save, sua_rp_used, sua_rp_who;
--       drop table sua_rp_chats.

create table if not exists public.sua_rp_chats (
  chat_id    uuid primary key default gen_random_uuid(),
  device_id  uuid not null references public.sua_people(device_id) on delete cascade,
  day        date not null default ((now() at time zone 'America/Aruba')::date),
  couple     jsonb not null,
  log        jsonb not null default '[]'::jsonb,
  turns      int not null default 0,
  state      text not null default 'talking',
  coach      jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sua_rp_chats_day on public.sua_rp_chats (day, device_id);
create index if not exists sua_rp_chats_device on public.sua_rp_chats (device_id);
alter table public.sua_rp_chats enable row level security;
revoke all on public.sua_rp_chats from anon, authenticated;

-- Is this device who it says it is? Same secret check as sua_save.
create or replace function public.sua_rp_who(p_device uuid, p_secret text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.sua_people
                  where device_id = p_device
                    and secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex'));
$$;

-- Today's chats that got at least one turn: for this device, and for the whole team.
create or replace function public.sua_rp_used(p_device uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mine', (select count(*) from public.sua_rp_chats where device_id = p_device and day = (now() at time zone 'America/Aruba')::date and turns > 0),
    'started', (select count(*) from public.sua_rp_chats where device_id = p_device and day = (now() at time zone 'America/Aruba')::date),
    'team', (select count(*) from public.sua_rp_chats where day = (now() at time zone 'America/Aruba')::date and turns > 0));
$$;

-- How many practice chats this device has left today.
create or replace function public.sua_rp_status(p_device uuid, p_secret text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sua_rp_who(p_device, p_secret) then
    return jsonb_build_object('err', 'auth');
  end if;
  return public.sua_rp_used(p_device);
end;
$$;

create or replace function public.sua_rp_start(p_device uuid, p_secret text, p_couple jsonb, p_mine int, p_team int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  u jsonb;
  v_id uuid;
begin
  if not public.sua_rp_who(p_device, p_secret) then
    return jsonb_build_object('err', 'auth');
  end if;
  if p_couple is null or jsonb_typeof(p_couple) <> 'object' or octet_length(p_couple::text) > 8000 then
    return jsonb_build_object('err', 'bad');
  end if;
  -- Chats older than 30 days keep only their counts: the words are wiped.
  update public.sua_rp_chats set log = '[]'::jsonb, couple = '{}'::jsonb, coach = null
   where created_at < now() - interval '30 days' and log <> '[]'::jsonb;
  u := public.sua_rp_used(p_device);
  if (u->>'mine')::int >= p_mine or (u->>'started')::int >= p_mine * 3 then
    return jsonb_build_object('err', 'limit', 'left', 0);
  end if;
  if (u->>'team')::int >= p_team then
    return jsonb_build_object('err', 'team');
  end if;
  insert into public.sua_rp_chats (device_id, couple) values (p_device, p_couple) returning chat_id into v_id;
  return jsonb_build_object('chat', v_id, 'left', p_mine - (u->>'mine')::int);
end;
$$;

-- Load a chat for its own device. A chat's first turn counts against today's limits.
create or replace function public.sua_rp_load(p_device uuid, p_secret text, p_chat uuid, p_mine int, p_team int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.sua_rp_chats;
  u jsonb;
begin
  if not public.sua_rp_who(p_device, p_secret) then
    return jsonb_build_object('err', 'auth');
  end if;
  select * into r from public.sua_rp_chats where chat_id = p_chat and device_id = p_device;
  if not found then
    return jsonb_build_object('err', 'nochat');
  end if;
  if r.turns = 0 then
    u := public.sua_rp_used(p_device);
    if (u->>'mine')::int >= p_mine then return jsonb_build_object('err', 'limit', 'left', 0); end if;
    if (u->>'team')::int >= p_team then return jsonb_build_object('err', 'team'); end if;
  end if;
  return jsonb_build_object('couple', r.couple, 'log', r.log, 'turns', r.turns, 'state', r.state, 'coach', r.coach);
end;
$$;

-- Save a turn. p_turns is the count the caller loaded, so two taps can't both write.
create or replace function public.sua_rp_save(p_chat uuid, p_turns int, p_log jsonb, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_log is null or jsonb_typeof(p_log) <> 'array' or octet_length(p_log::text) > 60000 then
    return false;
  end if;
  update public.sua_rp_chats
     set log = p_log, turns = p_turns + 1, state = left(coalesce(p_state, 'talking'), 12), updated_at = now()
   where chat_id = p_chat and turns = p_turns;
  return found;
end;
$$;

create or replace function public.sua_rp_coach_save(p_chat uuid, p_coach jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_coach is null or jsonb_typeof(p_coach) <> 'object' or octet_length(p_coach::text) > 30000 then
    return false;
  end if;
  update public.sua_rp_chats set coach = p_coach, updated_at = now() where chat_id = p_chat;
  return found;
end;
$$;

revoke all on function public.sua_rp_who(uuid, text) from public, anon, authenticated;
revoke all on function public.sua_rp_used(uuid) from public, anon, authenticated;
revoke all on function public.sua_rp_status(uuid, text) from public, anon, authenticated;
revoke all on function public.sua_rp_start(uuid, text, jsonb, int, int) from public, anon, authenticated;
revoke all on function public.sua_rp_load(uuid, text, uuid, int, int) from public, anon, authenticated;
revoke all on function public.sua_rp_save(uuid, int, jsonb, text) from public, anon, authenticated;
revoke all on function public.sua_rp_coach_save(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.sua_rp_status(uuid, text) to service_role;
grant execute on function public.sua_rp_start(uuid, text, jsonb, int, int) to service_role;
grant execute on function public.sua_rp_load(uuid, text, uuid, int, int) to service_role;
grant execute on function public.sua_rp_save(uuid, int, jsonb, text) to service_role;
grant execute on function public.sua_rp_coach_save(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- The board every worker sees.
--
-- sua_team hands a manager the whole team: names, per-level stats, answer
-- counts, activity logs and device ids. That is why it is behind the manager
-- code. This returns a name and two numbers and nothing else, so it is safe
-- to open to the publishable key.
--
-- Only people who have actually set a record appear. A board padded with
-- zeroes tells half the floor they are last, which is the opposite of what a
-- board is for.
--
-- Written defensively on purpose: the score is read out of the stats payload,
-- so it is regex-guarded before casting (a malformed value would otherwise
-- fail the whole query), capped, and the hidden flag is read through
-- to_jsonb() so this still works whether or not that column exists.
-- ---------------------------------------------------------------------------
-- Replaced whenever the shape changes; create-or-replace cannot change a
-- return type (Postgres 42P13), and the app treats a missing function as
-- "not switched on yet", so the gap is harmless.
drop function if exists public.sua_board();

create function public.sua_board()
returns table (name text, levels int, xp int, lightning int, gauntlet int)
language sql
stable
security definer
set search_path = public
as $$
  with scored as (
    select p.name, b.lv, b.xp, b.l, b.g
    from public.sua_people p,
    lateral (select
      (select count(*)::int from jsonb_each(coalesce(p.stats->'m', '{}'::jsonb)) e
         where jsonb_typeof(e.value) = 'number' and (e.value)::text::numeric > 0) as lv,
      case when p.stats->>'x'  ~ '^[0-9]{1,9}$' then (p.stats->>'x')::int  else 0 end as xp,
      case when p.stats->>'l'  ~ '^[0-9]{1,6}$' then (p.stats->>'l')::int  else 0 end as l,
      case when p.stats->>'gt' ~ '^[0-9]{1,6}$' then (p.stats->>'gt')::int else 0 end as g
    ) b
    where coalesce((to_jsonb(p) ->> 'hidden')::boolean, false) = false
      and coalesce(p.name, '') <> ''
      -- Test entries keep themselves off the floor's board. Someone trying the
      -- app out should not have to be hidden by hand afterwards, and nobody on
      -- this team is called Test.
      and lower(btrim(p.name)) !~ '^(test|tester|testing|demo|prueba)[0-9 .]*$'
      and (b.lv > 0 or b.xp > 0 or b.l > 0 or b.g > 0)
  ),
  merged as (
    -- One row per person. A second phone or a reinstall creates a second
    -- device row, and the same face appearing twice on a leaderboard reads as
    -- broken. Their best in each column wins, so nothing is lost.
    select (array_agg(name order by lv desc, xp desc))[1] as name,
           max(lv) as lv, max(xp) as xp, max(l) as l, max(g) as g
    from scored
    group by lower(btrim(name))
  )
  select name, lv, xp, l, g from merged
  order by lv desc, xp desc
  limit 60;
$$;

revoke all on function public.sua_board() from public;
grant execute on function public.sua_board() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Accounts: the person, not the phone.
--
-- Progress was keyed to a device id generated in the browser, so installing
-- the app properly, changing handset or clearing the browser lost everything.
-- The progress itself was never lost — it is written to sua_people after every
-- answer — there was simply no way to prove you were the same person.
--
-- A name and four digits. No email and no password, on a floor that works
-- from their phones between guests.
-- ---------------------------------------------------------------------------
alter table public.sua_people add column if not exists pin_hash text;

create or replace function public.sua_pin_hash(p_name text, p_pin text)
returns text language sql immutable
set search_path = public as $$
  select encode(sha256(convert_to(lower(btrim(p_name)) || ':' || btrim(p_pin) || ':sua', 'UTF8')), 'hex');
$$;

-- Everyone already using the Academy starts on 1234, and sua_claim tells the
-- app to make them choose their own the moment they sign in.
update public.sua_people
   set pin_hash = public.sua_pin_hash(name, '1234')
 where pin_hash is null and coalesce(name, '') <> '';

create or replace function public.sua_set_pin(p_device uuid, p_secret text, p_pin text)
returns void language plpgsql security definer
set search_path = public, extensions as $$
declare v_name text;
begin
  if btrim(coalesce(p_pin, '')) !~ '^[0-9]{4}$' then
    raise exception 'pin must be 4 digits';
  end if;
  -- Same device check as sua_save and sua_rp_who: the secret is stored as a
  -- sha256 in secret_hash, never in the clear.
  select name into v_name from public.sua_people
   where device_id = p_device
     and secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex');
  if v_name is null then raise exception 'not your record'; end if;
  update public.sua_people
     set pin_hash = public.sua_pin_hash(v_name, p_pin)
   where device_id = p_device;
end; $$;

-- Point the account at the phone in front of us. The old device id stops
-- working on purpose, so two handsets never write over each other.
create or replace function public.sua_claim(p_name text, p_pin text, p_device uuid, p_secret text)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare r record;
begin
  if btrim(coalesce(p_pin, '')) !~ '^[0-9]{4}$' then
    raise exception 'wrong name or pin';
  end if;
  select p.device_id, p.stats, p.pin_hash, p.name into r
    from public.sua_people p
   where lower(btrim(p.name)) = lower(btrim(p_name))
     and p.pin_hash is not null
     and p.pin_hash = public.sua_pin_hash(p.name, p_pin)
   limit 1;
  if r.device_id is null then raise exception 'wrong name or pin'; end if;

  update public.sua_people
     set device_id = p_device,
         secret_hash = encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
   where device_id = r.device_id;

  return jsonb_build_object(
    'stats', coalesce(r.stats, '{}'::jsonb),
    'must_change', r.pin_hash = public.sua_pin_hash(r.name, '1234')
  );
end; $$;

revoke all on function public.sua_pin_hash(text, text) from public, anon, authenticated;
revoke all on function public.sua_set_pin(uuid, text, text) from public;
revoke all on function public.sua_claim(text, text, uuid, text) from public;
grant execute on function public.sua_set_pin(uuid, text, text) to anon, authenticated;
grant execute on function public.sua_claim(text, text, uuid, text) to anon, authenticated;
