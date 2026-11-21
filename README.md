# CurioFrame AI — Company OS

An open-source foundation for an AI-operated digital media company, beginning with English-language educational facts content.

## Operating principles
- Owner: Arya
- Initial capital: IDR 0
- Prefer free and open-source tools where practical.
- Reinvest only realized business revenue.
- Automate routine work while reserving consequential decisions for owner approval.

## Core departments
1. **Research** — discover, verify, and prioritize topics.
2. **Content** — turn approved research into scripts and production assets.
3. **Digital Marketing** — package, distribute, and analyze published content.

## Workflow
Research → Content → Quality Review → Marketing → Owner approval when required → Publish → Performance analysis → Research feedback.

## Governance and security
- Never commit passwords, API keys, access tokens, or customer-sensitive information.
- Spending and paid subscriptions require owner approval.
- Track business income and expenses separately.
- This public repository contains source code and non-sensitive documentation only.

## Implementation status
This repository contains the first Company OS dashboard foundation. The dashboard now includes Supabase email/password authentication and live database-backed company records. AI agents, automated research/content execution, and publishing integrations are still future build stages.


## Repository structure
- `index.html` — responsive Company OS dashboard shell.
- `styles.css` — mobile-first dashboard styling.
- `app.js` — navigation, employee roster, sample task UI, and pipeline rendering.
- `supabase/schema.sql` — initial PostgreSQL schema with owner-scoped row-level security.

## Current build status
- [x] Dashboard foundation committed.
- [x] Responsive navigation and initial modules.
- [x] Initial database schema drafted.
- [x] Supabase project connection and initial schema deployment.
- [x] Owner authentication and live database-backed dashboard code.
- [x] GitHub Pages deployment workflow added.
- [ ] Configure the public site URL in Supabase Auth and verify first owner sign-in.
- [ ] Agent orchestration, model integration, and real task execution.

Dashboard metrics, employees, tasks, approvals, and content counts are intended to load from the authenticated owner's Supabase records. Employee role records describe planned responsibilities; they are not autonomous agents until orchestration and model integrations are implemented.
