# Development Checklist — Clinic Management System (Apple‑like UI)

This checklist breaks down the plan in `PLANNING.md` into actionable tasks. Use it to drive sprints. Tick items as you complete them.

Legend: [ ] not started / [~] in progress / [x] done

---

## 🚨 CURRENT STATUS (as of latest session)

**✅ Supabase-Only Architecture + Loyverse Integration Implemented**

The system now uses **Supabase PostgreSQL** as the single source of truth with **Loyverse POS integration**:

**Architecture:**
- **Database**: Supabase (Cloud PostgreSQL) - All operations go directly to Supabase
- **No Local DB**: Removed Prisma, local PostgreSQL, and database sync service
- **Loyverse Integration**: Bi-directional sync for customers/patients and items for billing
- **Simplified Stack**: Direct Supabase queries via `getSupabaseClient()`

**Components:**
- ✅ Simplified database client (`/apps/web/lib/db/client.ts`)
  - Direct Supabase client access
  - No health checks or failover logic
  - Single `getSupabaseClient()` function
- ✅ All API routes updated
  - Removed `executeWithFailover` pattern
  - Direct Supabase queries throughout
  - Consistent error handling
- ✅ Loyverse Integration
  - Patient ↔ Loyverse Customer auto-sync (bi-directional)
  - Import/reconciliation UI for existing Loyverse customers
  - Smart duplicate detection with weighted scoring
  - Admin UI with bulk import capabilities
- ✅ Removed dependencies
  - Uninstalled `@prisma/client` and `prisma`
  - Cleaned up package.json scripts
  - Removed dual-database documentation

**Environment Variables Required:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_SERVICE_ROLE`: Service role key (for server-side operations)
- `LOYVERSE_API_TOKEN`: Loyverse API access token

**Next Phase: Loyverse Items & Modifiers for Appointment Billing**
- Integrate Loyverse items (services/procedures) catalog
- Add modifiers support for customizations
- Multiple items per appointment/visit
- Auto-calculate total cost based on selected items + modifiers
- Replace current procedure/pricing system with Loyverse items

---

## 0. Repo Bootstrap
- [x] Initialize monorepo structure
  - [x] apps/web (Next.js App Router, TS)
  - [x] apps/worker (BullMQ worker)
  - [x] packages/ui (shadcn/ui components, theme)
  - [x] packages/db (Prisma schema + client + migrations)
  - [x] infra/ (docker-compose, env samples)
- [x] Tooling & quality
  - [x] ESLint + Prettier + editorconfig
  - [x] Husky + lint-staged (pre-commit)
  - [x] Commit lint (Conventional Commits)
  - [x] Jest + ts-jest config
  - [x] Playwright config
- [x] Core dependencies
  - [x] Next.js 14+ (App Router)
  - [x] TailwindCSS + shadcn/ui
  - [x] TanStack Query
  - [x] Zod + react-hook-form (@hookform/resolvers)
  - [x] Prisma + @prisma/client
  - [x] Supabase JS (auth/storage/realtime)
  - [x] BullMQ + ioredis
  - [x] Sentry SDK

## 1. Env & Secrets
- [x] Supabase project created (dev, staging, prod)
- [ ] Vercel projects (staging + production) linked
- [x] Redis (managed) or local Redis for dev
- [~] Environment variables ⚠️ Missing several vars in .env.example
  - [x] SUPABASE_URL, SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE (not in .env.example)
  - [ ] DATABASE_URL (local + cloud) - not in .env.example
  - [ ] REDIS_URL (not in .env.example)
  - [x] SENTRY_DSN
  - [ ] LOGTAIL_TOKEN (or Better Stack) - not in .env.example
  - [x] APP_BASE_URL (local/staging/prod) - as NEXT_PUBLIC_APP_BASE_URL
  - [ ] ENCRYPTION_KEYS as needed - not in .env.example
- [~] Secrets management policy (Vercel envs; 1Password/Doppler)
  - [ ] Rotate keys runbook (Supabase, Sentry, Redis, Vercel)
  - [x] Local .env hygiene (.gitignore configured)

## 2. Database & Prisma
- [x] Prisma init with Supabase Postgres
- [x] Implement base schema (see PLANNING.md)
  - [x] auth/users profile mirror ✅ VERIFIED supabaseId field deployed to production
  - [x] roles, user_roles
  - [x] patients, patient_versions
  - [x] appointments
  - [x] visits, visit_status_events
  - [x] procedures, procedure_pricing, visit_procedures
  - [x] inventory_items, inventory_batches, inventory_movements
  - [x] inventory_pricing, inventory_cogs
  - [x] lab_tests, lab_panels, lab_panel_items, lab_pricing
  - [x] lab_orders, lab_order_items, specimens, specimen_events, lab_results
  - [x] invoices, payments, visit_charges, visit_charge_costs
  - [x] files (storage refs), change_log
- [x] Indexes & constraints (trgm, gist overlaps, uniques)
- [~] Seed data
  - [x] Roles (Admin, Provider, Frontdesk, Billing, Inventory, LabTech)
  - [~] Lab catalog (structure present, needs full catalog data)
  - [x] Procedure samples
  - [x] Inventory samples
  - [x] Pricing seeds (procedure_pricing, lab_pricing, inventory_pricing)
  - [x] User registration system (dev-only /register page) ✅ DEPLOYED
  - [x] Minimal demo data for UI smoke (1 patient, 1 appointment today) ✅ SEEDED

## 3. RLS & Security
- [x] Enable RLS on all tables ✅ VERIFIED in production (31/33 tables; Station & UserStation exceptions)
- [x] Policies ✅ VERIFIED 60 policies deployed in production
  - [x] Patients: staff read (patient_select_staff); writes by Admin/Provider/Frontdesk (patient_update_roles)
  - [x] patient_versions insert server-only (patientversion_insert_service)
  - [x] Appointments: staff read; writes by roles
  - [x] Labs: lab tech write on lab tables (labresult_write_labtech_admin); providers read results
  - [x] Pricing: writes allowed only to Admin/Billing (pricing write policies); staff read
  - [x] visit_charge_costs and visit_charges set server-only writes (vcharge_write_server_only)
  - [~] Files: Storage bucket and RLS configured; reads by staff; writes server-only (signed URL TTL usage to be documented)
- [x] Audit logging strategy ✅ VERIFIED fn_audit_log() triggers on 9 critical tables
  - [x] Patient, Appointment, Visit (audit triggers deployed)
  - [x] Invoice, Payment (audit triggers deployed)
  - [x] LabOrder, LabResult (audit triggers deployed)
  - [x] InventoryMovement, VisitCharge (audit triggers deployed)
- [x] user_roles_view created ✅ DEPLOYED (AuthProvider dependency)
- [~] Backups (Supabase PITR) plan documented
  - [ ] Row-level unit tests for critical tables (pricing, charges)
  - [ ] Verify storage signed URL TTL and revocation
  - [ ] Document why Station & UserStation RLS disabled

## 4. Web App Shell (Next.js + PWA)
- [x] AppShell layout
  - [x] Top bar: cmd+k button, offline/online indicator, notifications placeholder ✅ REDESIGNED Apple-like
  - [x] Left dock: module nav placeholders ✅ REDESIGNED with active states
  - [x] Content header: title + actions slot
- [x] Theme + Tailwind tokens (spacing, radius, colors)
  - [x] Base CSS variables (surface, border, brand, muted, ring)
  - [x] Tailwind config wired to tokens
- [~] shadcn/ui components integrated
  - [x] Base primitives wired (Button, Input, Label, Select, Checkbox)
  - [x] Overlay: Dialog (CommandPalette)
  - [x] Overlay: Drawer/Sheet
    - [x] Focus trap + Escape to close
  - [~] Overlay: Popover (native implementation used instead)
  - [~] Overlay: Tooltip (native title attribute used instead)
  - [x] Toast system
  - [x] Shell controls use native patterns for better reliability
- [x] Command palette (cmd+k) with navigation
  - [x] Lazy-load (dynamic import) to reduce first load
- [x] PWA manifest + service worker
  - [x] App shell cache
  - [~] Query cache for last N queries
    - [x] IndexedDB store scaffold (idb/Dexie equivalent)
    - [x] Basic query serializer and TTL
  - [~] Mutation queue via IndexedDB
    - [x] SW/client message channel for flush
    - [x] Background sync retry/backoff
    - [~] Conflict banner + retry UI (stub implemented, needs full UX)
- [x] Auth screens (login/logout), role-aware nav ✅ FULLY WORKING
  - [x] Supabase auth wiring (client session provider with SSR cookies) ✅ FIXED
  - [x] Client-side route guard and redirects
  - [x] Login screen (email/password) - Apple-like UI ✅ REDESIGNED
  - [x] Registration screen (dev-only /register page) ✅ NEW
  - [x] Role-aware nav items and TopBar login/logout
  - [x] Server-side middleware guards ✅ WORKING with session cookies
  - [~] Session expiry handling (auto-refresh only; no user-facing UX)
  - [ ] Impersonation or switch-station control (if applicable)
- [~] PWA installability
  - [x] Manifest icons (all sizes) + maskable
  - [x] Theme color + background color
  - [x] Add to Home Screen prompt handling (Install/Dismiss/Snooze + telemetry implemented)
  - [x] Offline 404/500 fallback
- [~] Accessibility (A11y) in shell
  - [x] Focus trap in dialogs/palettes
  - [x] Keyboard navigation
  - [ ] Skip links (not verified)
  - [x] Semantic landmarks (header/nav/main)
  - [x] Online/offline indicator bound to navigator events
- [~] Performance
  - [x] CommandPalette dynamic import for code splitting
  - [ ] Route prefetch and code splitting for modules (not implemented)
  - [ ] Avoid hydration mismatches (not verified)
  - [ ] Lighthouse pass for PWA + performance (not done)

### 4a. Role-based Home
- [x] Admin dashboard: Welcome page with role display, module cards, quick stats ✅ NEW Apple-like design
- [ ] Frontdesk dashboard: today's schedule, arrivals, ready-for-checkout queue, quick actions
- [ ] Provider dashboard: my appointments, recent patients, calculators, orders
- [ ] Nurse dashboard: triage queue, vitals capture, prep checklists
- [ ] LabTech dashboard: phlebotomy/receiving/analysis/verification lanes
- [ ] Billing dashboard: ready-for-checkout list, invoices, payments, pricing admin link
  - [ ] Offline banners and queued mutation indicator in dashboards

## 5. Patients Module
- [x] Module scaffold page created with Apple-like UI ✅ NEW
  - [x] List view with demo patient (Maria Santos)
  - [x] Search placeholder (working with live search) ✅ WORKING
  - [x] Patient detail page (/patients/[id]) ✅ NEW
  - [x] Navigation from list to detail page ✅ WORKING
  - [x] GET /api/patients endpoint with pagination and search (Supabase-first) ✅ WORKING
  - [x] GET /api/patients/[id] endpoint (Supabase-first) ✅ WORKING
  - [x] PATCH /api/patients/[id] endpoint with versioning (Supabase-first) ✅ WORKING
  - [x] POST /api/patients endpoint (Supabase-first) ✅ WORKING
  - [x] Demo data seeded to Supabase (Maria Santos DEMO-001) ✅ VERIFIED
- [x] Patient Create/Edit Form ✅ COMPLETE
  - [x] Zod validation schema (firstName, lastName required) ✅ ENHANCED
  - [x] Comprehensive field validations ✅ WORKING
    - [x] Name fields: Letters, spaces, hyphens, apostrophes only
    - [x] MRN: Uppercase letters, numbers, hyphens only
    - [x] Date of birth: Required, not future, not before 1900, age ≤ 150 ✅ UPDATED
    - [x] Gender: Required field (male/female/other enum) ✅ NEW
    - [x] Email: Valid format (no transform to avoid zodResolver issues)
    - [x] Phone: 7-15 digits, international format support
    - [x] All fields: Character limits, whitespace trimming via .refine()
  - [x] UI/UX enhancements ✅ WORKING
    - [x] Red background on invalid fields
    - [x] Inline error messages with warning icons
    - [x] Validation summary at top of form
    - [x] Helpful hints for optional fields
    - [x] ARIA attributes for accessibility
    - [x] Real-time validation feedback
  - [x] Custom validation resolver ✅ CRITICAL FIX
    - [x] Uses safeParse() instead of zodResolver to prevent uncaught errors
    - [x] Converts Zod errors to react-hook-form format manually
    - [x] Shows only first error per field (cleaner UX)
    - [x] Fixed issue where validation showed in console but not UI
  - [x] Update reason field with audit UI ✅ ENHANCED
    - [x] Amber alert box with documentation prompt
    - [x] Character counter (500 max)
    - [x] Example placeholder text
    - [x] Required validation
  - [x] react-hook-form integration
  - [x] Create patient page (/patients/new)
  - [x] Edit patient dialog on detail page
  - [x] POST /api/patients integration (Supabase-first with automatic failover) ✅ WORKING
  - [x] PATCH /api/patients/[id] integration with reason field (Supabase-first) ✅ WORKING
  - [x] Success/error handling with redirects
  - [x] Query cache invalidation on success
- [x] CRUD + search (trgm on name) ✅ COMPLETE
  - [x] Read: List and detail pages working (Supabase-first with failover)
  - [x] Create: Patient form with comprehensive validation ✅ COMPLETE (Supabase-only, no failover)
  - [x] Update: Edit form with versioning and audit trail ✅ COMPLETE (Supabase-only, no failover)
  - [x] Search: Working with trgm fuzzy matching (GIN indexes enabled)
  - [ ] Delete: Soft delete or archive
- [x] Versioned edits (patient_versions) ✅ COMPLETE
  - [x] API creates PatientVersion on update (Supabase-only)
  - [x] Form collects reason for changes with enhanced UI
  - [x] ChangeLog trigger fixed (generates UUIDs)
  - [x] Version history UI (timeline view) ✅ NEW
    - [x] GET /api/patients/[id]/versions endpoint
    - [x] VersionHistory component with timeline
    - [x] Field-by-field diff display
    - [x] Full snapshot view (collapsible)
    - [x] Visual indicators for current version
- [x] Real-time sync ✅ COMPLETE
  - [x] Sync service created and integrated
  - [x] Patient table synced in real-time from Supabase to Local
  - [x] Multi-device detection (LOCAL_DATABASE_URL determines sync mode)
  - [x] Tested real-time sync functionality
  - [x] Write operations use Supabase only (no silent failover)
- [ ] Attachments (Supabase Storage)
- [ ] Merge duplicates flow
- [ ] Consent capture
 - [x] Realtime updates infrastructure (sync service) ✅ READY
 - [x] A11y on forms (ARIA labels, keyboard navigation) ✅ COMPLETE

## 6. Appointments Module
- [x] Module scaffold page created with Apple-like UI ✅ NEW
  - [x] Day view with time slots (24-hour view)
  - [x] View controls (Day/Week/Month tabs)
  - [x] Date navigation (prev/next/today)
  - [x] Appointment display with patient info and status badges
- [x] API Endpoints ✅ COMPLETE
  - [x] GET /api/appointments - List with filters (date, patient, provider, status, view)
  - [x] POST /api/appointments - Create with overlap detection and UUID generation
  - [x] GET /api/appointments/[id] - Get details with patient info
  - [x] PATCH /api/appointments/[id] - Update appointment (type, reason, notes, status, times)
  - [x] DELETE /api/appointments/[id] - Cancel (soft delete via status='cancelled')
  - [x] executeWithFailover() pattern for reads (Supabase → Prisma)
  - [x] Supabase-only writes (no silent failover)
  - [x] Response normalization (Patient → patient)
  - [x] Timezone handling (local time storage without UTC conversion) ✅ FIXED
- [x] Real-time sync ✅ COMPLETE
  - [x] Sync service configured for Appointment table
  - [x] Multi-device detection (LOCAL_DATABASE_URL determines sync mode)
  - [x] Tested real-time sync functionality
  - [x] Supabase Realtime subscriptions working
- [x] Calendar UI Components ✅ COMPLETE
  - [x] Appointment form with patient search (live search with min 2 chars)
  - [x] Patient pre-selection support (from patient page)
  - [x] Date and time pickers with validation
  - [x] Type dropdown (consultation, follow_up, procedure, checkup)
  - [x] Reason and notes fields
  - [x] Form validation with error handling
  - [x] TanStack Query mutations with cache invalidation
  - [x] Day view time slot grid (24-hour view, grouped appointments)
  - [x] Status badges (color-coded: scheduled, confirmed, arrived, cancelled)
  - [x] New Appointment button with dialog
- [ ] Advanced Calendar Features
  - [ ] Week view calendar grid
  - [ ] Month view calendar grid
  - [ ] Appointment detail/edit dialog (click appointment to view/edit)
  - [ ] Appointment cancellation with confirmation
  - [ ] Waitlist management
  - [ ] Room/provider column views
- [ ] Enhancements
  - [ ] Overbooking guard UI (currently has server-side detection)
  - [ ] Provider selection dropdown in form
  - [ ] Reminder jobs (queue worker integration)
  - [ ] Station-scoped views and permissions
  - [ ] Conflict handling UI on overlaps (backend ready, needs frontend)
- [x] Realtime calendar infrastructure (sync service) ✅ READY

## 6a. Loyverse Items Integration for Appointments (NEW)
- [ ] **Loyverse Items Catalog Sync**
  - [ ] GET /api/loyverse/items - Fetch items (services/procedures) from Loyverse
  - [ ] Item caching strategy (cache in Supabase or memory with TTL)
  - [ ] Item search/filter UI component
  - [ ] Item display with pricing, category, modifiers
- [ ] **Appointment Items Management**
  - [ ] Database schema for appointment items
    - [ ] AppointmentItem table (appointmentId, itemId, quantity, basePrice, modifiers)
    - [ ] AppointmentItemModifier table (appointmentItemId, modifierId, modifierPrice)
  - [ ] POST /api/appointments/[id]/items - Add item to appointment
  - [ ] DELETE /api/appointments/[id]/items/[itemId] - Remove item
  - [ ] PATCH /api/appointments/[id]/items/[itemId] - Update quantity or modifiers
  - [ ] GET /api/appointments/[id]/items - List all items for appointment
- [ ] **Modifiers Support**
  - [ ] GET /api/loyverse/modifiers - Fetch available modifiers from Loyverse
  - [ ] Modifier selection UI (checkboxes/multi-select)
  - [ ] Price calculation with modifiers (base + modifier prices)
  - [ ] Modifier validation (required modifiers, exclusive groups)
- [ ] **Items UI in Appointment**
  - [ ] Item selector component (search/browse Loyverse catalog)
  - [ ] Selected items list with quantity controls
  - [ ] Modifier selection dialog per item
  - [ ] Real-time total calculation display
  - [ ] Visual price breakdown (base + modifiers = total)
- [ ] **Cost Calculation**
  - [ ] Auto-calculate appointment total from items + modifiers
  - [ ] Display subtotal, tax (if applicable), and grand total
  - [ ] Update total when items/modifiers change
  - [ ] Snapshot prices at appointment creation (for historical accuracy)
- [ ] **Migration from Procedures**
  - [ ] Data migration script (Procedure → Loyverse Item mapping)
  - [ ] Deprecate old procedure_pricing system
  - [ ] Update existing workflows to use Loyverse items
- [ ] **Billing Integration**
  - [ ] Pass appointment items to billing/checkout
  - [ ] Create invoice line items from appointment items
  - [ ] Sync completed appointments to Loyverse receipts
  - [ ] Handle discounts and adjustments
- [ ] **Testing & Validation**
  - [ ] Unit tests for price calculations
  - [ ] Integration tests for Loyverse API calls
  - [ ] Edge cases: deleted items, price changes, modifier conflicts
  - [ ] Performance testing with large item catalogs

## 7. Visits & Workflow
- [x] Visit creation and status pipeline ✅ COMPLETE
  - [x] Status transitions: scheduled → arrived → triage → in_consult → in_procedure → post_care → ready_for_checkout → checked_out → closed
  - [x] VALID_TRANSITIONS map with business rules (no reopening closed visits, can skip optional stages)
  - [x] One active visit per patient enforced
  - [x] Automatic appointment status update on check-in
- [x] API Endpoints ✅ COMPLETE
  - [x] POST /api/visits - Create from appointment or walk-in
  - [x] GET /api/visits - List with filters (status, patient, provider, date, view=queue)
  - [x] GET /api/visits/[id] - Get detail with status history
  - [x] PATCH /api/visits/[id] - Update visit data (notes, provider)
  - [x] PATCH /api/visits/[id]/status - Transition status with validation
  - [x] executeWithFailover pattern for reads, Supabase-only for writes
- [x] Events emitted on transitions (VisitStatusEvent created for each change)
- [x] VisitTimeline / StatusStepper component (Status history with timeline UI)
- [x] QueueBoard views (kanban-style) ✅ COMPLETE
  - [x] Queue Board with 4 columns (Arrived, Triage, In Consult, Ready for Checkout)
  - [x] Color-coded patient cards with wait times
  - [x] Auto-refresh every 10 seconds
  - [x] Today's Visits list view
  - [x] All Visits list view
- [x] Visit detail page (/visits/[id]) ✅ COMPLETE
  - [x] Patient information card
  - [x] Status change buttons (dynamic based on valid transitions)
  - [x] Status history timeline with visual indicators
  - [x] Provider and appointment information
  - [x] Visit notes display
- [x] Appointments integration ✅ COMPLETE
  - [x] "Check In" button on scheduled appointments
  - [x] Creates visit and updates appointment status
  - [x] Redirects to visit detail page
  - [x] Conflict handling (patient has active visit)
- [x] Real-time sync ✅ COMPLETE
  - [x] Visit table synced (Supabase → Local)
  - [x] VisitStatusEvent table synced
  - [x] Multi-device queue updates working
  - [x] Added to sync service configuration
- [ ] Triage data capture form (vitals, chief complaint, allergies, medications)
- [ ] Desk cheat-sheet print view (optional)
- [ ] Optimistic updates with rollback on conflicts (optional)
- [ ] Print-friendly view for desk cheat sheet (optional)
- [ ] Drag-and-drop queue board (optional enhancement)

## 8. Billing (Late‑Checkout)
- [x] Module scaffold page created with Apple-like UI ✅ NEW
  - [x] Status tabs (Ready for Checkout, Unpaid, Paid, All)
  - [x] Revenue stats cards (Today, Pending, This Month, Outstanding)
  - [x] Features overview (Provisional Charges, Price Snapshots, Checkout)
  - [x] "Coming Soon" placeholders for full billing
- [ ] Provisional charges (visit_charges.provisional = true)
- [ ] Add charges from modules (consult fee, labs, procedures, inventory supplies)
- [ ] Price lookup (lab_pricing/procedure_pricing/inventory_pricing)
- [ ] Inventory price = sale_price or COGS × markup%
- [ ] Cost snapshot (visit_charge_costs) on add
- [ ] Discounts/overrides with role checks and reason logging
- [ ] Checkout endpoint consolidates provisional → invoice
- [ ] Payments (cash, card, e-wallet) + receipt
- [ ] Provisional Charge Drawer UI (add/remove/edit lines)
- [ ] ChargeList + PriceChip + MoneyInput + DiscountControl components
- [ ] PaymentSheet + ReceiptPreview; print template for receipt
- [ ] Currency formatting (PHP default, configurable)
 - [ ] Server-side charge snapshot verification tests
 - [ ] Provisional → invoice transition correctness
 - [ ] Refunds/voids (if in scope) and audit trail

## 9. Inventory Module
- [ ] Items, batches, locations
- [ ] Movements (delta-only)
- [ ] Low-stock alerts
- [ ] COGS capture per batch
- [ ] Pricing (sale_price/markup%)
- [ ] Decrement on usage during procedures/labs
- [ ] Scanner/search add-to-charge flow with stock and price display
 - [ ] Batch/lot and expiry handling
 - [ ] Negative stock prevention and warnings

## 10. Procedures Module
- [ ] Catalog (codes, descriptions)
- [ ] Pricing (procedure_pricing)
- [ ] Attach to visits; charge capture

## 11. Labs Module (Complete Diagnostics)
- [x] Module scaffold page created with Apple-like UI ✅ NEW
  - [x] Lab lanes navigation (Orders, Receiving, Analysis, Verification, Results)
  - [x] Quick picks grid (CBC, UA, FBS, Lipids, HbA1c, Pregnancy, HBsAg, Drug Test)
  - [x] Features overview with workflow description
  - [x] "Coming Soon" placeholders for full lab system
- [ ] Catalog & Quick Picks
  - [ ] lab_tests, lab_panels, lab_panel_items, lab_pricing
  - [ ] Default quick-picks (CBC, UA, FOBT, Hepatitis, HBsAg, Anti‑HCV, Lipids, FBS/RBS/HbA1c, Pregnancy, Drug Test)
  - [ ] Searchable catalog with chips; panel expansion with per-test deselect
- [ ] Orders & Items
  - [ ] Create lab orders; add items or from panel
- [ ] Specimens
  - [ ] Accession specimens (blood/urine/stool)
  - [ ] Labels (ZPL/TSPL payload generation) + LabelPreview
  - [ ] Barcode scan support for accession/lookup
  - [ ] Specimen events (receive/aliquot/reject)
- [ ] Analysis & Results
  - [ ] Results grid (manual/import), units, reference ranges, abnormal flags
  - [ ] Verification workflow (tech → MT/pathologist) and queue views
- [ ] Realtime: lab orders/status + results channels
- [ ] Billing: add lab charges as provisional; finalize at checkout
 - [ ] Result value validations and units mapping
 - [ ] Abnormal flag rules and highlighting
 - [ ] Verification audit log and permissions
 - [ ] Import/export CSV for results (optional)

## 12. Calculators
- [ ] BMI, BSA, EDD (Nägele + ultrasound), Gestational Age
- [ ] APGAR helper, Dose-by-weight, Creatinine clearance, Anion gap
- [ ] Command palette action + sheet UI; copy to notes
- [ ] Unit conversions and validations
 - [ ] Persist last-used values per user (local)
 - [ ] A11y and keyboard-only flow

## 13. Offline & Sync
- [x] Docker local stack (Next API, Postgres, Redis, Worker) ✅ RUNNING
- [x] Dual-database architecture ✅ IMPLEMENTED
  - [x] Supabase as primary database
  - [x] Local PostgreSQL as backup database
  - [x] Automatic failover with health checks
  - [x] Real-time sync service (Supabase → Local)
  - [x] executeWithFailover() helper for all database operations
- [~] change_log append on writes (not implemented yet)
- [~] Worker pushes logs → Supabase with backoff (not implemented yet)
- [~] Conflict policy (match-or-add): (infrastructure ready, policies not defined)
  - [ ] Appointments: patient_id+provider_id+start match window
  - [ ] Inventory: append-only movements; idempotency keys
  - [ ] Patients: MRN or name+dob+contact hash
  - [ ] Matched: appointments LWW; patients versioned; inventory from movements
- [ ] Client: SW cache + mutation queue; reconnect flush
- [~] Offline UI: banner, queued mutation indicator, retry panel
  - [x] Queued mutation indicator in TopBar
  - [x] Offline banner shown when disconnected
  - [x] Retry panel stub
- [ ] Conflict Reviewer UI for suggested matches (patients, appointments)
 - [x] Background Sync registration (if available)
- [~] Retry/backoff strategies configured centrally
 - [ ] Telemetry for offline/online events
  - [x] A2HS telemetry stub (API route + client helper)

## 14. Security & Compliance
- [ ] RBAC roles enforced across UI and API
- [ ] RLS policies verified via tests
- [ ] PHI storage via Supabase Storage signed URLs + TTL
- [ ] Secrets in env stores; no secrets in repo
- [ ] Backups/restore runbooks
 - [ ] Data retention policy (Storage TTL, audit logs)
 - [ ] Access logs and anomaly detection hooks

## 14b. Admin: Catalog & Pricing
- [ ] Admin screens for Lab Catalog (tests, panels) CRUD
- [ ] Admin screens for Pricing (labs, procedures, inventory)
- [ ] Role restrictions and audit logging for changes

## 15. Observability
- [ ] Sentry for client/server
- [ ] Centralized logs (Logtail/Better Stack)
- [ ] Health checks + uptime
- [ ] Basic metrics (queue depth, API latency)
 - [ ] Frontend web vitals (LCP, CLS, FID) reporting
 - [ ] Error boundary + toast reporting on client

## 16. CI/CD
- [ ] GitHub Actions
  - [ ] Lint, typecheck, unit tests
  - [ ] Prisma migrate (plan + apply) on main
  - [ ] Build and deploy to Vercel (staging previews + production)
- [ ] Database migrations approval gate
 - [ ] Preview deployments with seed data
 - [ ] Lighthouse checks on PRs
 - [ ] E2E smoke on staging after deploy

## 17. Testing Strategy
- [ ] Unit tests for utilities and Zod schemas
- [ ] Integration tests for route handlers (with DB test container)
- [ ] E2E tests (Playwright):
  - [ ] Create patient → book appointment → check-in → consultation → add labs/procedures → checkout and pay
  - [ ] Lab-only visit: create order → accession specimens → enter results → checkout
  - [ ] Inventory decrement during procedure → billing reflects charges
- [ ] Contract tests for sync worker
- [ ] RLS tests for pricing edits, charge snapshots
- [ ] A11y tests (axe-core) on key flows (Checkout, Labs, Appointments)
- [ ] Localization tests for currency/time formats
 - [ ] PWA install & offline tests
 - [ ] RLS policy regression tests via SQL harness
 - [ ] Worker retry/backoff tests

## 18. Acceptance Gates for v1
- [ ] Staging + production deploy on Vercel pass smoke tests
- [ ] Auth + RBAC with enforced RLS
- [ ] Patients + Appointments end-to-end with realtime
- [ ] Diagnostics: blood/urine/stool orders, accession labels, results verification
- [ ] Billing: late‑checkout with price and cost snapshots; receipts
- [ ] PWA: installable, offline read, queued mutations
- [ ] Reports and CSV exports
- [ ] A11y: WCAG AA baseline (key screens), keyboard-only flows validated
- [ ] Localization: currency/timezone correctly displayed
- [ ] Performance: tables virtualized; route change < 500ms typical; print templates (receipts, labels) verified

---

## Appendix: Endpoints (first pass)
- [ ] Patients: POST/GET/:id/PATCH
- [ ] Appointments: POST/GET/PATCH
- [ ] Visits: POST status, POST charges, POST checkout
- [ ] Inventory: GET items, POST movements
- [ ] Pricing (admin): GET/PATCH labs, procedures, inventory
- [ ] Labs: POST orders, GET order/:id, POST orders/:id/items, POST specimens, POST specimens/:id/events, GET specimens/:id/label, POST results, POST results/:id/verify

## Appendix: Data Migration Seeds
- [ ] Default roles
- [ ] Lab catalog + pricing
- [ ] Procedure list + pricing
- [ ] Inventory list + COGS + pricing
