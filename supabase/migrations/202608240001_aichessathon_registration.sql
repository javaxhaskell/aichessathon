-- AI Chessathon registration schema
-- Apply with `supabase db push` after linking a Supabase project.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_kind text not null check (document_kind in ('privacy', 'rules_and_code', 'cv_share_optiver', 'accessibility_support')),
  version text not null,
  exact_text text not null,
  text_sha256 text not null check (
    text_sha256 ~ '^[a-f0-9]{64}$'
    and text_sha256 = encode(extensions.digest(exact_text, 'sha256'), 'hex')
  ),
  effective_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_kind, version)
);
create unique index legal_document_one_active_per_kind
  on public.legal_document_versions (document_kind) where is_active;

-- Privacy is intentionally not seeded here: the server inserts the exact rendered
-- notice after resolving the approved legal-controller identity.
with documents(document_kind, version, exact_text, effective_at) as (values
  ('rules_and_code', '2026-08-24.v1',
   'I agree to comply with the AI Chessathon competition rules and code of conduct.',
   '2026-08-24T00:00:00Z'::timestamptz),
  ('cv_share_optiver', '2026-08-24.v1',
   'I consent to AI Chessathon sharing my CV with Optiver for recruitment-related opportunities. Declining this consent does not affect eligibility or judging.',
   '2026-08-24T00:00:00Z'::timestamptz),
  ('accessibility_support', '2026-08-24.v1',
   'I explicitly consent to AI Chessathon using the accessibility or dietary information I provide only to support my participation.',
   '2026-08-24T00:00:00Z'::timestamptz)
)
insert into public.legal_document_versions (document_kind, version, exact_text, text_sha256, effective_at, is_active)
select document_kind, version, exact_text, encode(extensions.digest(exact_text, 'sha256'), 'hex'), effective_at, true
from documents;

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique check (reference_code ~ '^ACH-[A-F0-9]{10}$'),
  idempotency_key uuid not null unique,
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  submission_state text not null default 'pending_upload'
    check (submission_state in ('pending_upload', 'submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn', 'abandoned')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email citext not null check (char_length(email::text) <= 254),
  organization text not null check (char_length(organization) between 2 and 160),
  role_or_course text not null check (char_length(role_or_course) between 2 and 160),
  graduation_year smallint check (graduation_year between 1950 and 2040),
  country text not null check (char_length(country) between 2 and 100),
  city text not null check (char_length(city) between 2 and 100),
  github_portfolio_url text not null check (char_length(github_portfolio_url) <= 500),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 500),
  team_status text not null check (team_status in ('looking_for_team', 'has_team')),
  team_name text check (team_name is null or char_length(team_name) <= 120),
  technical_background text check (technical_background is null or char_length(technical_background) <= 2000),
  availability_online boolean not null check (availability_online),
  availability_london boolean not null check (availability_london),
  rules_accepted boolean not null check (rules_accepted),
  privacy_accepted boolean not null check (privacy_accepted),
  cv_share_opt_in boolean not null default false,
  privacy_notice_version text not null,
  rules_version text not null,
  expected_cv_object_path text,
  expected_cv_original_filename text,
  expected_cv_size_bytes bigint,
  expected_cv_mime_type text,
  completion_token_hash text check (completion_token_hash is null or completion_token_hash ~ '^[a-f0-9]{64}$'),
  upload_expires_at timestamptz,
  upload_capability_expires_at timestamptz,
  verification_lease_expires_at timestamptz,
  confirmation_email_status text not null default 'not_configured'
    check (confirmation_email_status in ('not_configured', 'sent', 'failed')),
  confirmation_email_sent_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_team_details check (
    (team_status = 'looking_for_team' and team_name is null) or
    (team_status = 'has_team' and team_name is not null and char_length(team_name) >= 2)
  ),
  constraint registrations_upload_state check (
    (submission_state = 'pending_upload' and expected_cv_object_path is not null and completion_token_hash is not null and upload_expires_at is not null)
    or submission_state <> 'pending_upload'
  ),
  constraint registrations_cv_expectations check (
    (expected_cv_object_path is null and expected_cv_original_filename is null and expected_cv_size_bytes is null and expected_cv_mime_type is null)
    or
    (expected_cv_object_path is not null and expected_cv_original_filename is not null and expected_cv_size_bytes between 1 and 10485760 and expected_cv_mime_type = 'application/pdf')
  )
);
create unique index registrations_one_submitted_email
  on public.registrations (lower(email::text))
  where submission_state in ('submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn');
create index registrations_state_created_idx on public.registrations (submission_state, created_at desc);

create table public.registration_teammates (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  position smallint not null check (position between 0 and 7),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email citext not null check (char_length(email::text) <= 254),
  created_at timestamptz not null default now(),
  unique (registration_id, position)
);
create unique index registration_teammates_unique_email
  on public.registration_teammates (registration_id, lower(email::text));

create table public.registration_sensitive_details (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  accessibility_dietary text not null check (char_length(accessibility_dietary) between 1 and 1000),
  explicit_consent_at timestamptz not null,
  consent_version text not null,
  consent_text_snapshot text not null,
  consent_text_sha256 text not null check (
    consent_text_sha256 ~ '^[a-f0-9]{64}$'
    and consent_text_sha256 = encode(extensions.digest(consent_text_snapshot, 'sha256'), 'hex')
  ),
  created_at timestamptz not null default now()
);

create table public.registration_consents (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  consent_kind text not null check (consent_kind in ('privacy', 'rules_and_code', 'cv_share_optiver')),
  accepted boolean not null,
  decision_at timestamptz not null,
  accepted_at timestamptz,
  withdrawn_at timestamptz,
  document_version text not null,
  text_snapshot text not null,
  text_sha256 text not null check (
    text_sha256 ~ '^[a-f0-9]{64}$'
    and text_sha256 = encode(extensions.digest(text_snapshot, 'sha256'), 'hex')
  ),
  privacy_notice_version text not null,
  privacy_notice_text_snapshot text not null,
  privacy_notice_text_sha256 text not null check (
    privacy_notice_text_sha256 ~ '^[a-f0-9]{64}$'
    and privacy_notice_text_sha256 = encode(extensions.digest(privacy_notice_text_snapshot, 'sha256'), 'hex')
  ),
  created_at timestamptz not null default now(),
  unique (registration_id, consent_kind),
  foreign key (consent_kind, document_version)
    references public.legal_document_versions(document_kind, version),
  check ((accepted and accepted_at is not null) or (not accepted and accepted_at is null))
);

create table public.registration_documents (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  document_kind text not null check (document_kind = 'cv'),
  bucket_id text not null check (bucket_id = 'registration-cvs'),
  object_path text not null unique,
  original_filename text not null check (char_length(original_filename) <= 255),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  mime_type text not null check (mime_type = 'application/pdf'),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  scan_status text not null default 'unscanned'
    check (scan_status in ('unscanned', 'pending', 'clean', 'quarantined', 'rejected')),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index registration_one_active_cv
  on public.registration_documents (registration_id, document_kind) where deleted_at is null;

create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  admin_role text not null check (admin_role in ('organizer', 'reviewer')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.registration_reviews (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  recommendation text check (recommendation in ('advance', 'hold', 'decline')),
  score smallint check (score between 1 and 5),
  private_notes text check (private_notes is null or char_length(private_notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, reviewer_id)
);

create table public.registration_status_events (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  from_state text,
  to_state text not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  template text not null,
  status text not null check (status in ('not_configured', 'sent', 'failed')),
  provider_message_id text,
  attempts smallint not null default 1,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, template)
);

create table public.registration_attempts (
  id bigint generated always as identity primary key,
  attempt_scope text not null check (attempt_scope in ('start', 'complete')),
  ip_fingerprint text not null check (char_length(ip_fingerprint) = 64),
  created_at timestamptz not null default now()
);
create index registration_attempts_lookup_idx on public.registration_attempts (attempt_scope, ip_fingerprint, created_at desc);

create table public.cv_disclosures (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id),
  document_id uuid not null references public.registration_documents(id),
  recipient text not null check (recipient = 'Optiver'),
  consent_id uuid not null references public.registration_consents(id),
  disclosed_by uuid not null references auth.users(id),
  disclosed_at timestamptz not null default now(),
  purpose text not null default 'recruitment-related opportunities'
);

-- Object paths are queued before a registration is deleted so Storage cleanup can
-- be retried independently of the database transaction. This table contains no
-- applicant data and is not exposed through the Data API.
create table private.storage_cleanup_queue (
  object_path text primary key,
  delete_after timestamptz not null,
  queued_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger registrations_set_updated_at before update on public.registrations
for each row execute function private.set_updated_at();
create trigger registration_reviews_set_updated_at before update on public.registration_reviews
for each row execute function private.set_updated_at();
create trigger email_outbox_set_updated_at before update on public.email_outbox
for each row execute function private.set_updated_at();

create or replace function private.queue_registration_storage_cleanup()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, private
as $$
begin
  if old.expected_cv_object_path is not null then
    -- Signed upload tokens remain valid for two hours. Keep a tombstone past
    -- that capability's expiry so a cancelled/rejected upload cannot recreate
    -- an untracked object after an early cleanup attempt.
    insert into private.storage_cleanup_queue (object_path, delete_after)
    values (
      old.expected_cv_object_path,
      greatest(
        coalesce(old.upload_capability_expires_at, old.upload_expires_at, now()),
        now()
      ) + interval '15 minutes'
    )
    on conflict (object_path) do update
      set delete_after = greatest(storage_cleanup_queue.delete_after, excluded.delete_after);
  end if;
  return old;
end;
$$;

create trigger registrations_queue_storage_cleanup
before delete on public.registrations
for each row execute function private.queue_registration_storage_cleanup();

create or replace function private.record_registration_status()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    insert into public.registration_status_events (registration_id, from_state, to_state)
    values (new.id, null, new.submission_state);
  elsif new.submission_state is distinct from old.submission_state then
    insert into public.registration_status_events (registration_id, from_state, to_state)
    values (new.id, old.submission_state, new.submission_state);
  end if;
  return new;
end;
$$;
create trigger registration_status_audit after insert or update of submission_state on public.registrations
for each row execute function private.record_registration_status();

-- Creates the core registration and all related application/consent rows in one
-- transaction. JSON keys use the database's snake_case column names. p_consents
-- has the shape {"privacy_notice": {"version", "text_snapshot", "text_sha256"},
-- "items": [{"consent_kind", "accepted", "document_version",
-- "text_snapshot", "text_sha256"}, ...]}.
create or replace function public.create_registration(
  p_registration jsonb,
  p_teammates jsonb,
  p_sensitive jsonb,
  p_consents jsonb
)
returns table (
  registration_id uuid,
  reference_code text,
  submission_state text,
  expected_cv_object_path text,
  upload_expires_at timestamptz,
  was_existing boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_new_id uuid;
  v_reference text;
  v_idempotency_key uuid;
  v_request_fingerprint text;
  v_existing public.registrations%rowtype;
  v_has_cv boolean;
  v_now timestamptz := now();
  v_team_status text;
  v_privacy jsonb;
  v_consent_items jsonb;
  v_item jsonb;
  v_kind text;
  v_accepted boolean;
  v_document_version text;
  v_consent_text text;
  v_consent_hash text;
  v_privacy_version text;
  v_privacy_text text;
  v_privacy_hash text;
  v_rules_version text;
  v_cv_accepted boolean := false;
  v_seen_privacy boolean := false;
  v_seen_rules boolean := false;
  v_seen_cv boolean := false;
  v_sensitive_text text;
  v_sensitive_version text;
  v_sensitive_consent_text text;
  v_sensitive_consent_hash text;
begin
  if p_registration is null or jsonb_typeof(p_registration) <> 'object' then
    raise exception using errcode = '22023', message = 'registration_payload_invalid';
  end if;

  v_idempotency_key := nullif(p_registration ->> 'idempotency_key', '')::uuid;
  v_request_fingerprint := nullif(p_registration ->> 'request_fingerprint', '');
  if v_idempotency_key is null or v_request_fingerprint is null
     or v_request_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'registration_identity_invalid';
  end if;

  -- A completed call with the same normalized request is safe to replay.
  select r.*
  into v_existing
  from public.registrations as r
  where r.idempotency_key = v_idempotency_key
  for update;

  if found then
    if v_existing.request_fingerprint <> v_request_fingerprint then
      raise exception using errcode = '23505', message = 'idempotency_key_reused';
    end if;
    registration_id := v_existing.id;
    reference_code := v_existing.reference_code;
    submission_state := v_existing.submission_state;
    expected_cv_object_path := v_existing.expected_cv_object_path;
    upload_expires_at := v_existing.upload_expires_at;
    was_existing := true;
    return next;
    return;
  end if;

  p_teammates := coalesce(p_teammates, '[]'::jsonb);
  if jsonb_typeof(p_teammates) <> 'array' or jsonb_array_length(p_teammates) > 8 then
    raise exception using errcode = '22023', message = 'teammates_payload_invalid';
  end if;

  v_team_status := p_registration ->> 'team_status';
  if v_team_status = 'has_team' and jsonb_array_length(p_teammates) = 0 then
    raise exception using errcode = '23514', message = 'existing_team_requires_teammates';
  elsif v_team_status = 'looking_for_team' and jsonb_array_length(p_teammates) <> 0 then
    raise exception using errcode = '23514', message = 'team_details_not_allowed';
  end if;

  if p_consents is null or jsonb_typeof(p_consents) <> 'object' then
    raise exception using errcode = '22023', message = 'consents_payload_invalid';
  end if;
  v_privacy := p_consents -> 'privacy_notice';
  v_consent_items := p_consents -> 'items';
  if v_privacy is null or jsonb_typeof(v_privacy) <> 'object'
     or v_consent_items is null or jsonb_typeof(v_consent_items) <> 'array'
     or jsonb_array_length(v_consent_items) <> 3 then
    raise exception using errcode = '22023', message = 'consents_payload_invalid';
  end if;

  v_privacy_version := nullif(v_privacy ->> 'version', '');
  v_privacy_text := nullif(v_privacy ->> 'text_snapshot', '');
  v_privacy_hash := nullif(v_privacy ->> 'text_sha256', '');
  if v_privacy_version is null or v_privacy_text is null or v_privacy_hash is null
     or v_privacy_hash <> encode(extensions.digest(v_privacy_text, 'sha256'), 'hex') then
    raise exception using errcode = '23514', message = 'privacy_notice_snapshot_invalid';
  end if;

  perform 1
  from public.legal_document_versions as legal
  where legal.document_kind = 'privacy'
    and legal.version = v_privacy_version
    and legal.exact_text = v_privacy_text
    and legal.text_sha256 = v_privacy_hash
    and legal.is_active;
  if not found then
    raise exception using errcode = '23514', message = 'privacy_notice_version_not_active';
  end if;

  for v_item in select item.value from jsonb_array_elements(v_consent_items) as item(value)
  loop
    v_kind := v_item ->> 'consent_kind';
    v_accepted := (v_item ->> 'accepted')::boolean;
    v_document_version := nullif(v_item ->> 'document_version', '');
    v_consent_text := nullif(v_item ->> 'text_snapshot', '');
    v_consent_hash := nullif(v_item ->> 'text_sha256', '');

    if v_accepted is null or v_document_version is null or v_consent_text is null
       or v_consent_hash is null
       or v_consent_hash <> encode(extensions.digest(v_consent_text, 'sha256'), 'hex') then
      raise exception using errcode = '23514', message = 'consent_snapshot_invalid';
    end if;

    case v_kind
      when 'privacy' then
        if v_seen_privacy or not v_accepted or v_document_version <> v_privacy_version then
          raise exception using errcode = '23514', message = 'privacy_consent_invalid';
        end if;
        v_seen_privacy := true;
      when 'rules_and_code' then
        if v_seen_rules or not v_accepted then
          raise exception using errcode = '23514', message = 'rules_consent_invalid';
        end if;
        perform 1
        from public.legal_document_versions as legal
        where legal.document_kind = v_kind
          and legal.version = v_document_version
          and legal.exact_text = v_consent_text
          and legal.text_sha256 = v_consent_hash
          and legal.is_active;
        if not found then
          raise exception using errcode = '23514', message = 'rules_version_not_active';
        end if;
        v_rules_version := v_document_version;
        v_seen_rules := true;
      when 'cv_share_optiver' then
        if v_seen_cv then
          raise exception using errcode = '23514', message = 'cv_consent_invalid';
        end if;
        perform 1
        from public.legal_document_versions as legal
        where legal.document_kind = v_kind
          and legal.version = v_document_version
          and legal.exact_text = v_consent_text
          and legal.text_sha256 = v_consent_hash
          and legal.is_active;
        if not found then
          raise exception using errcode = '23514', message = 'cv_consent_version_not_active';
        end if;
        v_cv_accepted := v_accepted;
        v_seen_cv := true;
      else
        raise exception using errcode = '23514', message = 'consent_kind_invalid';
    end case;
  end loop;

  if not v_seen_privacy or not v_seen_rules or not v_seen_cv then
    raise exception using errcode = '23514', message = 'required_consents_missing';
  end if;

  if p_sensitive is not null and p_sensitive <> 'null'::jsonb
     and jsonb_typeof(p_sensitive) <> 'object' then
    raise exception using errcode = '22023', message = 'sensitive_payload_invalid';
  end if;
  if p_sensitive is not null and p_sensitive <> 'null'::jsonb then
    v_sensitive_text := nullif(p_sensitive ->> 'accessibility_dietary', '');
    if v_sensitive_text is not null then
      v_sensitive_version := nullif(p_sensitive ->> 'consent_version', '');
      v_sensitive_consent_text := nullif(p_sensitive ->> 'consent_text_snapshot', '');
      v_sensitive_consent_hash := nullif(p_sensitive ->> 'consent_text_sha256', '');
      if v_sensitive_version is null or v_sensitive_consent_text is null
         or v_sensitive_consent_hash is null
         or v_sensitive_consent_hash <> encode(extensions.digest(v_sensitive_consent_text, 'sha256'), 'hex') then
        raise exception using errcode = '23514', message = 'support_consent_invalid';
      end if;
      perform 1
      from public.legal_document_versions as legal
      where legal.document_kind = 'accessibility_support'
        and legal.version = v_sensitive_version
        and legal.exact_text = v_sensitive_consent_text
        and legal.text_sha256 = v_sensitive_consent_hash
        and legal.is_active;
      if not found then
        raise exception using errcode = '23514', message = 'support_consent_version_not_active';
      end if;
    end if;
  end if;

  v_new_id := coalesce(nullif(p_registration ->> 'id', '')::uuid, gen_random_uuid());
  v_reference := coalesce(
    nullif(p_registration ->> 'reference_code', ''),
    'ACH-' || upper(encode(gen_random_bytes(5), 'hex'))
  );
  v_has_cv := nullif(p_registration ->> 'expected_cv_object_path', '') is not null;
  if v_cv_accepted and not v_has_cv then
    raise exception using errcode = '23514', message = 'cv_consent_requires_document';
  end if;
  if v_has_cv and (p_registration ->> 'expected_cv_object_path') not like
     ('intents/' || v_new_id::text || '/%.pdf') then
    raise exception using errcode = '23514', message = 'cv_object_path_invalid';
  end if;

  insert into public.registrations as inserted_registration (
    id,
    reference_code,
    idempotency_key,
    request_fingerprint,
    submission_state,
    full_name,
    email,
    organization,
    role_or_course,
    graduation_year,
    country,
    city,
    github_portfolio_url,
    linkedin_url,
    team_status,
    team_name,
    technical_background,
    availability_online,
    availability_london,
    rules_accepted,
    privacy_accepted,
    cv_share_opt_in,
    privacy_notice_version,
    rules_version,
    expected_cv_object_path,
    expected_cv_original_filename,
    expected_cv_size_bytes,
    expected_cv_mime_type,
    completion_token_hash,
    upload_expires_at,
    submitted_at
  ) values (
    v_new_id,
    v_reference,
    v_idempotency_key,
    v_request_fingerprint,
    case when v_has_cv then 'pending_upload' else 'submitted' end,
    p_registration ->> 'full_name',
    lower(p_registration ->> 'email'),
    p_registration ->> 'organization',
    p_registration ->> 'role_or_course',
    nullif(p_registration ->> 'graduation_year', '')::smallint,
    p_registration ->> 'country',
    p_registration ->> 'city',
    p_registration ->> 'github_portfolio_url',
    nullif(p_registration ->> 'linkedin_url', ''),
    v_team_status,
    nullif(p_registration ->> 'team_name', ''),
    nullif(p_registration ->> 'technical_background', ''),
    (p_registration ->> 'availability_online')::boolean,
    (p_registration ->> 'availability_london')::boolean,
    true,
    true,
    v_cv_accepted,
    v_privacy_version,
    v_rules_version,
    case when v_has_cv then p_registration ->> 'expected_cv_object_path' else null end,
    case when v_has_cv then p_registration ->> 'expected_cv_original_filename' else null end,
    case when v_has_cv then (p_registration ->> 'expected_cv_size_bytes')::bigint else null end,
    case when v_has_cv then p_registration ->> 'expected_cv_mime_type' else null end,
    case when v_has_cv then p_registration ->> 'completion_token_hash' else null end,
    case when v_has_cv then v_now + interval '2 hours' else null end,
    case when v_has_cv then null else v_now end
  )
  on conflict (idempotency_key) do nothing
  returning inserted_registration.id into v_new_id;

  if v_new_id is null then
    select r.*
    into v_existing
    from public.registrations as r
    where r.idempotency_key = v_idempotency_key
    for update;
    if not found or v_existing.request_fingerprint <> v_request_fingerprint then
      raise exception using errcode = '23505', message = 'idempotency_key_reused';
    end if;
    registration_id := v_existing.id;
    reference_code := v_existing.reference_code;
    submission_state := v_existing.submission_state;
    expected_cv_object_path := v_existing.expected_cv_object_path;
    upload_expires_at := v_existing.upload_expires_at;
    was_existing := true;
    return next;
    return;
  end if;

  insert into public.registration_teammates (
    registration_id,
    position,
    full_name,
    email
  )
  select
    v_new_id,
    (teammate.ordinality - 1)::smallint,
    teammate.value ->> 'full_name',
    lower(teammate.value ->> 'email')
  from jsonb_array_elements(p_teammates) with ordinality as teammate(value, ordinality);

  if v_sensitive_text is not null then
    insert into public.registration_sensitive_details (
      registration_id,
      accessibility_dietary,
      explicit_consent_at,
      consent_version,
      consent_text_snapshot,
      consent_text_sha256
    ) values (
      v_new_id,
      v_sensitive_text,
      v_now,
      v_sensitive_version,
      v_sensitive_consent_text,
      v_sensitive_consent_hash
    );
  end if;

  for v_item in select item.value from jsonb_array_elements(v_consent_items) as item(value)
  loop
    v_kind := v_item ->> 'consent_kind';
    v_accepted := (v_item ->> 'accepted')::boolean;
    insert into public.registration_consents (
      registration_id,
      consent_kind,
      accepted,
      decision_at,
      accepted_at,
      document_version,
      text_snapshot,
      text_sha256,
      privacy_notice_version,
      privacy_notice_text_snapshot,
      privacy_notice_text_sha256
    ) values (
      v_new_id,
      v_kind,
      v_accepted,
      v_now,
      case when v_accepted then v_now else null end,
      v_item ->> 'document_version',
      v_item ->> 'text_snapshot',
      v_item ->> 'text_sha256',
      v_privacy_version,
      v_privacy_text,
      v_privacy_hash
    );
  end loop;

  select r.* into v_existing
  from public.registrations as r
  where r.id = v_new_id;
  registration_id := v_existing.id;
  reference_code := v_existing.reference_code;
  submission_state := v_existing.submission_state;
  expected_cv_object_path := v_existing.expected_cv_object_path;
  upload_expires_at := v_existing.upload_expires_at;
  was_existing := false;
  return next;
end;
$$;

-- Serialises each scope/fingerprint counter with an advisory transaction lock so
-- concurrent requests cannot all pass the same count check.
create or replace function public.consume_registration_rate_limit(
  p_ip_fingerprint text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_ip_fingerprint !~ '^[a-f0-9]{64}$'
     or p_scope not in ('start', 'complete')
     or p_limit < 1 or p_limit > 100
     or p_window_seconds < 60 or p_window_seconds > 86400 then
    raise exception using errcode = '22023', message = 'rate_limit_arguments_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_scope || ':' || p_ip_fingerprint, 0));
  select count(*)::integer into v_count
  from public.registration_attempts as attempt
  where attempt.attempt_scope = p_scope
    and attempt.ip_fingerprint = p_ip_fingerprint
    and attempt.created_at >= now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;
  insert into public.registration_attempts (attempt_scope, ip_fingerprint)
  values (p_scope, p_ip_fingerprint);
  return true;
end;
$$;

-- Records the lifetime of every upload capability before the Storage token is
-- minted. A replay can safely receive a fresh token without outliving the
-- eventual object-cleanup tombstone.
create or replace function public.reserve_cv_upload_capability(
  p_registration_id uuid,
  p_completion_token_hash text
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_reserved uuid;
begin
  update public.registrations as registration
  set upload_capability_expires_at = greatest(
    coalesce(registration.upload_capability_expires_at, '-infinity'::timestamptz),
    now() + interval '2 hours'
  )
  where registration.id = p_registration_id
    and registration.submission_state = 'pending_upload'
    and registration.completion_token_hash = p_completion_token_hash
    and registration.upload_expires_at > now()
  returning registration.id into v_reserved;
  return v_reserved is not null;
end;
$$;

-- Claims a short verification lease before the server downloads/parses a CV.
-- A crashed worker releases itself automatically when the lease expires.
create or replace function public.claim_cv_verification(
  p_registration_id uuid,
  p_completion_token_hash text
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_claimed uuid;
begin
  update public.registrations as registration
  set verification_lease_expires_at = now() + interval '2 minutes'
  where registration.id = p_registration_id
    and registration.submission_state = 'pending_upload'
    and registration.completion_token_hash = p_completion_token_hash
    and registration.upload_expires_at > now()
    and (
      registration.verification_lease_expires_at is null
      or registration.verification_lease_expires_at <= now()
    )
  returning registration.id into v_claimed;
  return v_claimed is not null;
end;
$$;

create or replace function public.release_cv_verification(
  p_registration_id uuid,
  p_completion_token_hash text
)
returns void
language sql
security invoker
set search_path = pg_catalog
as $$
  update public.registrations as registration
  set verification_lease_expires_at = null
  where registration.id = p_registration_id
    and registration.submission_state = 'pending_upload'
    and registration.completion_token_hash = p_completion_token_hash;
$$;

-- Atomically claims a pending registration, records one verified CV, and advances
-- exactly one locked row to submitted. The completion-token hash remains private
-- so a successful completion can be replayed idempotently.
create or replace function public.finalize_registration(
  p_registration_id uuid,
  p_completion_token_hash text,
  p_document jsonb
)
returns table (
  registration_id uuid,
  reference_code text,
  email text,
  full_name text,
  idempotency_key uuid,
  submission_state text,
  was_existing boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, extensions, public, pg_temp
as $$
declare
  v_registration public.registrations%rowtype;
  v_object_path text;
  v_size_bytes bigint;
  v_mime_type text;
  v_sha256 text;
  v_updated_id uuid;
begin
  if p_completion_token_hash is null
     or p_completion_token_hash !~ '^[a-f0-9]{64}$'
     or p_document is null
     or jsonb_typeof(p_document) <> 'object' then
    raise exception using errcode = '22023', message = 'finalization_payload_invalid';
  end if;

  select r.*
  into v_registration
  from public.registrations as r
  where r.id = p_registration_id
  for update;

  if not found or v_registration.completion_token_hash is distinct from p_completion_token_hash then
    raise exception using errcode = '22023', message = 'upload_session_invalid';
  end if;

  v_object_path := nullif(p_document ->> 'object_path', '');
  v_size_bytes := nullif(p_document ->> 'size_bytes', '')::bigint;
  v_mime_type := nullif(p_document ->> 'mime_type', '');
  v_sha256 := nullif(p_document ->> 'sha256', '');
  if v_object_path is null or v_size_bytes is null
     or v_mime_type is distinct from 'application/pdf'
     or v_sha256 is null or v_sha256 !~ '^[a-f0-9]{64}$'
     or v_object_path <> v_registration.expected_cv_object_path
     or v_size_bytes <> v_registration.expected_cv_size_bytes
     or v_mime_type is distinct from v_registration.expected_cv_mime_type then
    raise exception using errcode = '23514', message = 'verified_cv_mismatch';
  end if;

  if v_registration.submission_state = 'submitted' then
    perform 1
    from public.registration_documents as document
    where document.registration_id = v_registration.id
      and document.document_kind = 'cv'
      and document.object_path = v_object_path
      and document.size_bytes = v_size_bytes
      and document.mime_type = v_mime_type
      and document.sha256 = v_sha256
      and document.deleted_at is null;
    if not found then
      raise exception using errcode = '23514', message = 'finalization_state_conflict';
    end if;
    registration_id := v_registration.id;
    reference_code := v_registration.reference_code;
    email := v_registration.email::text;
    full_name := v_registration.full_name;
    idempotency_key := v_registration.idempotency_key;
    submission_state := v_registration.submission_state;
    was_existing := true;
    return next;
    return;
  end if;

  if v_registration.submission_state <> 'pending_upload'
     or v_registration.upload_expires_at is null
     or v_registration.upload_expires_at <= now() then
    raise exception using errcode = '22023', message = 'upload_session_expired';
  end if;

  insert into public.registration_documents (
    registration_id,
    document_kind,
    bucket_id,
    object_path,
    original_filename,
    size_bytes,
    mime_type,
    sha256,
    scan_status
  ) values (
    v_registration.id,
    'cv',
    'registration-cvs',
    v_object_path,
    v_registration.expected_cv_original_filename,
    v_size_bytes,
    v_mime_type,
    v_sha256,
    'unscanned'
  );

  update public.registrations as registration
  set submission_state = 'submitted',
      submitted_at = now(),
      upload_expires_at = null,
      verification_lease_expires_at = null
  where registration.id = v_registration.id
    and registration.submission_state = 'pending_upload'
  returning registration.id into v_updated_id;

  if v_updated_id is null then
    raise exception using errcode = '40001', message = 'registration_finalization_race';
  end if;

  registration_id := v_registration.id;
  reference_code := v_registration.reference_code;
  email := v_registration.email::text;
  full_name := v_registration.full_name;
  idempotency_key := v_registration.idempotency_key;
  submission_state := 'submitted';
  was_existing := false;
  return next;
end;
$$;

-- Service-only bridge for the cleanup worker; the private schema itself remains
-- outside the exposed Data API schemas.
create or replace function public.list_storage_cleanup_queue(p_limit integer default 100)
returns table (object_path text)
language sql
security definer
set search_path = pg_catalog
as $$
  select queue.object_path
  from private.storage_cleanup_queue as queue
  where queue.delete_after <= now()
  order by queue.delete_after, queue.queued_at
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

create or replace function public.ack_storage_cleanup(p_object_paths text[])
returns integer
language sql
security definer
set search_path = pg_catalog
as $$
  with deleted as (
    delete from private.storage_cleanup_queue as queue
    where queue.object_path = any(coalesce(p_object_paths, array[]::text[]))
    returning 1
  )
  select count(*)::integer from deleted;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-cvs', 'registration-cvs', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client role receives access to registration data or the private CV bucket.
-- Signed upload tokens are created server-side for a single random object path.
alter table public.legal_document_versions enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_teammates enable row level security;
alter table public.registration_sensitive_details enable row level security;
alter table public.registration_consents enable row level security;
alter table public.registration_documents enable row level security;
alter table public.admin_memberships enable row level security;
alter table public.registration_reviews enable row level security;
alter table public.registration_status_events enable row level security;
alter table public.email_outbox enable row level security;
alter table public.registration_attempts enable row level security;
alter table public.cv_disclosures enable row level security;
alter table private.storage_cleanup_queue enable row level security;

alter table public.legal_document_versions force row level security;
alter table public.registrations force row level security;
alter table public.registration_teammates force row level security;
alter table public.registration_sensitive_details force row level security;
alter table public.registration_consents force row level security;
alter table public.registration_documents force row level security;
alter table public.admin_memberships force row level security;
alter table public.registration_reviews force row level security;
alter table public.registration_status_events force row level security;
alter table public.email_outbox force row level security;
alter table public.registration_attempts force row level security;
alter table public.cv_disclosures force row level security;
alter table private.storage_cleanup_queue force row level security;

revoke all privileges on table
  public.legal_document_versions,
  public.registrations,
  public.registration_teammates,
  public.registration_sensitive_details,
  public.registration_consents,
  public.registration_documents,
  public.admin_memberships,
  public.registration_reviews,
  public.registration_status_events,
  public.email_outbox,
  public.registration_attempts,
  public.cv_disclosures
from anon, authenticated;
revoke all privileges on sequence
  public.registration_status_events_id_seq,
  public.registration_attempts_id_seq
from anon, authenticated;
revoke all privileges on table private.storage_cleanup_queue from public, anon, authenticated;
revoke execute on function private.set_updated_at() from public, anon, authenticated;
revoke execute on function private.record_registration_status() from public, anon, authenticated;
revoke execute on function private.queue_registration_storage_cleanup() from public, anon, authenticated;
revoke execute on function public.create_registration(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.consume_registration_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.reserve_cv_upload_capability(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_cv_verification(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_cv_verification(uuid, text) from public, anon, authenticated;
revoke execute on function public.finalize_registration(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.list_storage_cleanup_queue(integer) from public, anon, authenticated;
revoke execute on function public.ack_storage_cleanup(text[]) from public, anon, authenticated;

grant usage on schema public to service_role;
grant usage on schema private to service_role;
grant all privileges on table
  public.legal_document_versions,
  public.registrations,
  public.registration_teammates,
  public.registration_sensitive_details,
  public.registration_consents,
  public.registration_documents,
  public.admin_memberships,
  public.registration_reviews,
  public.registration_status_events,
  public.email_outbox,
  public.registration_attempts,
  public.cv_disclosures,
  private.storage_cleanup_queue
to service_role;
grant all privileges on sequence
  public.registration_status_events_id_seq,
  public.registration_attempts_id_seq
to service_role;
grant execute on function private.set_updated_at() to service_role;
grant execute on function private.record_registration_status() to service_role;
grant execute on function private.queue_registration_storage_cleanup() to service_role;
grant execute on function public.create_registration(jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.consume_registration_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.reserve_cv_upload_capability(uuid, text) to service_role;
grant execute on function public.claim_cv_verification(uuid, text) to service_role;
grant execute on function public.release_cv_verification(uuid, text) to service_role;
grant execute on function public.finalize_registration(uuid, text, jsonb) to service_role;
grant execute on function public.list_storage_cleanup_queue(integer) to service_role;
grant execute on function public.ack_storage_cleanup(text[]) to service_role;

comment on table public.registration_sensitive_details is
  'Participation-support data kept separate from routine reviewer access; may contain special-category information.';
comment on table public.registration_reviews is
  'Private, admin-ready review model. No public dashboard or client permissions are provided.';
comment on table public.cv_disclosures is
  'Append-only audit record for a future organizer-controlled Optiver CV disclosure workflow.';
