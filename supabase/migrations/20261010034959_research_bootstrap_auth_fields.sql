-- Bootstrap verifies the server-authenticated account using only these Auth fields.
-- Keep passwords, metadata, tokens and other Auth columns inaccessible.
begin;
grant select (id, email, email_confirmed_at) on auth.users to service_role;
commit;
