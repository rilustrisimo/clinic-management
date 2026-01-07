# Clinic Management System — Planning Doc (Apple‑like UI)

Date: 2025-09-28
Owner: Rouie Ilustrisimo
Status: Draft v0.2

## Vision
Build a modern, resilient Clinic Management System with an Apple‑like, calm and intuitive UX. One codebase powers desktop, tablet, and mobile via a responsive PWA. Operates offline on-prem with seamless background sync to the cloud.

## Product Pillars
- Speed: sub‑100ms perceived interactions, prefetching, optimistic UI.
- Trust: HIPAA‑minded security, auditable changes, least‑privilege access.
- Reliability: offline‑first, local fallback, background reconciliation.
- Simplicity: minimal, consistent UI; humane defaults; progressive disclosure.

---

## Architecture Overview
- Frontend: Next.js (App Router) + TailwindCSS + shadcn/ui + TanStack Query + PWA
- Backend/API: Next.js API routes (default) or NestJS service (optional split)
- Database: Supabase (Postgres, Auth, RLS, Realtime, Storage)
- On‑prem: Dockerized Postgres + Node.js API + same Next.js build
- Sync: BullMQ (Redis) worker pushing change_log to Supabase
- Hosting: Vercel (staging and production)
- CI/CD: GitHub Actions; Prisma Migrate for schema

High-level data flow:
1) Client (PWA) -> Next.js API (server) -> Supabase (cloud)
2) Local mode: Client -> Local API -> Local Postgres; sync worker -> Supabase

---

## UI/UX — Apple‑like Design System
Principles
- Clarity over chrome; content-first with calm surfaces and subtle depth.
- Speed by design: prefetch, optimistic interactions, low-latency perceived responses.
- Safety-critical UX: confirmation on destructive actions, clear statuses, undo where safe.
- Accessibility first: WCAG AA+, keyboard-first flows, large hit targets on mobile.
- Respect user preferences: reduced motion, high contrast, prefers-color-scheme.

Foundations
- Type: Inter / SF Pro (system stack). Sizes: 12/14/16/18/20/24/32.
- Color: Neutral base (zinc/stone), semantic accents; dark mode optional.
- Spacing: 4px grid; paddings 8/12/16/24. Radius 8–14px.
- Data formatting: locale-aware dates/times, currencies (PHP by default, configurable), and units.

Global App Shell
- Top bar: global search/jump-to patient, cmd+k command palette, offline/online indicator, notifications.
- Left dock: modules (role-aware), quick access to Queues, Labs, Checkout.
- Content header: context title, status chips, primary actions, breadcrumbs.

Role-based Home
- Frontdesk: Today’s schedule, Arrivals, Ready for Checkout queue, quick actions (register, walk-in, print ticket).
- Provider: My appointments, recent patients, calculators, orders.
- Nurse: Triage queue, vitals capture, preparation checklists.
- Lab Tech: Lab dashboard with Phlebotomy, Specimen Receiving, Analysis, Verification lanes; barcode scanning & label print shortcuts.
- Billing: Ready for Checkout list, invoices, payments, pricing admin link.

Information Architecture
- Dashboard
- Patients
- Appointments
- Visits & Queues (status-driven boards)
- Labs/Orders (catalog, orders, specimens, results)
- Inventory
- Billing / Checkout
- Reports
- Settings
- Admin (Catalog & Pricing)
- Calculators

Key Patterns & Components
- Table Pro: virtualized rows, sticky headers, inline filters, row actions.
- Form Pro: Zod schemas, inline validation, autosave, dirty-state guard.
- StatusStepper / VisitTimeline: shows visit status pipeline; clickable to view history.
- ChargeList + PriceChip + MoneyInput + DiscountControl: consistent billing UI.
- PaymentSheet + ReceiptPreview: checkout and printable receipts.
- CatalogPicker / PanelPicker / TestSearch with chips: lab quick-picks and panels; deselect items.
- SpecimenCard + LabelPreview + BarcodeInput: accessioning with label print (ZPL/TSPL payloads) and scan support.
- QueueBoard (kanban-like): lab and visit queues.
- FileAttachment (Storage), Toaster, Modal/Sheet patterns, Skeleton loaders.

Billing (Late Checkout)
- Provisional Charge Drawer accessible throughout care; add consult, labs, procedures, supplies.
- Price lookup from pricing tables; show sale price and (internal) cost basis; role-guarded overrides with reason.
- Checkout screen consolidates charges → invoice, applies discounts/insurance, captures payment, prints/touches receipt.

Labs UX (Complete Diagnostics)
- Quick-picks for common panels (CBC, UA, Hepatitis, Drug Test, etc.).
- Panel expansion with per-test deselect; unit toggles where applicable.
- Accession modal: specimen type, volume, timestamps; print labels; chain-of-custody events.
- Results entry: grid with units, reference ranges, flags; verification workflow and queue.

Inventory UX
- Add supplies from scanner/search; show stock, price, and low-stock badges.
- Movements are delta-only; consumption during procedures/labs updates stock and provisional charges.

Calculators UX
- Command palette action opens a sheet; inputs with unit toggles; one-click copy to notes/orders.

PWA & Offline
- Installable; app-shell caching; last N queries cached.
- Offline banner + queued mutations indicator; retry panel.
- Conflict handling surfaces: “match-or-add” reviewer with suggested matches (e.g., patient MRN, appointment time window).

Accessibility & Localization
- Keyboard shortcuts for power users; full screen-reader labels.
- Timezone-safe date/time controls; 12/24h display; currency formatting; i18n-ready copy.

Performance & Quality
- Interaction < 100ms perceived; route change < 500ms typical.
- Virtualize long lists; defer heavy modules; image/asset lazy-loading.
- Print templates: receipts, lab labels, and order forms; consistent margins and typography.

---

## Core Modules & Key Flows
1) Appointments
- Calendar (day/week/room views), waitlist, overbooking guard, SMS/email reminders.
- Conflict policy: last‑write‑wins; optimistic updates with server reconciliation.

2) Patients
- Demographics, contacts, insurance, medical history, attachments (Storage), audit trail.
- Versioned records; merge duplicate patients; consent capture.

3) Billing
- Late‑checkout billing: accumulate provisional charges during the visit (consult fees, procedures, supplies, labs). At Checkout, finalize to a single invoice, apply discounts/insurance, then collect payment. Optional deposit/pre‑auth flows for high‑cost items. Support CPT/ICD mapping, statements, and exports (CSV/PDF).

4) Inventory
- Items, batches, stock locations, low‑stock alerts, decrement‑only at edge; central reconciliation.

5) Labs/Orders
- Orders, results (PDF/images), status tracking, provider sign‑off; HL7/FHIR integration (future).
  - Lab Catalog & Quick Picks: default test panels (CBC, Urinalysis, Fecal Occult Blood Test, Hepatitis profile, HBsAg, Anti‑HCV, Pregnancy test, Lipid profile, FBS/RBS/HbA1c, Drug Test [5/10‑panel]) with ability to add/edit more over time.
  - UX: command palette + quick-pick chips; searchable catalog (code/name/section); panel expands to items with ability to deselect components.

6) Staff & Roles
- RBAC with Supabase Auth; roles: Admin, Provider, Frontdesk, Billing, Inventory, Patient (portal later).

7) Reports
- Appointments no‑show, revenue, inventory usage, provider productivity.

8) Calculators
- Clinical calculators useful for providers (initial set): BMI, BSA, OB EDD (Nägele’s rule and ultrasound-based), Gestational Age, APGAR helper, Medication dose by weight, Creatinine Clearance (Cockcroft–Gault), Anion gap.
- UX: lightweight drawer/sheet from the command palette; quick inputs with unit toggles; results copyable into notes.
- Validation: unit conversions (metric/imperial), pediatric/obstetric ranges.
- Audit: optional note attachment of calculation snapshot.

---

## Clinical Workflows (Billing at Checkout)
The following flows consolidate payment at the end to avoid back-and-forth while allowing additional procedures/requests to be added during care.

A) Consultation with Specialist
1. Reception & Registration → verify ID/appointment; create/attach visit.
2. Waiting & Queueing → patient waits; urgent cases prioritized.
3. Pre‑Consultation (optional) → vitals by nurse; labs/diagnostics readiness check.
4. Specialist Consultation → history, PE, diagnosis; orders for labs/imaging/procedures; provisional charges appended to visit.
5. Documentation & Orders → prescriptions, lab/imaging requests; notes saved.
6. Post‑Consultation Processing → schedule follow‑up if needed.
7. Checkout & Billing → finalize all provisional charges (consult fee + added orders/procedures), apply discounts/insurance, collect payment, issue receipt.
8. Exit & Aftercare → instructions printed; patient discharged.

B) Minor Surgery in Clinic
1. Arrival & Registration → visit created; consent checklist.
2. Initial Nursing Assessment → vitals, checklist.
3. Physician Evaluation → indication confirmed; orders, anesthesia plan.
4. Pre‑Op Preparation → room, equipment, timeout checklist.
5. Procedure → procedure records with supplies used; provisional line items added (time, supplies, meds).
6. Immediate Post‑Op Care → observation; add-on orders if required.
7. Checkout & Billing → finalize supplies/procedure charges; payment and discharge.

C) Laboratory: Blood Extraction
1. Reception & Verification → link request to visit or create lab-only visit.
2. Call to Phlebotomy → verify ID/DOB.
3. Collection → add consumables/tests as provisional charges.
4. Label & Handling → chain of custody.
5. Post‑Collection Instructions.
6. Processing → LIS steps; status updates.
7. Results Release → notify patient/physician.
8. Checkout & Billing → finalize test charges, accept payment; release receipt.

D) Ultrasound Procedure
1. Arrival & Registration → verify order; create imaging visit if needed.
2. Verification & Prep → schedule/confirm type.
3. Waiting Area.
4. Pre‑Procedure Prep.
5. Ultrasound Procedure → record findings; add contrast/consumables if used.
6. Post‑Procedure Care.
7. Results Processing → report draft/final.
8. Checkout & Billing → finalize study fee + add-ons; payment; issue results per policy.

Visit Status Pipeline (applies to all flows):
- scheduled → arrived → triage (optional) → in_consult/in_procedure → post_care → ready_for_checkout → checked_out → closed
- Transitions emit events for UI and billing to aggregate provisional line items.

E) Laboratory: Urine/Stool Specimen Collection
1. Reception & Verification → register order(s); confirm prep (e.g., fasting not required, clean-catch instructions).
2. Kit Issue & Patient Education → issue sterile container(s), labels, and guidance (first-catch, midstream, 24‑h collection if applicable).
3. Collection → patient collects specimen in restroom or at home (for 24‑h), returns within stability window.
4. Accessioning → verify ID/DOB, time of collection, specimen type/volume/appearance; link to lab_order and generate accession number.
5. Handling & Processing → aliquot if needed; add provisional charges (containers, preservatives, tests selected); route to sections (urinalysis, fecal occult blood, O&P).
6. Analysis → perform tests; capture analyzer data and technician signoff; abnormal flags.
7. Results & Release → verification by MT/pathologist as required; publish to visit/patient record; notify clinician.
8. Checkout & Billing → finalize test panel charges and consumables; payment and receipt.

---

## Pricing & Costs
Goals
- Centralize default sale prices/fees for lab tests, panels, procedures, and inventory items.
- Track inventory COGS and applied markup; snapshot cost and price at the time a charge is added.

Concepts
- Price Lists: start with a single clinic-wide default list (future: payer-specific lists).
- Priceable Entities: lab_tests, lab_panels, procedures, inventory_items.
- Snapshots: every `visit_charges` row captures unit_price (and currency); a paired cost snapshot records unit_cost and source for audit.

Rules
- Inventory: maintain COGS at batch-level; sale price comes from explicit item sale_price or computed via markup% (per-item or global). When charging, snapshot both sale price and unit cost.
- Labs/Procedures: maintain default sale prices/fees; panels can have their own price or derive from summing selected components.
- Overrides/Discounts: only roles {Admin, Billing} can override at checkout; changes are reason-coded and logged.

---

## Data Model (Initial)
Prisma schema source of truth; Supabase Postgres with RLS.

Key tables:
- users (mirror of Supabase auth.users with profile)
- roles (id, name)
- user_roles (user_id, role_id)
- patients (id, mrn, name fields, dob, sex, contact, insurance, metadata jsonb)
- patient_versions (id, patient_id, version, data jsonb, changed_by, changed_at)
- appointments (id, patient_id, provider_id, start, end, status, notes)
 - inventory_items (id, sku, name, unit, min_qty, metadata)
 - inventory_batches (id, item_id, lot, expires_at, qty, location)
 - inventory_movements (id, batch_id, delta, reason, by_user, at)
 - inventory_pricing (item_id, sale_price, currency, markup_percent, active bool)
 - inventory_cogs (batch_id, unit_cost, currency)
- visits (id, patient_id, provider_id, date, notes)
- visit_status_events (id, visit_id, status, at, by_user)
 - procedures (id, code, description)
 - procedure_pricing (procedure_id, sale_price, currency, active bool)
 - visit_procedures (visit_id, procedure_id, qty)
 - invoices (id, visit_id, total, status, due_at)
 - payments (id, invoice_id, amount, method, txn_ref, at)
 - visit_charges (id, visit_id, type, ref_id, description, qty, unit_price, currency, provisional bool, added_at, added_by)
 - visit_charge_costs (charge_id, unit_cost, currency, source enum['inventory','lab','procedure'])
 - files (id, owner_type, owner_id, path, mime, size, uploaded_by, at)
- change_log (id, table, row_id, op, data jsonb, ts, origin, processed)
// Labs
- lab_orders (id, visit_id, ordering_provider_id, priority, status, placed_at)
- lab_order_items (id, order_id, test_code, test_name, section, status)
 - lab_tests (id, code unique, name, section, specimen_type, method, default_units, reference_range jsonb, active bool)
 - lab_panels (id, code unique, name, section, active bool)
 - lab_panel_items (panel_id, test_id, required bool)
 - lab_pricing (test_id nullable, panel_id nullable, sale_price, currency, active bool)
 - specimens (id, order_item_id, type, container, collected_at, collected_by, volume_ml, appearance, preservative, accession_no)
- specimen_events (id, specimen_id, event_type, details jsonb, at, by_user)
- lab_results (id, order_item_id, result_data jsonb, units, reference_range, abnormal_flag, verified_by, verified_at)

Indexes:
- patients: (mrn unique), (name_trgm), (dob)
- appointments: (provider_id, start), gist for overlap checks
- inventory_batches: (item_id, expires_at)

RLS examples:
- patients: staff roles can read; write if role in {Provider, Admin} or frontdesk for demographics only.
- patient_versions: read restricted; insert by server only.
- labs: lab techs can read/write lab_orders/items/specimens; providers can read results for their patients; frontdesk limited to order placement and status.
 - pricing: pricing tables (lab_pricing, procedure_pricing, inventory_pricing) writable only by {Admin, Billing}; read for staff. visit_charge_costs and unit_price on visit_charges inserted/updated by server role only.

---

## API Surface (First pass)
Using Next.js app router with route handlers under `app/api/*`. All routes enforce auth and role checks. Zod for input validation.

- POST /api/patients
- GET /api/patients?query=…&page=…
- GET /api/patients/:id
- PATCH /api/patients/:id
- POST /api/appointments
- GET /api/appointments?from=…&to=…&provider=…
- PATCH /api/appointments/:id
- POST /api/inventory/movements (delta only)
- GET /api/inventory/items
- POST /api/invoices
- POST /api/payments
- POST /api/visits/:id/charges (add provisional line item)
- POST /api/visits/:id/checkout (finalize provisional → invoice)
- POST /api/visits/:id/status (append status event)
- POST /api/labs/orders (create lab order)
- GET /api/labs/orders/:id (get lab order with items)
- POST /api/labs/orders/:id/items (add tests)
- POST /api/labs/specimens (create/accession specimen)
- POST /api/labs/specimens/:id/events (receive/aliquot/reject)
- GET /api/labs/specimens/:id/label (print label payload)
- POST /api/labs/results (submit analyzer/technician results)
- POST /api/labs/results/:id/verify (signoff)
// Catalog
- GET /api/labs/catalog/tests?query=…&section=…&active=…
- GET /api/labs/catalog/panels
- POST /api/labs/catalog/tests (admin create)
- PATCH /api/labs/catalog/tests/:id (admin update)
- POST /api/labs/catalog/panels (admin create)
- PATCH /api/labs/catalog/panels/:id (admin update)
// Order from panel
- POST /api/labs/orders/:id/from-panel/:panelId (add panel tests; allow deselects)
// Pricing (admin)
- GET /api/pricing/labs?testId=…&panelId=…
- GET /api/pricing/procedures?procedureId=…
- GET /api/pricing/inventory?itemId=…
- PATCH /api/pricing/labs (upsert)
- PATCH /api/pricing/procedures (upsert)
- PATCH /api/pricing/inventory (upsert)

Realtime subscriptions via Supabase channels for: appointments, inventory_movements, lab_orders/status, lab_results.

---

## Offline‑First & Sync
Local Mode (on‑prem):
- Services: postgres:14, api (Node/Next API), redis, worker.
- Client hits local hostname (mDNS) `http://clinic.local`.

Write Path:
- Client mutation -> local API -> local DB write (+ append change_log) -> immediate UI update.

Sync Worker:
- Scans change_log for unprocessed rows; batches with exponential backoff; pushes to Supabase via service key; marks processed on success.
- Conflict rules (match-or-add):
  - Matching is determined by required identifying fields per domain. If they do not match, treat as a new addition rather than a conflict.
  - Appointments: match on patient_id + provider_id + start timestamp (± allowed drift) OR appointment id if present; if fields differ (e.g., different start or provider), create a new record.
  - Inventory movements: decrement-only deltas; reconcile by rebase against authoritative cloud stock. Movements are append-only; duplicates deduped by idempotency key (batch_id + reason + at ± 1m).
  - Patients: match on MRN (primary) or a composite of name + dob + contact hash; if no match on required keys, create a new patient and new version.
  - When a match is found but field values differ, resolve by policy: appointments last-write-wins; patients create new patient_versions entry; inventory totals recalculated from movements.

Client Offline:
- Service worker caches app shell, last N queries; mutation queue in IndexedDB; on reconnect, flush to API.

---

## Security & Compliance
- Supabase Auth: email+password + optional SSO (SAML/OIDC) for staff.
- RBAC via custom roles table; policy checks at API and RLS.
- RLS: “defense in depth”; each table with row‑level policies.
- Audit: patient_versions and change_log + API access logs.
- PHI handling: encrypt at rest (Postgres + Supabase Storage), signed URLs for files, short TTL.
- Backups: Supabase PITR + nightly on‑prem pg_dump; documented restores.
- Secrets: managed via Vercel/Cloudflare env + Doppler/1Password.
- PII minimization/retention policies; export/delete flows.

---

## DevOps
Environments:
- Local: docker compose up (Next, API, Postgres, Redis, Worker)
- Staging: Vercel (preview per PR)
- Production: Vercel (production deployments)

CI/CD (GitHub Actions):
- Lint, typecheck, unit tests
- Generate and apply Prisma migrations
- Build
- Preview deploy (staging) or production promotion

Observability:
- Sentry for client + server
- Logtail or Better Stack for logs
- Supabase logs for DB
- Uptime checks (CF Health Checks or Better Uptime)

---

## Testing Strategy
- Unit: Jest + ts-jest; zod schemas; utilities.
- Integration: route handlers with supertest; DB test container.
- E2E: Playwright (critical flows: create patient, book appointment, check-in, bill).
- Contract tests for sync worker inputs/outputs.

---

## Milestones & Deliverables
M0 — Bootstrap (1–2 weeks)
- Repo scaffold (Next.js app router, Tailwind, shadcn/ui, TanStack Query, PWA)
- Supabase project + Prisma baseline + RLS starter policies
- Auth (staff login), RBAC scaffold, basic AppShell

M1 — Patients & Appointments (2–4 weeks)
- Patient CRUD with versions + attachments
- Appointments calendar (week/day), create/edit, waitlist, realtime updates
- Basic reports and search

M2 — Billing & Inventory (3–5 weeks)
- Visits, procedures, invoices, payments
- Inventory items/batches/movements, low‑stock alerts

M3 — Calculators & Offline Prep (2–3 weeks)
- Calculators module (BMI, BSA, EDD, GA, dose by weight, creatinine clearance, anion gap)
- Service worker cache + mutation queue scaffolding
 - Define conflict match keys and idempotency strategies

M4 — Diagnostics (Labs) (3–5 weeks)
 - Lab orders/items, accessioning, specimen handling (blood/urine/stool), results verification, label printing
 - Late‑checkout integration for lab charges
 - Basic lab dashboard and queues (phlebotomy/specimen receiving/analysis/verification)
 - Lab catalog with initial quick-picks (CBC, UA, Hepatitis, Drug Test, Lipids, FBS/RBS/HbA1c, Pregnancy) and admin UI to add more

M5 — Offline & Sync (2–3 weeks)
- On‑prem docker stack, change_log, worker sync to Supabase
- Implement conflict resolution as per match-or-add rules
- Conflict handling UX

M6 — Hardening & Release (2–3 weeks)
- Access policies tightened, audit logging, backups, observability
- E2E test coverage, performance pass, docs

---

## Repo Structure (proposed)
- apps/web (Next.js app)
- apps/worker (BullMQ worker)
- packages/ui (design system overrides + shadcn)
- packages/db (Prisma schema + client + migrations)
- infra/ (docker, compose, k8s overlays if needed)
- .github/workflows (CI)

---

## Conventions & Contribution Guidelines
- Languages: TypeScript everywhere.
- Lint/Format: ESLint + Prettier; commit hooks via Husky.
- Commits: Conventional Commits; PRs require reviewer + passing checks.
- Branching: trunk-based, short-lived feature branches.
- Testing: add/maintain tests with any public API change; keep E2E green.
- Accessibility: no feature merges without keyboard + screen reader sanity.
- Performance: avoid blocking main thread; lazy load heavy modules; measure.

---

## Open Questions
- Do we keep backend inside Next API routes or split to NestJS for domain modularity?
- Patient portal scope (later?) and messaging?
- Which SMS/email provider (Twilio/MessageBird/Postmark)?

---

## References
- Next.js App Router docs
- shadcn/ui
- TanStack Query
- Supabase RLS guide
- BullMQ
- Playwright

---

## Acceptance Criteria (v1)
- Single repo builds locally with docker compose; staging and production deploy on Vercel.
- Auth + RBAC; core Patients + Appointments usable end‑to‑end with realtime.
- PWA installable; offline read of last data; queued mutations.
 - Diagnostics: lab orders (blood/urine/stool), specimen accessioning with labels, results entry and verification.
 - Lab catalog: default quick‑picks available and searchable; admins can add/edit tests and panels.
 - Basic reports and exports functioning.
