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
The current workspace contains 28 registered AI employee records across 11 departments, Supabase-backed task and activity records, owner approval controls, and a browser-based Three.js Virtual HQ. Employee records are organizational identities, not proof of autonomous capability. As of the current maintenance audit, all 28 employees remain `planned`, all 28 work-sample assignments remain `queued`, and 0 capabilities are verified. Real execution, quality evidence, and operational readiness must be earned and recorded before any agent is marked active or autonomous.

The Virtual HQ is being upgraded toward a Ruang-inspired, cutaway 3D office with department rooms, individual workstations, and a Mission Control panel. The app keeps its existing Supabase data model and owner governance. AI provider requests remain behind server-side zero-cost policy gates; no provider call is made until the owner verifies that the request is covered by an active free allowance. Paid APIs, upgrades, spending, and publishing require explicit owner approval.

GitHub Pages deployment is managed by the repository's Actions workflow. The owner must verify the published site on a real Android browser because CI syntax checks do not prove WebGL rendering, touch controls, or live Supabase subscriptions work on-device.


## Repository structure
- `index.html` — responsive Company OS dashboard shell.
- `styles.css` — mobile-first dashboard styling and isometric Virtual HQ scene.
- `app.js` — Supabase authentication, live company data, task creation, and dashboard rendering.
- `supabase/schema.sql` — initial PostgreSQL schema with owner-scoped row-level security.

## Current build status
- [x] Dashboard foundation committed.
- [x] Responsive navigation and initial modules.
- [x] Company OS 2.0 Virtual HQ with database-driven employee/task indicators.
- [x] Initial database schema drafted.
- [x] Supabase project connection and initial schema deployment.
- [x] Owner authentication and live database-backed dashboard code.
- [x] GitHub Pages deployment workflow added.
- [ ] Configure the public site URL in Supabase Auth and verify first owner sign-in.
- [ ] Agent orchestration, model integration, and real task execution.

Dashboard metrics, employees, tasks, approvals, and content counts are intended to load from the authenticated owner's Supabase records. Employee role records describe planned responsibilities; they are not autonomous agents until orchestration and model integrations are implemented.


## Design reference
The Virtual HQ interaction and visual direction are informed by the open-source [Ruang](https://github.com/yugienugraha/ruang) virtual office project. CurioFrame maintains its own implementation, company data model, agent identities, access controls, and execution policies.