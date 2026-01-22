# Claude Code Guide — Clinic Management System

## Project Overview

A modern Clinic Management System for **San Jose Medical Diagnostics & Health Solutions** located in Brgy 5, Talakag, Bukidnon, Philippines. The system handles patient registration, appointments, visits/queue management, laboratory services, billing, and inventory with an Apple-like UI.

**Clinic Name:** San Jose Medical Diagnostics & Health Solutions
**Address:** Brgy 5, Talakag, Bukidnon
**Owner:** Rouie Ilustrisimo
**Stack:** Next.js 15 (App Router), TailwindCSS, shadcn/ui, Supabase, TanStack Query, Zod
**Currency:** PHP (Philippine Peso)
**Timezone:** Asia/Manila

---

## Current Development Priority

**Labs Module** is the immediate focus. The module needs to support:

- Lab orders from visits AND walk-in patients
- In-house testing AND external lab partners (send-outs)
- Full specimen range: Blood, Urine, Stool, Swabs, plus specialized (CSF, tissue)
- Flexible verification (single or two-level approval depending on test complexity)

---

## Architecture

### Database: Supabase Only

- **Single source of truth**: All operations go directly to Supabase PostgreSQL
- **No local database**: Prisma and local PostgreSQL have been removed
- **Service role for writes**: Server-side mutations use `SUPABASE_SERVICE_ROLE`
- **Anon key for reads**: Client-side uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` with RLS

### Loyverse POS Integration

- Bi-directional sync for customers/patients
- Items/services catalog for billing (future integration)
- Patient records store `loyverse_customer_id` when synced

---

## Folder Structure

```
clinic-management/
├── apps/web/                    # Next.js 15 application
│   ├── app/                     # App Router pages and API routes
│   │   ├── api/                 # API route handlers
│   │   ├── appointments/
│   │   ├── patients/
│   │   ├── visits/
│   │   ├── labs/               # Labs module (priority)
│   │   ├── billing/
│   │   └── ...
│   ├── components/              # React components by domain
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── visits/
│   │   ├── labs/               # Lab-specific components
│   │   └── shell/              # App shell (TopBar, LeftDock, etc.)
│   └── lib/                     # Utilities and business logic
│       ├── db/client.ts         # Supabase client singleton
│       ├── validations/         # Zod schemas
│       ├── loyverse/            # Loyverse API client
│       └── ...
├── packages/ui/                 # Shared shadcn/ui components
├── supabase/migrations/         # Database migrations
└── references/                  # Workflow diagrams and forms
```

---

## Code Patterns & Conventions

### API Route Pattern

All API routes follow this structure:

```typescript
// apps/web/app/api/[resource]/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Parse query params
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Query with Supabase
    const { data, error, count } = await supabase
      .from('table_name')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      items: data,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API /resource] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // For writes, use service role to bypass RLS
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const body = await request.json();

    // Validate with Zod schema
    const validated = mySchema.parse(body);

    // Generate UUID for new records
    const id = crypto.randomUUID();

    const { data, error } = await supabase
      .from('table_name')
      .insert({ id, ...validated })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[API /resource] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 },
    );
  }
}
```

### Logging Convention

Always prefix logs with the context:

- `[API /path]` for API routes
- `[Component Name]` for React components
- `[ServiceName]` for services (e.g., `[LoyverseSync]`)

### Form Pattern (react-hook-form + Zod)

```typescript
// components/[domain]/[domain]-form.tsx
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { mySchema, type MyFormData } from '@/lib/validations/my-schema'

export function MyForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MyFormData>({
    resolver: async (data) => {
      const result = mySchema.safeParse(data)
      if (result.success) {
        return { values: result.data, errors: {} }
      }
      // Convert Zod errors to react-hook-form format
      const fieldErrors: Record<string, { type: string; message: string }> = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = { type: 'validation', message: issue.message }
        }
      })
      return { values: {}, errors: fieldErrors }
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: MyFormData) => {
      const res = await fetch('/api/my-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-resource'] })
      onSuccess?.()
    }
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
      {/* Form fields */}
    </form>
  )
}
```

### Zod Schema Pattern

```typescript
// lib/validations/my-schema.ts
import { z } from 'zod';

export const mySchema = z.object({
  requiredField: z.string().min(1, 'Required'),
  optionalField: z.string().optional().nullable(),
  enumField: z.enum(['option1', 'option2', 'option3']),
  dateField: z.string().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Invalid date'),
  // Use .refine() for complex validations
  email: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }, 'Invalid email format'),
});

export type MyFormData = z.infer<typeof mySchema>;
```

### TanStack Query Pattern

```typescript
// Queries
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', filters],
  queryFn: () => fetch(`/api/resource?${params}`).then((r) => r.json()),
});

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: async (data) => {
    /* ... */
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  },
});
```

### Component File Structure

```typescript
// components/[domain]/[component-name].tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
// UI imports from packages/ui
import { Button } from '@clinic/ui/button';
import { Input } from '@clinic/ui/input';

interface Props {
  // Props interface
}

export function ComponentName({ ...props }: Props) {
  // Hooks at top
  // Event handlers
  // Return JSX
}
```

---

## Database Conventions

### UUID Generation

Always generate UUIDs on the server side:

```typescript
const id = crypto.randomUUID();
```

### Timestamps

- Use ISO 8601 strings for API transport: `new Date().toISOString()`
- Store as `timestamp with time zone` in Postgres
- Display in local timezone (Asia/Manila)

### Status Fields

Use lowercase enum values:

```typescript
type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'cancelled'
  | 'no_show';
type VisitStatus =
  | 'scheduled'
  | 'arrived'
  | 'triage'
  | 'in_consult'
  | 'in_procedure'
  | 'post_care'
  | 'ready_for_checkout'
  | 'checked_out'
  | 'closed';
type LabOrderStatus =
  | 'pending'
  | 'collected'
  | 'received'
  | 'processing'
  | 'completed'
  | 'verified'
  | 'released';
type SpecimenStatus =
  | 'pending'
  | 'collected'
  | 'received'
  | 'rejected'
  | 'processing'
  | 'completed';
```

### Soft Deletes

Use status changes instead of hard deletes:

- Appointments: `status = 'cancelled'`
- Patients: Add `archived_at` timestamp (when implemented)

---

## Laboratory Module Specification

### Scope: Internal Lab Only

Focus on in-house laboratory workflow. External lab partners (send-outs) will be added later.

### Appointment-Lab Integration

**Flow 1: Appointment with Labs**

1. Patient books appointment that includes lab work
2. On check-in → Lab order is **auto-created** with status `pending_payment`
3. Patient proceeds to payment (Loyverse POS)
4. After payment confirmed → Order status changes to `paid` → Order becomes active
5. Patient proceeds to specimen collection

**Flow 2: Walk-in Lab Patient**

1. Receptionist finds or creates patient record
2. Creates lab order from patient profile
3. Order created with status `pending_payment`
4. After payment → Order activated
5. Patient proceeds to collection

### Lab Order Statuses

```typescript
type LabOrderStatus =
  | 'pending_payment' // Created but not paid - cannot proceed
  | 'paid' // Payment confirmed - ready for collection
  | 'collecting' // Specimen collection in progress
  | 'collected' // All specimens collected
  | 'processing' // Tests being performed
  | 'completed' // All results entered
  | 'verified' // Results verified by senior MT
  | 'released' // Results released to patient
  | 'cancelled'; // Order cancelled
```

### Workflow Phases

**Phase 1: Order & Payment**

1. Order created (from appointment check-in OR patient profile)
2. Status: `pending_payment`
3. Payment processed through Loyverse
4. On payment confirmation → Status: `paid`
5. **Optional**: Print patient claim slip + lab guide (or view digitally)

**Phase 2: Collection**

1. Patient presents claim slip or shows digital order
2. MT verifies payment status (must be `paid`)
3. MT reviews ordered tests, prepares supplies
4. Label specimens with accession number (barcode)
5. Collect specimens → Status: `collecting` → `collected`
6. Forward specimens to lab

**Phase 3: Processing & Results**

1. Performing MT receives specimens
2. Runs tests → Status: `processing`
3. Enters results into system → Status: `completed`
4. Senior MT/pathologist verifies (if required) → Status: `verified`

**Phase 4: Release**

1. Results available for release
2. **Digital options** (all optional):
   - QR code linking to secure results page
   - Email results (if patient has email)
   - Direct shareable link
3. **Print option**: Print formatted results
4. Patient acknowledges receipt → Status: `released`

### Digital Results Access

- **QR Code**: Generated for each order, links to `/results/[token]`
- **Email**: Auto-send when results ready (if patient has email)
- **Shareable Link**: Secure URL with expiring token
- **Access Token**: Short-lived (24-48 hours), one-time view option available

### Lab Order Types

1. **Visit-linked**: Created during patient visit/consultation
2. **Walk-in/Standalone**: Patient walks in for lab only (creates lab-only visit)

### Specimen Types

- **Blood**: Various tube types (EDTA, SST, heparin, citrate)
- **Urine**: Clean catch, midstream, 24-hour
- **Stool**: Fresh, preserved
- **Swabs**: Throat, nasal, wound, vaginal
- **Specialized**: CSF, tissue, sputum

### Lab Test Categories (Quick Picks)

- **Hematology**: CBC, Blood Typing, ESR, Platelet Count
- **Clinical Chemistry**: FBS, RBS, HbA1c, Lipid Profile, Creatinine, BUN, Uric Acid, SGPT, SGOT
- **Urinalysis**: Routine UA, Pregnancy Test
- **Serology**: HBsAg, Anti-HCV, HIV, VDRL, Dengue NS1
- **Fecalysis**: Routine Stool, FOBT
- **Drug Testing**: 5-panel, 10-panel

### Database Tables (Labs)

```sql
-- Lab catalog
lab_tests (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  section TEXT,              -- 'Hematology', 'Chemistry', 'Urinalysis', 'Serology', 'Fecalysis'
  specimen_type TEXT,        -- 'blood', 'urine', 'stool', 'swab'
  container TEXT,            -- 'EDTA', 'SST', 'Heparin', 'Citrate', 'Sterile Cup'
  method TEXT,
  default_units TEXT,
  reference_range JSONB,     -- { "male": "4.5-5.5", "female": "4.0-5.0", "child": "..." }
  turnaround_hours INTEGER,
  requires_fasting BOOLEAN DEFAULT false,
  requires_verification BOOLEAN DEFAULT false,  -- needs senior MT sign-off
  price DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
)

lab_panels (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  section TEXT,
  price DECIMAL(10,2),       -- panel price (may differ from sum of tests)
  active BOOLEAN DEFAULT true
)

lab_panel_items (
  panel_id UUID REFERENCES lab_panels,
  test_id UUID REFERENCES lab_tests,
  required BOOLEAN DEFAULT true,
  PRIMARY KEY (panel_id, test_id)
)

-- Lab orders (with payment tracking)
lab_orders (
  id UUID PRIMARY KEY,
  order_number TEXT UNIQUE,   -- human-readable: LAB-YYYYMMDD-XXXX
  visit_id UUID REFERENCES visits,
  appointment_id UUID REFERENCES appointments,  -- if created from appointment
  patient_id UUID REFERENCES patients NOT NULL,
  ordering_provider_id UUID REFERENCES users,
  priority TEXT DEFAULT 'routine',  -- 'routine', 'urgent', 'stat'
  status TEXT DEFAULT 'pending_payment',  -- see LabOrderStatus enum
  payment_status TEXT DEFAULT 'unpaid',   -- 'unpaid', 'paid', 'partial', 'refunded'
  payment_reference TEXT,     -- Loyverse receipt/transaction ID
  paid_at TIMESTAMPTZ,
  total_amount DECIMAL(10,2),
  notes TEXT,
  placed_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users
)

lab_order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES lab_orders NOT NULL,
  test_id UUID REFERENCES lab_tests,
  panel_id UUID REFERENCES lab_panels,  -- if ordered as part of panel
  test_code TEXT,
  test_name TEXT,
  section TEXT,
  status TEXT DEFAULT 'pending',  -- 'pending', 'collected', 'processing', 'completed', 'verified'
  price_snapshot DECIMAL(10,2),   -- price at time of order
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Specimens
specimens (
  id UUID PRIMARY KEY,
  accession_no TEXT UNIQUE,   -- barcode: ACC-YYYYMMDD-XXXX
  order_id UUID REFERENCES lab_orders NOT NULL,
  order_item_id UUID REFERENCES lab_order_items,  -- if specific to one test
  specimen_type TEXT NOT NULL,  -- 'blood', 'urine', 'stool', 'swab', etc.
  container TEXT,
  volume_ml DECIMAL(5,2),
  appearance TEXT,            -- 'clear', 'cloudy', 'hemolyzed', etc.
  collection_notes TEXT,
  collected_at TIMESTAMPTZ,
  collected_by UUID REFERENCES users,
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES users,
  status TEXT DEFAULT 'pending',  -- 'pending', 'collected', 'received', 'rejected', 'processing', 'completed'
  rejected_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users,
  created_at TIMESTAMPTZ DEFAULT now()
)

specimen_events (
  id UUID PRIMARY KEY,
  specimen_id UUID REFERENCES specimens NOT NULL,
  event_type TEXT NOT NULL,   -- 'collected', 'received', 'rejected', 'aliquoted', 'processing', 'completed'
  details JSONB,
  performed_at TIMESTAMPTZ DEFAULT now(),
  performed_by UUID REFERENCES users
)

-- Results
lab_results (
  id UUID PRIMARY KEY,
  order_item_id UUID REFERENCES lab_order_items NOT NULL,
  specimen_id UUID REFERENCES specimens,
  result_value TEXT,          -- numeric or text result
  result_text TEXT,           -- for narrative results
  units TEXT,
  reference_range TEXT,
  abnormal_flag TEXT,         -- 'N' normal, 'H' high, 'L' low, 'HH' critical high, 'LL' critical low
  notes TEXT,
  entered_by UUID REFERENCES users,
  entered_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID REFERENCES users,
  verified_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES users
)

-- Digital access tokens for results
lab_result_tokens (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES lab_orders NOT NULL,
  token TEXT UNIQUE NOT NULL,  -- secure random token
  expires_at TIMESTAMPTZ NOT NULL,
  max_views INTEGER DEFAULT 10,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_viewed_at TIMESTAMPTZ
)
```

### Lab API Endpoints

```
# Catalog
GET  /api/labs/catalog/tests          - List tests (filters: section, active, query)
GET  /api/labs/catalog/panels         - List panels with included tests
GET  /api/labs/catalog/quick-picks    - Get quick-pick tests/panels for fast ordering

# Orders
POST /api/labs/orders                 - Create lab order (returns order with pending_payment status)
GET  /api/labs/orders                 - List orders (filters: status, patient, date, payment_status)
GET  /api/labs/orders/[id]            - Get order with items, specimens, results
PATCH /api/labs/orders/[id]           - Update order (notes, priority)
POST /api/labs/orders/[id]/items      - Add test/panel to order
DELETE /api/labs/orders/[id]/items/[itemId] - Remove item from order
POST /api/labs/orders/[id]/confirm-payment - Confirm payment (changes status to 'paid')
POST /api/labs/orders/[id]/cancel     - Cancel order

# Specimens
POST /api/labs/specimens              - Create/accession specimen
GET  /api/labs/specimens/[id]         - Get specimen with events
PATCH /api/labs/specimens/[id]        - Update specimen (appearance, volume, notes)
POST /api/labs/specimens/[id]/collect - Mark as collected
POST /api/labs/specimens/[id]/receive - Mark as received in lab
POST /api/labs/specimens/[id]/reject  - Reject specimen with reason
GET  /api/labs/specimens/[id]/label   - Get label data for printing

# Results
POST /api/labs/results                - Enter result for order item
PATCH /api/labs/results/[id]          - Update result
POST /api/labs/results/[id]/verify    - Verify result (senior MT)
POST /api/labs/orders/[id]/release    - Release all results for order

# Digital Access
POST /api/labs/orders/[id]/generate-token - Generate secure access token
GET  /api/labs/results/view/[token]   - Public endpoint: View results with token (no auth required)
POST /api/labs/orders/[id]/send-email - Send results via email

# Queue & Dashboard
GET  /api/labs/queue                  - Lab queue board (by lane)
GET  /api/labs/stats                  - Lab statistics (today's count, pending, turnaround times)

# Printing (returns printable HTML or data)
GET  /api/labs/orders/[id]/print/claim-slip   - Patient claim slip
GET  /api/labs/orders/[id]/print/lab-guide    - Lab procedure guide for MT
GET  /api/labs/orders/[id]/print/results      - Formatted results for printing
```

### Lab UI Components Needed

```
components/labs/
├── order/
│   ├── LabOrderForm.tsx           - Create new lab order
│   ├── LabOrderDetail.tsx         - Full order detail with all info
│   ├── LabOrderCard.tsx           - Compact order summary card
│   ├── OrderItemsList.tsx         - List of tests in an order
│   ├── OrderStatusBadge.tsx       - Status indicator with colors
│   └── PaymentStatusBadge.tsx     - Payment status indicator
│
├── catalog/
│   ├── TestCatalog.tsx            - Searchable test catalog
│   ├── QuickPicks.tsx             - Common test quick-pick chips
│   ├── PanelPicker.tsx            - Panel selection with test deselection
│   ├── TestCard.tsx               - Individual test display
│   └── SectionFilter.tsx          - Filter by lab section
│
├── specimen/
│   ├── SpecimenAccession.tsx      - Accession form with label preview
│   ├── SpecimenCard.tsx           - Specimen status card
│   ├── SpecimenTimeline.tsx       - Specimen event history
│   ├── CollectionForm.tsx         - Mark specimen as collected
│   └── RejectForm.tsx             - Reject specimen with reason
│
├── results/
│   ├── ResultsEntry.tsx           - Results grid with units/ranges
│   ├── ResultsVerification.tsx    - Verification workflow
│   ├── ResultsView.tsx            - Read-only results display
│   ├── AbnormalFlag.tsx           - Highlight abnormal values
│   └── ReferenceRange.tsx         - Display reference ranges
│
├── print/
│   ├── ClaimSlipPrint.tsx         - Printable claim slip
│   ├── LabGuidePrint.tsx          - Printable lab guide for MT
│   ├── ResultsPrint.tsx           - Printable results report
│   ├── LabelPreview.tsx           - Barcode label preview
│   └── PrintButton.tsx            - Trigger print with preview option
│
├── digital/
│   ├── QRCodeDisplay.tsx          - Show QR code for results access
│   ├── ShareLinkButton.tsx        - Copy shareable link
│   ├── EmailResultsButton.tsx     - Send results via email
│   └── PublicResultsView.tsx      - Public page for viewing results (no auth)
│
├── queue/
│   ├── LabQueueBoard.tsx          - Kanban-style queue view
│   ├── QueueLane.tsx              - Single lane (collection, processing, etc.)
│   ├── QueueCard.tsx              - Order card in queue
│   └── LabStats.tsx               - Statistics dashboard
│
└── shared/
    ├── PatientLabHistory.tsx      - Patient's lab order history
    └── LabOrderFromAppointment.tsx - Create order from appointment check-in
```

### Print vs Digital Choice Pattern

All print actions should offer both options:

```typescript
// Example: After order is paid
<div className="flex gap-2">
  <PrintButton
    label="Print Claim Slip"
    href={`/api/labs/orders/${orderId}/print/claim-slip`}
  />
  <Button variant="outline" onClick={() => setShowQR(true)}>
    View Digital
  </Button>
</div>

// QR code shows link patient can scan
<QRCodeDisplay
  url={`${baseUrl}/results/${token}`}
  label="Scan to view order status"
/>
```

### Appointment-Lab Integration Flow

**Appointment Creation with Labs:**

```typescript
// When creating appointment, can include lab requests
POST /api/appointments
{
  patientId: "...",
  scheduledAt: "...",
  type: "lab_visit",  // or "consultation_with_labs"
  labRequests: [
    { testId: "cbc-id" },
    { panelId: "lipid-panel-id" }
  ]
}
```

**Check-In Flow (creates lab order):**

```typescript
// On appointment check-in
POST /api/appointments/[id]/check-in
// This should:
// 1. Update appointment status to 'arrived'
// 2. Create visit record
// 3. IF appointment has labRequests:
//    - Auto-create lab_order with status 'pending_payment'
//    - Link lab_order to visit and appointment
//    - Return labOrderId in response

// Response:
{
  visitId: "...",
  labOrderId: "...",  // if labs were requested
  labOrderStatus: "pending_payment"
}
```

**Payment Flow:**

```typescript
// After Loyverse payment is complete, confirm in system
POST /api/labs/orders/[id]/confirm-payment
{
  paymentReference: "LOYVERSE-TXN-123",
  amount: 1500.00
}
// This changes order status from 'pending_payment' to 'paid'
// Collection can now proceed
```

**Sequence Diagram:**

```
Patient              Receptionist              System              Lab MT
   |                      |                       |                   |
   |--- Appointment ----->|                       |                   |
   |                      |--- Create Appt ------>|                   |
   |                      |    (with labs)        |                   |
   |                      |                       |                   |
   |--- Arrives --------->|                       |                   |
   |                      |--- Check-In --------->|                   |
   |                      |                       |-- Create Visit -->|
   |                      |                       |-- Create Lab Order (pending_payment)
   |                      |                       |                   |
   |--- Pay (Loyverse) -->|                       |                   |
   |                      |--- Confirm Payment -->|                   |
   |                      |                       |-- Status: paid -->|
   |                      |                       |                   |
   |                      |<-- Print/Show QR -----|                   |
   |<-- Claim Slip -------|                       |                   |
   |                      |                       |                   |
   |-------------------------------------------- Go to Lab ---------->|
   |                      |                       |                   |
   |                      |                       |<-- Collect -------|
   |                      |                       |<-- Process -------|
   |                      |                       |<-- Enter Results -|
   |                      |                       |<-- Verify --------|
   |                      |                       |                   |
   |<------------------- Results Ready (Email/SMS/QR) ----------------|
```

---

## UI Conventions

### Apple-like Design Principles

- Content-first with calm surfaces
- Subtle depth (shadows, not heavy borders)
- 8-14px border radius
- 4px spacing grid
- Neutral base colors (zinc/stone) with semantic accents
- Large hit targets on mobile (44px minimum)

### Status Badge Colors

```typescript
const statusColors = {
  // Appointments
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  arrived: 'bg-amber-100 text-amber-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',

  // Labs
  pending: 'bg-gray-100 text-gray-800',
  collected: 'bg-blue-100 text-blue-800',
  received: 'bg-indigo-100 text-indigo-800',
  processing: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  verified: 'bg-emerald-100 text-emerald-800',
  released: 'bg-teal-100 text-teal-800',
  rejected: 'bg-red-100 text-red-800',
};
```

### Form Validation Display

- Red background on invalid fields
- Inline error messages with icons
- Validation summary at top of form
- Real-time validation feedback

### Currency Formatting

```typescript
const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
```

---

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...
LOYVERSE_API_TOKEN=xxx
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
```

---

## Testing Approach

### Unit Tests

- Zod schema validations
- Utility functions
- Price calculations

### Integration Tests

- API route handlers with Supabase test instance
- Form submission flows

### E2E Tests (Playwright)

- Create lab order → collect specimen → enter results → verify → release
- Patient walk-in lab flow
- Full visit with labs flow

---

## Common Commands

```bash
# Development
cd apps/web && npm run dev

# Database migrations
cd supabase && npx supabase db push

# Type generation from Supabase
npx supabase gen types typescript --project-id xxx > types/supabase.ts
```

---

## Key Files Reference

| Purpose            | File                                        |
| ------------------ | ------------------------------------------- |
| Supabase client    | `apps/web/lib/db/client.ts`                 |
| Auth provider      | `apps/web/components/auth/AuthProvider.tsx` |
| Query provider     | `apps/web/lib/providers/query-provider.tsx` |
| Patient validation | `apps/web/lib/validations/patient.ts`       |
| Loyverse client    | `apps/web/lib/loyverse/client.ts`           |
| App shell          | `apps/web/components/shell/AppShell.tsx`    |
| Middleware         | `apps/web/middleware.ts`                    |

---

## Notes for Claude

1. **Always use Supabase directly** - No Prisma, no local database
2. **Generate UUIDs server-side** using `crypto.randomUUID()`
3. **Use service role for writes** to bypass RLS
4. **Follow existing patterns** - Check similar modules for reference
5. **Labs is priority** - Focus on completing the laboratory workflow
6. **Philippine context** - PHP currency, Manila timezone, local medical forms
7. **Payment before service** - Lab specimens not collected until payment settled
8. **Two-receipt system** - Patient claim slip + Lab procedure guide
