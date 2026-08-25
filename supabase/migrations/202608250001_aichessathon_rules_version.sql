-- Publish the confirmed competition dates under a new rules version while
-- preserving prior registrations against the version they accepted.

begin;

update public.legal_document_versions
set is_active = false
where document_kind = 'rules_and_code'
  and is_active;

with rules_version(document_kind, version, exact_text, effective_at) as (values
  ('rules_and_code', '2026-08-25.v1',
   'I agree to comply with the AI Chessathon competition rules and code of conduct.',
   '2026-08-25T00:00:00Z'::timestamptz)
)
insert into public.legal_document_versions (
  document_kind,
  version,
  exact_text,
  text_sha256,
  effective_at,
  is_active
)
select
  document_kind,
  version,
  exact_text,
  encode(digest(exact_text, 'sha256'), 'hex'),
  effective_at,
  true
from rules_version;

commit;
