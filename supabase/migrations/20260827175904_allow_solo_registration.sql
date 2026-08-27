-- Allow solo registration and make listed teammates optional for existing teams.

alter table public.registrations
  drop constraint if exists registrations_team_status_check;

alter table public.registrations
  add constraint registrations_team_status_check
  check (team_status in ('solo', 'looking_for_team', 'has_team'));

alter table public.registrations
  drop constraint if exists registrations_team_details;

alter table public.registrations
  add constraint registrations_team_details check (
    (team_status in ('solo', 'looking_for_team') and team_name is null)
    or (team_status = 'has_team' and team_name is not null and char_length(team_name) >= 2)
  );

do $$
declare
  src text;
  updated text;
begin
  select pg_get_functiondef('public.create_registration(jsonb,jsonb,jsonb,jsonb)'::regprocedure)
  into src;

  if src is null then
    raise exception 'public.create_registration(jsonb,jsonb,jsonb,jsonb) was not found';
  end if;

  if position('existing_team_requires_teammates' in src) = 0
     and position('''solo''' in src) > 0 then
    return;
  end if;

  updated := regexp_replace(
    src,
    $re$if v_team_status = 'has_team' and jsonb_array_length\(p_teammates\) = 0 then\s+raise exception using errcode = '23514', message = 'existing_team_requires_teammates';\s+elsif v_team_status = 'looking_for_team' and jsonb_array_length\(p_teammates\) <> 0 then\s+raise exception using errcode = '23514', message = 'team_details_not_allowed';\s+end if;$re$,
    $new$if v_team_status not in ('solo', 'looking_for_team', 'has_team') then
    raise exception using errcode = '23514', message = 'team_status_invalid';
  elsif v_team_status in ('solo', 'looking_for_team') and jsonb_array_length(p_teammates) <> 0 then
    raise exception using errcode = '23514', message = 'team_details_not_allowed';
  end if;$new$
  );

  if updated is null or updated = src or position('existing_team_requires_teammates' in updated) > 0 then
    raise exception 'create_registration teammate rules were not updated';
  end if;

  execute updated;
end $$;
