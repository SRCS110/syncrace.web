# Onboarding database

The tables behind srcs.online/start (`clients`, `onboarding_invites`, `intake_submissions`,
`agreements`, `onboarding_events`) and the private `client-files` storage bucket live in the
srcs-cms Supabase project. They were created with the `client_onboarding` migration
(Supabase dashboard → Database → Migrations). Only `/api/onboard*` reads or writes them, with
the service-role key; RLS is on with no policies. Signed agreements can't be edited or deleted.
