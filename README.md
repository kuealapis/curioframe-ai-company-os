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
This repository is the starting point for the Company OS. A live dashboard, database, integrations, and autonomous AI execution are not yet deployed.


## Repository structure
- `index.html` — responsive Company OS dashboard shell.
- `styles.css` — mobile-first dashboard styling.
- `app.js` — navigation, employee roster, sample task UI, and pipeline rendering.
- `supabase/schema.sql` — initial PostgreSQL schema with owner-scoped row-level security.

## Current build status
- [x] Dashboard foundation committed.
- [x] Responsive navigation and initial modules.
- [x] Initial database schema drafted.
- [ ] Supabase project connection and schema deployment.
- [ ] Authentication and live database-backed dashboard.
- [ ] Agent orchestration, model integration, and real task execution.
- [ ] Hosting and public deployment.

The current dashboard uses illustrative sample data in the browser. Do not treat sample tasks, approvals, employee statuses, or metrics as real company activity.
