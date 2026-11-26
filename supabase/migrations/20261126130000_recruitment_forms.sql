-- First-party cluster recruitment forms and their responses.
begin;

create table if not exists public."RecruitmentForm" (
  "Cluster" text primary key,
  title text not null,
  description text not null,
  "nameLabel" text not null default 'Full name',
  "courseLabel" text not null default 'Course',
  "yearLabel" text not null default 'Year of study',
  "isOpen" boolean not null default true,
  "updatedAt" timestamptz not null default now(),
  constraint "RecruitmentForm_title_length" check (char_length(btrim(title)) between 1 and 120),
  constraint "RecruitmentForm_description_length" check (char_length(btrim(description)) between 1 and 500),
  constraint "RecruitmentForm_labels_length" check (
    char_length(btrim("nameLabel")) between 1 and 80
    and char_length(btrim("courseLabel")) between 1 and 80
    and char_length(btrim("yearLabel")) between 1 and 80
  )
);

insert into public."RecruitmentForm" ("Cluster", title, description)
values
  ('Web Development', 'Web Development application', 'Tell us a little about yourself.'),
  ('App Development', 'App Development application', 'Tell us a little about yourself.'),
  ('AI/ML', 'AI/ML application', 'Tell us a little about yourself.'),
  ('Cybersecurity', 'Cybersecurity application', 'Tell us a little about yourself.'),
  ('IoT', 'IoT application', 'Tell us a little about yourself.'),
  ('Networks', 'Networks application', 'Tell us a little about yourself.'),
  ('Competitive Programming', 'Competitive Programming application', 'Tell us a little about yourself.'),
  ('OpCon & PR', 'OpCon & PR application', 'Tell us a little about yourself.'),
  ('Graphic Designing', 'Graphic Designing application', 'Tell us a little about yourself.'),
  ('Video Editing', 'Video Editing application', 'Tell us a little about yourself.'),
  ('Content Writing', 'Content Writing application', 'Tell us a little about yourself.')
on conflict ("Cluster") do nothing;

create table if not exists public."RecruitmentApplication" (
  id uuid primary key default gen_random_uuid(),
  "Cluster" text not null references public."RecruitmentForm"("Cluster"),
  "fullName" text not null,
  course text not null,
  year smallint not null,
  "submittedAt" timestamptz not null default now(),
  constraint "RecruitmentApplication_name_length" check (char_length(btrim("fullName")) between 2 and 120),
  constraint "RecruitmentApplication_course_check" check (course in (
    'CSE', 'CSE-AI', 'IT', 'CSE-CYBER', 'CSE-IOT', 'ICT', 'OTHER'
  )),
  constraint "RecruitmentApplication_year_check" check (year between 1 and 4)
);

create index if not exists idx_recruitment_application_cluster
  on public."RecruitmentApplication" ("Cluster", "submittedAt" desc);

alter table public."RecruitmentForm" enable row level security;
alter table public."RecruitmentApplication" enable row level security;

revoke all on public."RecruitmentForm", public."RecruitmentApplication" from anon, authenticated;
grant select on public."RecruitmentForm" to anon, authenticated;
grant update on public."RecruitmentForm" to authenticated;
grant insert on public."RecruitmentApplication" to anon, authenticated;
grant select on public."RecruitmentApplication" to authenticated;

create policy "RecruitmentForm public read" on public."RecruitmentForm"
  for select to anon, authenticated using (true);
create policy "RecruitmentForm admin update" on public."RecruitmentForm"
  for update to authenticated
  using (public.admin_can_manage_cluster("Cluster"))
  with check (public.admin_can_manage_cluster("Cluster"));

create policy "RecruitmentApplication open form insert" on public."RecruitmentApplication"
  for insert to anon, authenticated
  with check (exists (
    select 1 from public."RecruitmentForm" f
     where f."Cluster" = "RecruitmentApplication"."Cluster" and f."isOpen"
  ));
create policy "RecruitmentApplication admin read" on public."RecruitmentApplication"
  for select to authenticated using (public.admin_can_manage_cluster("Cluster"));

notify pgrst, 'reload schema';
commit;
