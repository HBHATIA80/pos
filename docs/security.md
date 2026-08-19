# Security Standards

- Never commit `.env.local`, service-role keys, database passwords, or private credentials.
- Only public Supabase client configuration belongs in browser-exposed environment variables.
- Authentication and authorization decisions are server-side.
- Validate all user input on the server even when the browser validates it.
- Scope every protected business query to the authenticated shop/branch and permitted records.
- Use parameterized/database APIs; do not concatenate SQL from user input.
- Do not expose sensitive database errors directly to end users.
- Do not log passwords, auth tokens, secrets, or payment credentials.
- Financial and inventory mutations should be transactional and idempotency-aware where duplicate requests are possible.
- Use audit logs for privileged changes and document lifecycle changes.
- Keep customer access limited to their own records.
- Treat RLS policies as a required defense-in-depth layer.
