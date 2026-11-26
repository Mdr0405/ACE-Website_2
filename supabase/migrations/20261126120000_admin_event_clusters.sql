-- Give events an explicit organising cluster. Existing organiser details stay in
-- organizer_info, and unassigned historical events remain visible to Core only.
begin;

alter table public."Event" add column if not exists "Cluster" text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'Event_cluster_check') then
    alter table public."Event" add constraint "Event_cluster_check"
      check ("Cluster" is null or "Cluster" in (
        'Web Development', 'IoT', 'Cybersecurity', 'Networks', 'AI/ML',
        'Content Writing', 'App Development', 'Competitive Programming'
      )) not valid;
  end if;
end $$;

create index if not exists idx_event_cluster on public."Event" ("Cluster");

-- userAdmins."Cluster" was added directly to the live database. Keep its exact
-- name in the schema for fresh environments too.
alter table public."userAdmins" add column if not exists "Cluster" text;

create or replace function public.is_core_admin()
returns boolean
language sql stable security definer set search_path to ''
as $$
  select exists (
    select 1 from public."userAdmins" a
     where a."userId" = auth.uid() and a."isAdmin"
       and regexp_replace(lower(coalesce(a."Cluster", '')), '[^a-z0-9]', '', 'g') = 'core'
  );
$$;

create or replace function public.admin_can_manage_cluster(p_cluster text)
returns boolean
language sql stable security definer set search_path to ''
as $$
  select exists (
    select 1 from public."userAdmins" a
     where a."userId" = auth.uid() and a."isAdmin"
       and (
         regexp_replace(lower(coalesce(a."Cluster", '')), '[^a-z0-9]', '', 'g') = 'core'
         or (
           p_cluster is not null
           and regexp_replace(lower(coalesce(a."Cluster", '')), '[^a-z0-9]', '', 'g') =
               regexp_replace(lower(p_cluster), '[^a-z0-9]', '', 'g')
         )
       )
  );
$$;

create or replace function public.admin_can_manage_event(p_event_id uuid)
returns boolean
language sql stable security definer set search_path to ''
as $$
  select exists (
    select 1 from public."Event" e
     where e.id = p_event_id and public.admin_can_manage_cluster(e."Cluster")
  );
$$;

revoke execute on function public.is_core_admin() from public, anon;
revoke execute on function public.admin_can_manage_cluster(text) from public, anon;
revoke execute on function public.admin_can_manage_event(uuid) from public, anon;
grant execute on function public.is_core_admin() to authenticated, service_role;
grant execute on function public.admin_can_manage_cluster(text) to authenticated, service_role;
grant execute on function public.admin_can_manage_event(uuid) to authenticated, service_role;

-- Cluster admins can read their own assignment. Only Core can change roles or
-- cluster assignments; otherwise an admin could promote themself to Core.
drop policy if exists "userAdmins unified access policy" on public."userAdmins";
create policy "userAdmins read own or core" on public."userAdmins"
  for select to authenticated
  using ("userId" = (select auth.uid()) or (select public.is_core_admin()));
create policy "userAdmins core insert" on public."userAdmins"
  for insert to authenticated with check ((select public.is_core_admin()));
create policy "userAdmins core update" on public."userAdmins"
  for update to authenticated
  using ((select public.is_core_admin())) with check ((select public.is_core_admin()));
create policy "userAdmins core delete" on public."userAdmins"
  for delete to authenticated using ((select public.is_core_admin()));

drop policy if exists "Event admin insert policy" on public."Event";
drop policy if exists "Event admin update policy" on public."Event";
drop policy if exists "Event admin delete policy" on public."Event";
create policy "Event admin insert policy" on public."Event"
  for insert to authenticated with check (public.admin_can_manage_cluster("Cluster"));
create policy "Event admin update policy" on public."Event"
  for update to authenticated
  using (public.admin_can_manage_cluster("Cluster"))
  with check (public.admin_can_manage_cluster("Cluster"));
create policy "Event admin delete policy" on public."Event"
  for delete to authenticated using (public.admin_can_manage_cluster("Cluster"));

drop policy if exists "Registration insert policy" on public."Registration";
drop policy if exists "Registration update policy" on public."Registration";
drop policy if exists "Registration delete policy" on public."Registration";
create policy "Registration insert policy" on public."Registration"
  for insert to authenticated
  with check ("userId" = (select auth.uid()) or public.admin_can_manage_event("eventId"));
create policy "Registration update policy" on public."Registration"
  for update to authenticated
  using (public.admin_can_manage_event("eventId"))
  with check (public.admin_can_manage_event("eventId"));
create policy "Registration delete policy" on public."Registration"
  for delete to authenticated using (public.admin_can_manage_event("eventId"));

drop policy if exists "RegistrationTeam read own or admin" on public."RegistrationTeam";
drop policy if exists "RegistrationTeam admin insert" on public."RegistrationTeam";
drop policy if exists "RegistrationTeam admin update" on public."RegistrationTeam";
drop policy if exists "RegistrationTeam admin delete" on public."RegistrationTeam";
create policy "RegistrationTeam read own or admin" on public."RegistrationTeam"
  for select to authenticated
  using (
    public.admin_can_manage_event("eventId")
    or exists (
      select 1 from public."Registration" r
       where r.id = "RegistrationTeam"."registrationId"
         and r."userId" = (select auth.uid())
    )
  );
create policy "RegistrationTeam admin insert" on public."RegistrationTeam"
  for insert to authenticated with check (public.admin_can_manage_event("eventId"));
create policy "RegistrationTeam admin update" on public."RegistrationTeam"
  for update to authenticated
  using (public.admin_can_manage_event("eventId"))
  with check (public.admin_can_manage_event("eventId"));
create policy "RegistrationTeam admin delete" on public."RegistrationTeam"
  for delete to authenticated using (public.admin_can_manage_event("eventId"));

-- Event reports need full profiles for their registrants, but not for members
-- of unrelated clusters.
drop policy if exists "UserProfile read own or admin" on public."UserProfile";
drop policy if exists "UserProfile update own or admin" on public."UserProfile";
drop policy if exists "UserProfile admin insert" on public."UserProfile";
drop policy if exists "UserProfile admin delete" on public."UserProfile";
create policy "UserProfile read own or admin" on public."UserProfile"
  for select to authenticated
  using (
    id = (select auth.uid()) or (select public.is_core_admin())
    or exists (
      select 1 from public."Registration" r
       where r."userId" = "UserProfile".id
         and public.admin_can_manage_event(r."eventId")
    )
  );
create policy "UserProfile update own or admin" on public."UserProfile"
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_core_admin()))
  with check (id = (select auth.uid()) or (select public.is_core_admin()));
create policy "UserProfile admin insert" on public."UserProfile"
  for insert to authenticated with check ((select public.is_core_admin()));
create policy "UserProfile admin delete" on public."UserProfile"
  for delete to authenticated using ((select public.is_core_admin()));

create or replace function public.guard_user_profile_update()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if public.is_end_user_request() and not public.is_core_admin() then
    if new.id is distinct from old.id
       or new.name is distinct from old.name
       or new."registrationNumber" is distinct from old."registrationNumber"
       or new.department is distinct from old.department
       or new.year is distinct from old.year
       or new."currentRating" is distinct from old."currentRating" then
      raise exception 'Only contactNumber can be updated' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.admin_event_registrant_emails(p_event_id uuid)
returns table ("userId" uuid, email text)
language plpgsql stable security definer set search_path to ''
as $$
begin
  if public.is_end_user_request() and not public.admin_can_manage_event(p_event_id) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return query
    select r."userId", u.email::text
      from public."Registration" r
      join auth.users u on u.id = r."userId"
     where r."eventId" = p_event_id;
end;
$$;

-- Legacy privileged RPCs have no cluster argument and remain Core-only.
create or replace function public.add_admin_user(user_email text)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare target_user_id uuid;
begin
  if public.is_end_user_request() and not public.is_core_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select id into target_user_id from auth.users where email = user_email;
  if target_user_id is null then
    raise exception 'User with email % not found', user_email;
  end if;
  if not exists (select 1 from public."UserProfile" where id = target_user_id) then
    raise exception 'User % does not have a UserProfile', user_email;
  end if;
  insert into public."userAdmins" ("userId", "isAdmin") values (target_user_id, true)
    on conflict ("userId") do update set "isAdmin" = true;
  return true;
end;
$$;

create or replace function public.remove_admin_user(user_email text)
returns boolean language plpgsql security definer set search_path to ''
as $$
declare target_user_id uuid;
begin
  if public.is_end_user_request() and not public.is_core_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select id into target_user_id from auth.users where email = user_email;
  if target_user_id is null then
    raise exception 'User with email % not found', user_email;
  end if;
  update public."userAdmins" set "isAdmin" = false where "userId" = target_user_id;
  return true;
end;
$$;

create or replace function public.create_new_user_profile(
  p_user_id uuid, p_name text, p_registration_number text, p_year integer, p_department text)
returns void language plpgsql security definer set search_path to ''
as $$
begin
  if public.is_end_user_request() and not public.is_core_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  insert into public."UserProfile" ("id", "name", "registrationNumber", "year", "department")
  values (p_user_id, p_name, p_registration_number, p_year, p_department)
  on conflict ("registrationNumber") do nothing;
end;
$$;

create or replace function public.get_dashboard_stats()
returns json language plpgsql security definer set search_path to ''
as $$
begin
  if public.is_end_user_request() and not public.is_core_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return json_build_object(
    'userCount', (select count(*) from public."UserProfile"),
    'eventCount', (select count(*) from public."Event"),
    'messageCount', (select count(*) from public."ContactMessage")
  );
end;
$$;

-- An admin registering personally for another cluster's team event must still
-- use the regular team-registration path and capacity rules.
create or replace function public.guard_registration_insert()
returns trigger language plpgsql security definer set search_path to ''
as $$
declare ev record; taken integer;
begin
  if public.is_end_user_request() and not public.admin_can_manage_event(new."eventId") then
    select status, "isFeeRequired", "registrationFee", "maxCapacity"
      into ev from public."Event" where id = new."eventId" for update;
    if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
    if ev.status <> 'OPEN' then
      raise exception 'Registration is closed for this event' using errcode = '42501';
    end if;
    if ev."maxCapacity" is not null then
      select count(*) into taken from public."Registration" where "eventId" = new."eventId";
      if taken >= ev."maxCapacity" then
        raise exception 'This event is full' using errcode = '42501';
      end if;
    end if;
    new.points := null;
    new.attended := null;
    new."paymentId" := null;
    new."paymentStatus" := 'pending';
    new."registrationFee" := case when coalesce(ev."isFeeRequired", false) then ev."registrationFee" else 0 end;
    new."registeredAt" := now();
  end if;
  return new;
end;
$$;

create or replace function public.require_team_for_team_events()
returns trigger language plpgsql security definer set search_path to ''
as $$
begin
  if public.is_end_user_request() and not public.admin_can_manage_event(new."eventId")
     and exists (select 1 from public."Event" e where e.id = new."eventId" and e."participationMode" = 'TEAM')
     and not exists (select 1 from public."RegistrationTeam" t where t."registrationId" = new.id) then
    raise exception 'Team events need team details. Register through the event''s form.' using errcode = '42501';
  end if;
  return null;
end;
$$;

-- The team-membership RPC can expose team member names. Scope that part of
-- its response to the member themself or an admin for the matching event.
create or replace function public.team_memberships(p_user_id uuid, p_event_id uuid default null)
returns table (
  "eventId" uuid,
  "registrationId" uuid,
  "teamName" text,
  "teamSize" smallint,
  "leadId" uuid,
  "leadName" text,
  "memberNames" text[],
  "registeredAt" timestamptz,
  "paymentStatus" text
)
language plpgsql stable security definer set search_path to ''
as $$
declare rn text;
begin
  select upper(regexp_replace(coalesce(p."registrationNumber", ''), '\s', '', 'g'))
    into rn from public."UserProfile" p where p.id = p_user_id;
  if rn is null or rn = '' then return; end if;

  return query
    select t."eventId", t."registrationId", t."teamName", t."teamSize",
           r."userId", lp.name,
           case when (select auth.uid()) = p_user_id or public.admin_can_manage_event(t."eventId")
                then array(select e ->> 'name' from jsonb_array_elements(t.members) e)
                else null end,
           r."registeredAt", r."paymentStatus"::text
      from public."RegistrationTeam" t
      join public."Registration" r on r.id = t."registrationId"
      left join public."UserProfile" lp on lp.id = r."userId"
     where t.members @> jsonb_build_array(jsonb_build_object('registrationNumber', rn))
       and r."userId" <> p_user_id
       and (p_event_id is null or t."eventId" = p_event_id);
end;
$$;

notify pgrst, 'reload schema';
commit;
