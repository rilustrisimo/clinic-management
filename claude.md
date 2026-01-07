# Claude Code Guide — Clinic Management System

## Project Overview

A modern Clinic Management System for a **single Philippine clinic** with an Apple-like UI. The system handles patient registration, appointments, visits/queue management, laboratory services, billing, and inventory.

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
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)

    // Parse query params
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Query with Supabase
    const { data, error, count } = await supabase
      .from('table_name')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      items: data,
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('[API /resource] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // For writes, use service role to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const body = await request.json()

    // Validate with Zod schema
    const validated = mySchema.parse(body)

    // Generate UUID for new records
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('table_name')
      .insert({ id, ...validated })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('[API /resource] Create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create' },
      { status: 500 }
    )
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
import { z } from 'zod'

export const mySchema = z.object({
  requiredField: z.string().min(1, 'Required'),
  optionalField: z.string().optional().nullable(),
  enumField: z.enum(['option1', 'option2', 'option3']),
  dateField: z.string().refine((val) => {
    if (!val) return true
    const date = new Date(val)
    return !isNaN(date.getTime())
  }, 'Invalid date'),
  // Use .refine() for complex validations
  email: z.string().optional().refine((val) => {
    if (!val) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }, 'Invalid email format'),
})

export type MyFormData = z.infer<typeof mySchema>
```

### TanStack Query Pattern

```typescript
// Queries
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', filters],
  queryFn: () => fetch(`/api/resource?${params}`).then(r => r.json())
})

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
  }
})
```

### Component File Structure

```typescript
// components/[domain]/[component-name].tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
// UI imports from packages/ui
import { Button } from '@clinic/ui/button'
import { Input } from '@clinic/ui/input'

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
const id = crypto.randomUUID()
```

### Timestamps
- Use ISO 8601 strings for API transport: `new Date().toISOString()`
- Store as `timestamp with time zone` in Postgres
- Display in local timezone (Asia/Manila)

### Status Fields
Use lowercase enum values:
```typescript
type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'cancelled' | 'no_show'
type VisitStatus = 'scheduled' | 'arrived' | 'triage' | 'in_consult' | 'in_procedure' | 'post_care' | 'ready_for_checkout' | 'checked_out' | 'closed'
type LabOrderStatus = 'pending' | 'collected' | 'received' | 'processing' | 'completed' | 'verified' | 'released'
type SpecimenStatus = 'pending' | 'collected' | 'received' | 'rejected' | 'processing' | 'completed'
```

### Soft Deletes
Use status changes instead of hard deletes:
- Appointments: `status = 'cancelled'`
- Patients: Add `archived_at` timestamp (when implemented)

---

## Laboratory Module Specification

### Workflow Overview (from clinic flowchart)

**Phase 1: Order & Payment**
1. Receptionist receives lab request from patient
2. Fill lab request form; select procedures in Loyverse/EMR
3. Settle payment; print receipt/claim form
4. Two receipts: Patient copy (claim slip) + Lab copy (procedure guide)

**Phase 2: Collection**
1. Patient presents receipt to Medical Technologist/Phlebotomist
2. Payment must be settled before specimen extraction
3. MT reviews receipt, prepares supplies (tubes, syringes, containers)
4. Label specimens with patient identifiers (name, age, barcode)
5. Collect specimens and forward to laboratory

**Phase 3: Processing & Results**
1. Phlebotomist forwards lab copy to performing MT
2. Performing MT runs tests
3. Results entered into EMR
4. Verification by senior MT/pathologist (for complex tests)

**Phase 4: Release**
1. Patient presents claim form
2. Receptionist checks results in EMR
3. Print results; verify all tests completed
4. Patient signs receiving logbook
5. Census recorded

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
lab_tests (id, code, name, section, specimen_type, method, default_units, reference_range, turnaround_hours, requires_fasting, active)
lab_panels (id, code, name, section, active)
lab_panel_items (panel_id, test_id, required)
lab_pricing (id, test_id, panel_id, sale_price, currency, active)

-- Lab orders
lab_orders (id, visit_id, patient_id, ordering_provider_id, priority, status, placed_at, notes)
lab_order_items (id, order_id, test_id, test_code, test_name, section, status, price_snapshot)

-- Specimens
specimens (id, order_item_id, type, container, collected_at, collected_by, received_at, received_by, volume_ml, appearance, preservative, accession_no, status, rejected_reason)
specimen_events (id, specimen_id, event_type, details, at, by_user)

-- Results
lab_results (id, order_item_id, specimen_id, result_value, result_text, units, reference_range, abnormal_flag, entered_by, entered_at, verified_by, verified_at, released_at)
```

### Lab API Endpoints

```
GET  /api/labs/catalog/tests      - List tests (with filters: section, active, query)
GET  /api/labs/catalog/panels     - List panels
POST /api/labs/orders             - Create lab order
GET  /api/labs/orders             - List orders (filters: status, patient, date)
GET  /api/labs/orders/[id]        - Get order with items
POST /api/labs/orders/[id]/items  - Add test to order
POST /api/labs/specimens          - Accession specimen
GET  /api/labs/specimens/[id]/label - Get label data (ZPL/TSPL)
POST /api/labs/specimens/[id]/events - Record specimen event (receive/reject/aliquot)
POST /api/labs/results            - Enter results
POST /api/labs/results/[id]/verify - Verify results
GET  /api/labs/queue              - Lab queue board (by lane: collection, receiving, processing, verification)
```

### Lab UI Components Needed

```
components/labs/
├── LabOrderForm.tsx           - Create new lab order
├── TestCatalog.tsx            - Searchable test catalog
├── QuickPicks.tsx             - Common test quick-pick chips
├── PanelPicker.tsx            - Panel selection with test deselection
├── OrderItemsList.tsx         - List of tests in an order
├── SpecimenAccession.tsx      - Accession form with label preview
├── LabelPreview.tsx           - Barcode label preview
├── ResultsEntry.tsx           - Results grid with units/ranges
├── ResultsVerification.tsx    - Verification workflow
├── LabQueueBoard.tsx          - Kanban-style queue view
├── LabOrderDetail.tsx         - Full order detail page
└── SpecimenTimeline.tsx       - Specimen event history
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
}
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
    currency: 'PHP'
  }).format(amount)
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

| Purpose | File |
|---------|------|
| Supabase client | `apps/web/lib/db/client.ts` |
| Auth provider | `apps/web/components/auth/AuthProvider.tsx` |
| Query provider | `apps/web/lib/providers/query-provider.tsx` |
| Patient validation | `apps/web/lib/validations/patient.ts` |
| Loyverse client | `apps/web/lib/loyverse/client.ts` |
| App shell | `apps/web/components/shell/AppShell.tsx` |
| Middleware | `apps/web/middleware.ts` |

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
