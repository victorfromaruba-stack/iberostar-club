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
create or replace function public.sua_board()
returns table (name text, levels int, xp int, lightning int, gauntlet int)
language sql
stable
security definer
set search_path = public
as $$
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
    and (b.lv > 0 or b.xp > 0 or b.l > 0 or b.g > 0)
  order by b.lv desc, b.xp desc
  limit 60;
$$;

revoke all on function public.sua_board() from public;
grant execute on function public.sua_board() to anon, authenticated;
