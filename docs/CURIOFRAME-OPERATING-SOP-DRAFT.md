# CurioFrame AI — Operating SOP (Draft 0.1)

**Status:** Draft for Founder review  
**Operating principle:** SOP → Integrasi → Automasi → Monitoring  
**Budget constraint:** Rp0 start-up budget and free-only operating baseline. Use only genuinely free ongoing tiers; no paid connector, API, scheduler, subscription, auto-converting trial, payment method, or usage charge without separate explicit Founder approval.  
**Publication rule:** No public post, client-facing delivery, profile change, or paid action without the required Founder approval.

## 1. Business operating model

CurioFrame runs three connected work systems:

1. **Research** — discover topics and customer needs, collect primary/credible sources, verify claims, and produce research briefs.
2. **Content Production** — turn approved briefs into scripts, captions, visual/production instructions, and final assets.
3. **Digital Marketing & Distribution** — maintain channel/customer records, prepare campaign plans, schedule approved content, monitor results, and report outcomes.

The Founder sets direction, approves consequential decisions and final publication, and handles human-only verification (OTP, CAPTCHA, identity checks, account ownership, and platform consent). Agents may prepare recommendations and drafts but may not impersonate the Founder or bypass platform controls.

## 2. End-to-end workflow

### A. Business data and performance reporting

**Scope confirmed by Founder:** both (1) CurioFrame-owned Google Business Profile locations and (2) client-owned locations that CurioFrame is explicitly authorized to manage.

**Proposed flow:** CurioFrame/client Google Business Profiles → Windsor.ai (subject to account, connector, quota, and free-tier limits) → Google Sheets → Google Drive. CurioFrame and every client are separate data tenants; a shared integration pipeline must never mean shared visibility or mixed reporting.

1. **Account authorization**
   - Operations creates a separate client record for each business and records the legal/business owner, primary contact, Google account/manager identity, Business Profile account and location IDs, authorized scope, consent evidence, consent date, and permitted data fields.
   - For CurioFrame-owned locations, record CurioFrame as data owner. For client locations, the client remains data owner and CurioFrame acts only within written authorization.
   - Client onboarding documents included locations, permitted reporting period, permitted users, whether review/post management is included, retention expectations, and access revocation.
   - Never request or store a Google password in CurioFrame. The owner/authorized manager completes Google's or Windsor's own OAuth/authorization flow.
   - Do not connect, import, modify, or report on a client profile without documented authorization.
2. **Data extraction**
   - Data Integration verifies connector availability, refresh schedule, quota, field coverage, account mapping, and plan limits before activation.
   - Windsor.ai documentation currently describes a 30-day expanded free trial (up to 10 sources and 15 accounts) that steps down to Forever Free with 1 user, 1 data source, and 1 account. Its pricing page says 10 Google Business Profile locations count as 1 account. Do not assume Forever Free can serve multiple independently authorized client Google accounts. Verify actual account counting and tenant arrangement before promising ongoing multi-client sync. Sources: https://windsor.ai/pricing/ and https://windsor.ai/documentation/how-to-start-for-free.
   - The initial 30-day trial is not the long-term operating baseline. The default is not to start a trial that requires a payment method or can auto-convert to a paid plan. Design the pilot around verified ongoing free limits.
   - If the free plan cannot cover required CurioFrame + client accounts at steady state, use an approved manual export or another verified Rp0 route; do not silently switch to a paid plan.
3. **Normalization in Sheets**
   - Keep raw imports separate from cleaned reporting tables. Every row carries tenant_id/client_id and profile_location_id.
   - Minimum columns: tenant_id, client_id, source, Google account_id, Business Profile location_id, metric_date, metric_name, metric_value, currency/unit, imported_at, source_updated_at, sync_run_id, and validation_status.
   - Default to separate client spreadsheets/workbooks and Drive folders to reduce accidental disclosure. Never expose one client's metrics, reviews, or profile identifiers to another client.
   - Prevent duplicate imports using a stable tenant/source/account/location/date/metric key.
   - Apply least-privilege access: a client sees only its own data; CurioFrame staff see client data only when their role and engagement require it.
4. **Validation**
   - Check date coverage, missing values, duplicates, unexpected zeroes, and source freshness.
   - Mark incomplete data as partial or stale; never present it as live/complete.
5. **Archiving in Drive**
   - Store dated raw exports and validated report snapshots in separate folders.
   - Keep an import log with run ID, row count, status, and error details.

### B. Research → Content Production

1. Research receives a topic/customer objective and creates a brief with audience, intent, claims, source URLs, publication risks, and recommendation.
2. Research QA verifies that every factual claim has traceable evidence. Unverified claims are labelled and blocked from factual scripts.
3. Content receives only an approved research brief and produces the requested script/caption/production pack.
4. QC checks accuracy against sources, English quality, originality, brand fit, platform format, and rights/safety risks.
5. Failed QC returns the asset for revision with itemized reasons. The creator cannot approve its own work.
6. A passing asset enters awaiting_founder_approval. Approval is recorded with reviewer, timestamp, version, and decision.

### C. Approval → Scheduling → Publishing

1. Distribution checks channel ownership, account readiness, format, caption, media, destination, and scheduled time.
2. Only a Founder-approved immutable asset version may enter the scheduling queue.
3. Scheduler/API integration remains disabled until its actual cost, free quota, permissions, and platform policy are verified and explicitly approved.
4. A schedule is not a publication. Record distinct states: draft, awaiting_approval, approved, scheduled, published, failed, and cancelled.
5. After publication, store the platform post ID, URL, actual publication time, and result. Never mark a post published based only on a scheduler response that does not confirm publication.

### D. Performance feedback loop

1. Import authorized platform metrics on the configured schedule.
2. Validate data and write a dated snapshot to Sheets/Drive.
3. Research and Marketing agents summarize changes, trends, and possible explanations, distinguishing measured facts from hypotheses.
4. Recommendations may create new research briefs or campaign proposals; they do not automatically change strategy, spend, or publish content.
5. Founder reviews the performance report and sets the next priority.

## 3. Workflow status contract for the Virtual Office

The 3D office must visualize real CurioFrame records, not decorative claims of activity.

| Office state | Required evidence |
|---|---|
| Idle | Agent has no active claimed task |
| Queued | A task is assigned/queued but not claimed |
| Working | A task is actively claimed and has a current execution record |
| Reviewing | A deliverable is waiting for an independent QC/QA review |
| Collaborating | A recorded handoff, meeting, or multi-agent workflow step is active |
| Blocked | A blocker/error record exists, with reason and owner |
| Offline | Agent/runtime heartbeat is absent or explicitly offline |

- Agent movement is triggered by a real state/location transition (for example: task claimed → workstation; review requested → QA desk; collaboration event → meeting room).
- Decorative idle animations may exist, but must never be represented as real task execution.
- Each agent identity, department, station, active assignment, last heartbeat, and latest deliverable must come from CurioFrame's database/runtime.
- The UI must distinguish connected, subscribed, and received_database_event. A channel subscription alone is not proof of live activity.

## 4. Virtual Office product requirements

The intended experience is a full-screen, isometric 3D office inspired by Ruang's public MIT-licensed visual implementation:

- Real rooms and furnishing (workstations, desks, monitors, meeting room, lounge, pantry, and department zones).
- One identifiable character/station per CurioFrame Agent; 28 agents across 11 departments.
- Character poses and movement reflect the workflow status contract above.
- Tap/click an agent to inspect role, skills, task, status evidence, task history, and deliverables.
- Mission Control overlays for Crew, Stats, Activity, Tasks, and Calendar.
- Orbit, zoom, pan, floor/department navigation, and mobile touch controls.
- Responsive full-screen mode on Android.
- Reduced-motion and WebGL fallback to a usable 2D crew/task view.

**Architecture boundary:** reuse/adapt the Ruang 3D presentation approach and procedural scene assets with MIT attribution. Do not import Ruang's Hermes CLI server, local profile access, or read-only backend. CurioFrame continues to use its own Supabase authentication, RLS, database, task orchestration, policy gates, and audit trail.

## 5. Automation gates and failure handling

- No workflow may skip a required predecessor state.
- Every automated run records run ID, trigger, inputs/source versions, agent, start/end time, result, and errors.
- Retries must be idempotent; a retry must not duplicate a report, task, or public post.
- Missing credentials, expired authorization, quota exhaustion, stale input, QA failure, or uncertain publication status must fail closed and create a visible blocker.
- External integrations are read-only by default. Write scopes require a separate explicit approval and least-privilege review.
- No paid service or API is enabled under the Rp0 policy unless the Founder explicitly changes that policy.

## 6. Integration rollout order

1. **SOP and data contract** — approve workflow, roles, states, ownership, and approval gates.
2. **Manual baseline** — run one complete sample using manually exported/entered data; verify Sheets schema and Drive archive.
3. **Free-tier verification** — verify each connector/scheduler's current plan, quota, permissions, and limitations before connecting it.
4. **Read-only integration** — connect one authorized source and reconcile imported records against the source.
5. **Workflow automation** — automate validation, report generation, task handoffs, and notifications.
6. **Virtual Office** — build the Ruang-style 3D client and bind its characters/panels to real CurioFrame data/events.
7. **Controlled publishing** — only after approval gates, idempotency, audit, and zero-cost checks pass.
8. **Multi-tenant authorization pilot** — first connect one CurioFrame-owned location and one consenting client location (only after authorization and plan limits are confirmed); verify dataset isolation end to end.
9. **Operational acceptance** — test on Android and desktop, including stale data, disconnects, failures, recovery, tenant isolation, consent revocation, and permissions.

## 7. Confirmed scope and remaining Founder decisions

**Confirmed:** Google Business Profile scope includes both CurioFrame's own profile(s) and client profiles, with separate ownership, authorization, and data isolation.

**Still to decide:**
- **Free-only decision confirmed by Founder:** use only services, connectors, APIs, and quotas that can be operated at Rp0 on an ongoing basis. Windsor.ai may be used only if its ongoing free tier genuinely supports the required workload; otherwise choose a verified free alternative or a manual export workflow. Do not start a paid trial that can auto-convert to billing, enter payment details, upgrade, or incur usage charges without separate explicit Founder approval.
- Which content channels and scheduler are the first publishing targets?
- What reporting cadence and timezone should be used?
- What exact content types/services are included in the first pilot?

Until the remaining decisions are made and access is authorized, integrations stay disconnected and publishing automation stays disabled.

## 8. Multi-tenant integration design (initial data contract)

The following is a proposed design, not a deployed database schema:

- **Tenant boundary:** tenant_id identifies CurioFrame or a client organization. Client data must be filtered and protected server-side; hiding rows in the UI is not a security boundary.
- **Business profile registry:** store tenant_id, profile_owner_type (CurioFrame/client), client_id (nullable only for CurioFrame), Google account ID, location ID, display name, connection ID, authorization status, allowed scopes, consent reference, and revoked_at.
- **Connection registry:** store provider, connector account reference, tenant mapping, granted scopes, connected_by, connected_at, last_verified_at, status, and revocation state. Do not store Google passwords or expose OAuth tokens to the browser.
- **Sync run ledger:** store tenant_id, connection_id, started_at, completed_at, date range, rows fetched, result, freshness, and error summary. Each run must be traceable to its source and destination.
- **Metrics and review records:** every metric/review/post row must include tenant_id and location_id. Keep raw source payloads access-controlled and apply a documented retention policy.
- **Access control:** enforce tenant isolation with Supabase RLS and server-side authorization. Test cross-tenant reads and writes before pilot acceptance.
- **Revocation:** when a client ends authorization, stop future syncs, revoke connector authorization where supported, mark the connection revoked, and follow the agreed data export/retention/deletion process. Preserve audit records without retaining unnecessary client content.
- **Read/write separation:** reporting sync is read-only. Review replies, post publishing, photo uploads, profile edits, and business-hour changes are separate write capabilities; each requires explicit client authorization and the relevant CurioFrame approval gate. No write action is enabled by this reporting integration by default.

## 9. Department responsibility and handoff matrix

The following maps the 28 registered employee identities to their current 11 departments. Registration is not proof of capability; every role remains planned until its work sample and independent QA are passed.

| Department | Registered roles | Accountable output / handoff |
|---|---|---|
| Executive Office | AI CEO / Orchestrator; Chief of Staff | Prioritized company goals, task routing, exception summaries, Founder decision briefs. AI CEO may coordinate but cannot override policy gates. |
| Research & Insights | Research Officer | Research brief, source register, claim-to-source mapping, opportunity recommendation → Content Production. |
| Content Production | Content Officer; Scriptwriter; Video Editor; Voice-over Producer | Script, narration/voice plan, edit/visual package, final content asset → Quality & Compliance. |
| Quality & Compliance | Quality Manager; QC Officer; QA Officer; Legal & Platform Compliance Agent | Independent factual, language, production, rights, safety, and platform-policy review → revision or approval queue. |
| Distribution Network | Distribution Officer; Distribution Analyst | Channel readiness, approved publishing queue, publication evidence, performance dataset → Marketing & Growth. |
| Marketing & Growth | Marketing Officer; Marketing Strategist; SEO & Discovery Specialist; Social Growth Analyst | Audience strategy, metadata/discovery package, organic experiments, performance interpretation → Executive Office and Research. |
| Advertising & Partnerships | Advertiser Acquisition Specialist; Brand Partnership Manager; Campaign Coordinator; Sponsorship & Endorsement Manager | Prospect research, media kit, campaign and partnership proposals → Client Services / Founder approval. No outreach commitment or paid campaign without approval. |
| Client Services | Client Acquisition Agent; Client Project Manager; Client Relations Agent | Lead qualification, scope/onboarding, client consent records, delivery coordination, client report → relevant delivery department. |
| Engineering & Automation | Development Engineer | Internal tools, integrations, workflow reliability, access controls, incident fixes → Operations and Founder review for material changes. |
| Finance | Finance Officer; Finance Analyst | Income/expense ledger, zero-cost checks, budget visibility, financial commitment review → Founder. |
| Operations & Administration | Operations Officer | SOP upkeep, task records, handoff tracking, run logs, incident register, operational reporting → Executive Office. |

### Decision rights (RACI baseline)

- **Founder (Accountable):** company direction, final publication, client commitments, scope/pricing, spending, paid upgrades, paid API use, advertising spend, sensitive account permissions, and material policy exceptions.
- **AI CEO / Orchestrator (Responsible for coordination):** break approved goals into tasks, assign work, enforce dependencies, surface blockers, and prepare decision briefs. It is not authorized to approve its own exceptions.
- **Department Agent (Responsible for production):** create only the deliverable defined in its task brief and attach evidence, source references, and completion notes.
- **Quality & Compliance (Independent reviewer):** review work it did not produce; return failed items with specific reasons. A creator cannot approve its own deliverable.
- **Operations (Process custodian):** ensure each handoff, status change, approval, and incident is recorded.
- **Finance (Control):** verify free-tier and zero-spend constraints before any provider or integration is enabled.
- **Client owner (Data authority):** grants/revokes access to client-owned profiles and confirms permitted service scope. CurioFrame cannot grant itself client permissions.

## 10. Standard task lifecycle and handoff contract

Every work item must have: a unique task ID; objective; requester; accountable department; assigned agent; input references; expected artifact(s); acceptance criteria; due date/priority where applicable; policy classification; and audit trail.

1. **Intake:** Operations or the originating department records the request and checks that the objective, owner, inputs, and expected output are clear. Incomplete briefs are returned for clarification, not silently guessed.
2. **Triage:** Executive Office prioritizes the request, confirms dependencies and capacity, and routes it to the responsible department.
3. **Execution:** The assigned Agent may claim a queued task only when its capability is verified for that task type and all required free-tier/policy preflights pass. Otherwise the task remains queued or becomes blocked with a reason.
4. **Submission:** The Agent attaches the deliverable, source/evidence references, version, assumptions, and a concise completion summary. A status change alone is not a deliverable.
5. **Independent review:** QC/QA checks the acceptance criteria and evidence. A failed review returns the task to the creator with itemized corrections; a passed review records reviewer, timestamp, rubric, and result.
6. **Founder decision:** Work requiring publication, external communication, client commitment, account write access, policy exception, or financial commitment enters an approval queue. Approval must identify the exact version and action being authorized.
7. **Release / close:** Only the approved version is released or scheduled. The task closes only when the required artifact, review, approval (if required), and outcome evidence are recorded.
8. **Learning loop:** Operations records recurring failures and cycle-time issues; Research/Marketing may propose improvements, but process changes are versioned and approved by the Founder when they materially affect business policy.

### Allowed task state transitions

- queued → in_progress only after an eligible Agent claims the task and the execution record is created.
- in_progress → review only when a deliverable and evidence are attached.
- review → completed only after independent QA passes and all required approvals/release evidence exist.
- Any active state → blocked when inputs, permissions, quota, capability, QA, or external dependency is missing; the blocker must include reason, owner, and next action.
- blocked → queued only after the blocker is resolved and the task is safe to retry.
- cancelled requires a recorded reason and authorized requester.
- No task may be marked complete solely because an API returned HTTP success or an Agent reported that it finished.

## 11. Quality, evidence, and service-level rules

- Every factual Research output must include source URLs and a claim-to-source mapping. Unsupported claims are marked unverified and cannot pass factual QA.
- Every Content output must identify its approved brief, target audience/channel, asset version, rights/safety notes, and QC result.
- Every Distribution record must distinguish draft, awaiting approval, approved, scheduled, published, failed, and cancelled. A scheduled response is not proof of publication.
- Every client report must identify the tenant, authorized locations, reporting period, data freshness, missing fields, and source of each metric.
- Every integration run must log start/end, trigger, tenant, connector, date range, row counts, status, and errors without exposing credentials or unnecessary personal data.
- Default operating timezone for internal timestamps is UTC in the database; user-facing schedules and reports must explicitly display the selected local timezone. Until a channel-specific cadence is approved, no recurring publication or client-report schedule is enabled.
- No numerical SLA is promised until a pilot has measured actual capacity and cycle time. Initial pilots use explicit due dates and report actual completion time, blocked time, and QA pass rate.

## 12. SOP acceptance checklist

This SOP is ready for Founder review, but it is not approved for autonomous production until all of the following are true:

- [ ] Founder approves the department mandates, decision rights, and workflow boundaries.
- [ ] First pilot service, target audience, and deliverable package are selected.
- [ ] First content channel(s), publishing cadence, and reporting cadence are selected.
- [ ] Task lifecycle and required artifact fields are reflected in the live application and tested end to end.
- [ ] Each pilot Agent submits a real work sample and passes independent QA; no capability is inferred from its registered role.
- [ ] Client onboarding, written authorization, tenant isolation, and revocation are tested before any client data is connected.
- [ ] Every connector and scheduler is verified as ongoing Rp0 (not a time-limited trial) before activation.
- [ ] Failure, retry, stale data, and audit-log tests pass.
- [ ] Founder explicitly approves the SOP version and pilot launch.

**Current status:** Draft 0.2 — department accountability and task lifecycle documented; Founder approval and operational acceptance tests remain pending. No new integration, client data access, paid service, or publishing permission is activated by this document.
