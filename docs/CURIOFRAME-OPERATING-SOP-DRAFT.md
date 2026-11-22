# CurioFrame AI — Operating SOP (Draft 0.1)

**Status:** Draft for Founder review  
**Operating principle:** SOP → Integrasi → Automasi → Monitoring  
**Budget constraint:** Rp0 start-up budget. No paid connector, API, scheduler, subscription, or billing commitment without explicit Founder approval.  
**Publication rule:** No public post, client-facing delivery, profile change, or paid action without the required Founder approval.

## 1. Business operating model

CurioFrame runs three connected work systems:

1. **Research** — discover topics and customer needs, collect primary/credible sources, verify claims, and produce research briefs.
2. **Content Production** — turn approved briefs into scripts, captions, visual/production instructions, and final assets.
3. **Digital Marketing & Distribution** — maintain channel/customer records, prepare campaign plans, schedule approved content, monitor results, and report outcomes.

The Founder sets direction, approves consequential decisions and final publication, and handles human-only verification (OTP, CAPTCHA, identity checks, account ownership, and platform consent). Agents may prepare recommendations and drafts but may not impersonate the Founder or bypass platform controls.

## 2. End-to-end workflow

### A. Business data and performance reporting

**Proposed flow:** Google Business Profile (where CurioFrame or an authorized client actually manages a profile) → Windsor.ai (only if the required connector and a genuinely free tier are confirmed) → Google Sheets → Google Drive.

1. **Account authorization**
   - Operations records the profile owner/client, authorized scope, account identifier, consent date, and permitted data fields.
   - Never request or store a Google password in CurioFrame.
   - Do not connect a client profile without documented authorization.
2. **Data extraction**
   - Data Integration checks connector availability, refresh schedule, quota, pricing, and field coverage before activation.
   - If Windsor.ai is not available at Rp0, stop at this gate. Use an approved manual CSV export or another verified no-cost route; do not silently switch to a paid plan.
3. **Normalization in Sheets**
   - Keep raw imports separate from cleaned reporting tables.
   - Minimum columns: source, account_id, location_id, metric_date, metric_name, metric_value, currency/unit, imported_at, source_updated_at, and validation_status.
   - Prevent duplicate imports using a stable source/account/date/metric key.
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
8. **Operational acceptance** — test on Android and desktop, including stale data, disconnects, failures, recovery, and permissions.

## 7. Founder decisions still required

- Which Google Business Profile(s) are in scope: CurioFrame's own profile, client profiles, or both?
- Is Windsor.ai mandatory, or may the integration use another verified Rp0 source if Windsor is paid/limited?
- Which content channels and scheduler are the first publishing targets?
- What reporting cadence and timezone should be used?
- What exact content types/services are included in the first pilot?

Until these are decided, integrations stay disconnected and publishing automation stays disabled.
