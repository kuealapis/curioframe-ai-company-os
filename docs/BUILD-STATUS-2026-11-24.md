# CurioFrame AI Build Status — 24 November 2026

## Scope of this build
Development is being performed on `mvp/owner-auth-workflow` and reviewed through pull request #9. The `main` branch has not been merged or deployed by this work session.

## Implemented in the development branch
- Finance & Revenue page:
  - Reads the latest 100 `finance_entries` for the active company workspace.
  - Records realized IDR income and actual expenses.
  - Shows recorded income, expense, and net totals.
  - Explicitly does not hold funds, connect to DANA, verify payment settlement, or initiate withdrawals.
- Sales & Clients page:
  - Records prospects, business/contact details, service interest, estimated deal value, next follow-up, and notes.
  - Tracks lead stages from lead through won/lost.
  - Clearly distinguishes estimated pipeline value from realized revenue.
  - Does not send outreach or proposals automatically.
- Owner sign-in UI:
  - Removes the in-app account creation path.
  - Preserves email/password sign-in and password recovery.
  - A restrictive owner-only RLS guard is now applied to all 21 RLS-enabled public tables. The configured Owner UUID was confirmed to exist before migration; verification found 21/21 restrictive guard policies.
- Finance date defaults use an explicit Asia/Jakarta date formatter.
- Responsive styles added for the mobile workspace.

## Database change
An additive migration created `public.client_leads` in the active Supabase project:
- Foreign key to the company workspace.
- Basic validation constraints and indexes.
- Row Level Security enabled.
- Authenticated access is restricted by the owning user's `companies.owner_id`.
- A separate owner-only restrictive RLS migration now limits authenticated access across all 21 RLS-enabled public tables to the verified CurioFrame Owner identity.
- Anonymous table privileges revoked; authenticated CRUD privileges granted.
- The security advisor returned the existing warnings for `pg_net` in the public schema and disabled leaked-password protection. These were not changed in this build.

## Validation
- Finance-only commit passed the existing GitHub Actions pipeline, including JavaScript syntax, Virtual Office build, and desktop/Android-sized browser smoke tests.
- Expanded Finance + Sales + Owner sign-in branch has a new GitHub Actions run; its final result must be recorded after completion.
- The live client_leads table was checked: RLS is enabled and the owner-scoped policy is present.

## Not yet production-ready
- The pull request is still open and unmerged.
- No production deployment was performed by this change.
- AI provider execution remains blocked by the Hard Zero-Cost Guard; no Gemini API calls or paid services were activated.
- Research URL retrieval can collect public HTML/text for human review; retrieval does not validate claims or source authority.
- Social account authorization, publishing, email/client outreach, DANA/payment wallet, and automated withdrawal are not connected.
- The company database currently contains two CurioFrame AI workspaces. The application selects the earliest workspace; the records have not been merged or deleted.
- The owner-only app UI and restrictive database policies protect company data; the Supabase Auth setting that disables account registration globally is still not verified through the available project-management controls.

## Cost and safety
- No paid services, API billing, advertising spend, or payment provider connections were activated.
- No secrets, API keys, PINs, OTPs, or payment credentials were added to the repository.
- No destructive database operations were performed.
