# Clinic Management System

> A modern, comprehensive clinic management solution built for single Philippine clinics with an Apple-inspired interface

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Development](#development)
- [Database](#database)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

A complete clinic management system designed for Philippine healthcare providers, featuring patient registration, appointment scheduling, queue management, laboratory services, billing, and inventory management.

**Project Owner:** Rouie Ilustrisimo  
**Currency:** PHP (Philippine Peso)  
**Timezone:** Asia/Manila (GMT+8)

## ✨ Features

### Core Modules
- **👥 Patient Management** - Complete patient registration, demographics, and medical records
- **📅 Appointments** - Scheduling with calendar views (day/week/month), reminders, and status tracking
- **🏥 Visits & Queue** - Real-time queue management with triage and multi-stage workflows
- **🔬 Laboratory** - Full lab workflow from ordering to results release with specimen tracking
- **💰 Billing** - Integrated billing with Loyverse POS for seamless payment processing
- **📦 Inventory** - Medical supplies and pharmacy stock management

### Key Capabilities
- 🔄 **Loyverse POS Integration** - Bi-directional sync for customers and catalog items
- 📊 **Real-time Updates** - Live queue boards and status updates
- 🎨 **Apple-like UI/UX** - Clean, intuitive interface with smooth animations
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🔐 **Role-based Access** - Secure authentication with user permissions
- 📝 **Comprehensive Forms** - Philippine medical forms and documentation

## 🛠 Tech Stack

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [TailwindCSS](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **State Management:** [TanStack Query v5](https://tanstack.com/query)
- **Form Handling:** [React Hook Form](https://react-hook-form.com/)
- **Validation:** [Zod](https://zod.dev/)

### Backend
- **Database:** [Supabase PostgreSQL](https://supabase.com/)
- **Authentication:** Supabase Auth
- **API:** Next.js API Routes
- **Real-time:** Supabase Realtime

### Integration
- **POS System:** Loyverse API
- **Payment:** Integrated through Loyverse

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Loyverse account (for POS integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clinic-management.git
   cd clinic-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` in `apps/web/`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE=your-service-role-key
   LOYVERSE_API_TOKEN=your-loyverse-token
   NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
   ```

4. **Run database migrations**
   ```bash
   cd supabase
   npx supabase db push
   ```

5. **Start development server**
   ```bash
   cd apps/web
   npm run dev
   ```

6. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
clinic-management/
├── apps/
│   └── web/                      # Main Next.js application
│       ├── app/                  # App Router pages
│       │   ├── api/             # API route handlers
│       │   ├── appointments/    # Appointment module
│       │   ├── patients/        # Patient management
│       │   ├── visits/          # Visit/queue management
│       │   ├── labs/            # Laboratory module
│       │   ├── billing/         # Billing module
│       │   └── inventory/       # Inventory module
│       ├── components/          # React components
│       │   ├── auth/           # Authentication
│       │   ├── patients/       # Patient components
│       │   ├── appointments/   # Appointment components
│       │   ├── visits/         # Visit components
│       │   ├── labs/           # Lab components
│       │   └── shell/          # App shell (TopBar, LeftDock)
│       └── lib/                # Utilities and services
│           ├── db/             # Database client
│           ├── validations/    # Zod schemas
│           └── loyverse/       # Loyverse API client
├── packages/
│   └── ui/                      # Shared shadcn/ui components
├── supabase/
│   └── migrations/              # Database migrations
└── references/                  # Workflow diagrams and forms
```

## 🏗 Architecture

### Database Architecture
- **Primary Database:** Supabase PostgreSQL (hosted)
- **No Local Database:** Direct connection to Supabase only — no Prisma, no local containers
- **Authentication:** Supabase Auth with RLS (Row Level Security)
- **Real-time:** Supabase Realtime subscriptions for live updates

### API Patterns
- **Service Role:** Used for write operations requiring elevated privileges (bypasses RLS)
- **Anon Key:** Used for read operations with RLS security policies
- **API Routes:** Next.js route handlers in `app/api/`
- **Error Handling:** Consistent error responses with proper HTTP status codes

### Data Flow
1. **UI Components** → React Hook Form + Zod validation
2. **Form Submission** → API Routes (Next.js)
3. **API Logic** → Supabase Client (service role for writes)
4. **Database** → PostgreSQL with RLS policies
5. **Updates** → TanStack Query cache invalidation
6. **Real-time** → Supabase subscriptions for live data

### Integration Architecture
- **Loyverse POS:** Bi-directional sync for customers and catalog
  - Patient creation → Sync to Loyverse
  - Loyverse updates → Webhook to clinic system
  - Catalog items → Shared between systems

## 💻 Development

### Code Conventions

#### API Route Pattern
```typescript
// app/api/resource/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db/client'

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)

    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API /api/resource] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Use service role for writes
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!,
      { auth: { persistSession: false } }
    )

    const body = await request.json()
    const id = crypto.randomUUID()

    const { data, error } = await supabase
      .from('table_name')
      .insert({ id, ...body })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[API /api/resource] Create error:', error)
    return NextResponse.json(
      { error: 'Failed to create' },
      { status: 500 }
    )
  }
}
```

**Logging Convention:** Always prefix logs with context:
- `[API /path]` for API routes
- `[Component Name]` for React components
- `[ServiceName]` for services (e.g., `[LoyverseSync]`)

#### Form Handling Pattern
```typescript
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function MyForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: async (data) => {
      const result = mySchema.safeParse(data)
      if (result.success) {
        return { values: result.data, errors: {} }
      }
      // Convert Zod errors to react-hook-form format
      const fieldErrors: Record<string, { message: string }> = {}
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path.join('.')] = { message: issue.message }
      })
      return { values: {}, errors: fieldErrors }
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource'] })
      onSuccess?.()
    }
  })

  return <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>...</form>
}
```

#### Zod Validation Pattern
```typescript
// lib/validations/my-schema.ts
import { z } from 'zod'

export const mySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  status: z.enum(['active', 'inactive', 'pending']),
  date: z.string().refine((val) => {
    return !isNaN(Date.parse(val))
  }, 'Invalid date'),
})

export type MyFormData = z.infer<typeof mySchema>
```

#### TanStack Query Pattern
```typescript
// Queries
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetch(`/api/resource/${id}`).then(r => r.json())
})

// Mutations
const mutation = useMutation({
  mutationFn: async (data) => {
    return fetch('/api/resource', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] })
  }
})
```

### Database Conventions

- **IDs:** Use UUID v4 with `crypto.randomUUID()` — no auto-increment
- **Timestamps:** 
  - Store as `timestamp with time zone` in PostgreSQL
  - Use `new Date().toISOString()` for API transport
  - Display in Asia/Manila timezone
  - Fields: `created_at`, `updated_at`
- **Status Fields:** Use lowercase string enums (e.g., `'pending' | 'active' | 'completed'`)
- **Soft Deletes:** Use status changes or `archived_at`/`deleted_at` timestamps
- **Naming:** snake_case for columns, camelCase in TypeScript

### UI Conventions

**Apple-inspired Design:**
- Clean, minimal, spacious layouts
- Neutral grays (zinc/stone) with blue accents
- 8-14px border radius for cards/buttons
- Subtle shadows, avoid heavy borders
- 4px spacing grid
- Large touch targets (44px minimum on mobile)

**Status Badge Colors:**
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

**Currency Formatting:**
```typescript
const formatPHP = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount)
```

### Common Commands

```bash
# Development
npm run dev              # Start dev server (from apps/web/)

# Database
cd supabase && npx supabase db push           # Push migrations
npx supabase gen types typescript --project-id xxx > types/supabase.ts  # Generate types

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript check
```

## 📊 Database Schema

### Core Tables

**Patients**
```sql
patients (
  id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  loyverse_customer_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Appointments**
```sql
appointments (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients,
  scheduled_at TIMESTAMPTZ,
  status TEXT,  -- 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'cancelled'
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

**Visits**
```sql
visits (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients,
  visit_date DATE,
  status TEXT,  -- 'scheduled' | 'arrived' | 'triage' | 'in_consult' | 'completed'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Laboratory Tables

**Lab Tests & Panels**
```sql
lab_tests (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  section TEXT,  -- 'Hematology' | 'Chemistry' | 'Urinalysis' | etc.
  specimen_type TEXT,
  method TEXT,
  default_units TEXT,
  reference_range TEXT,
  turnaround_hours INTEGER,
  requires_fasting BOOLEAN,
  active BOOLEAN,
  created_at TIMESTAMPTZ
)

lab_panels (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  section TEXT,
  active BOOLEAN
)

lab_panel_items (
  panel_id UUID REFERENCES lab_panels,
  test_id UUID REFERENCES lab_tests,
  required BOOLEAN,
  PRIMARY KEY (panel_id, test_id)
)
```

**Lab Orders & Results**
```sql
lab_orders (
  id UUID PRIMARY KEY,
  visit_id UUID REFERENCES visits,
  patient_id UUID REFERENCES patients,
  ordering_provider_id UUID,
  priority TEXT,  -- 'routine' | 'urgent' | 'stat'
  status TEXT,    -- 'pending' | 'collected' | 'processing' | 'completed' | 'released'
  placed_at TIMESTAMPTZ,
  notes TEXT
)

lab_order_items (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES lab_orders,
  test_id UUID REFERENCES lab_tests,
  test_code TEXT,
  test_name TEXT,
  section TEXT,
  status TEXT,
  price_snapshot DECIMAL
)

specimens (
  id UUID PRIMARY KEY,
  order_item_id UUID REFERENCES lab_order_items,
  type TEXT,
  container TEXT,
  collected_at TIMESTAMPTZ,
  collected_by UUID,
  received_at TIMESTAMPTZ,
  received_by UUID,
  volume_ml DECIMAL,
  appearance TEXT,
  accession_no TEXT UNIQUE,
  status TEXT,  -- 'pending' | 'collected' | 'received' | 'rejected' | 'processing'
  rejected_reason TEXT
)

lab_results (
  id UUID PRIMARY KEY,
  order_item_id UUID REFERENCES lab_order_items,
  specimen_id UUID REFERENCES specimens,
  result_value TEXT,
  result_text TEXT,
  units TEXT,
  reference_range TEXT,
  abnormal_flag TEXT,  -- 'H' | 'L' | 'HH' | 'LL'
  entered_by UUID,
  entered_at TIMESTAMPTZ,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
)
```

## 🔬 Laboratory Module

### Workflow Overview

The lab module implements a 4-phase workflow based on clinic operations:

**Phase 1: Order & Payment**
- Receptionist receives lab request from patient
- Select tests/panels in system
- Settle payment through Loyverse POS
- Print two receipts: Patient claim slip + Lab procedure guide
- Payment required before specimen collection

**Phase 2: Collection**
- Patient presents receipt to Medical Technologist/Phlebotomist
- MT reviews order, prepares supplies
- Label specimens with patient identifiers and accession number
- Collect specimens and forward to laboratory

**Phase 3: Processing & Results**
- Performing MT runs tests
- Results entered into system
- Verification by senior MT/pathologist (for complex tests)

**Phase 4: Release**
- Patient presents claim form
- Receptionist checks results in system
- Print results and have patient sign logbook
- Mark as released in system

### Test Categories

- **Hematology:** CBC, Blood Typing, ESR, Platelet Count
- **Clinical Chemistry:** FBS, RBS, HbA1c, Lipid Profile, Creatinine, BUN, Uric Acid, SGPT, SGOT
- **Urinalysis:** Routine UA, Pregnancy Test
- **Serology:** HBsAg, Anti-HCV, HIV, VDRL, Dengue NS1
- **Fecalysis:** Routine Stool, FOBT
- **Drug Testing:** 5-panel, 10-panel

### Specimen Types

- Blood (EDTA, SST, heparin, citrate tubes)
- Urine (clean catch, midstream, 24-hour)
- Stool (fresh, preserved)
- Swabs (throat, nasal, wound, vaginal)
- Specialized (CSF, tissue, sputum)

## 📡 API Reference

### Lab Endpoints

```
GET  /api/labs/catalog/tests      List tests (filters: section, active, query)
GET  /api/labs/catalog/panels     List panels
POST /api/labs/orders             Create lab order
GET  /api/labs/orders             List orders (filters: status, patient, date)
GET  /api/labs/orders/[id]        Get order with items
POST /api/labs/orders/[id]/items  Add test to order
POST /api/labs/specimens          Accession specimen
GET  /api/labs/specimens/[id]/label  Get label data (ZPL/TSPL)
POST /api/labs/results            Enter results
POST /api/labs/results/[id]/verify  Verify results
GET  /api/labs/queue              Lab queue board
```

### Patient Endpoints

```
GET  /api/patients                List patients (with pagination)
GET  /api/patients/[id]           Get patient details
POST /api/patients                Create patient
PUT  /api/patients/[id]           Update patient
```

### Appointment Endpoints

```
GET  /api/appointments            List appointments (filters: date, status)
GET  /api/appointments/[id]       Get appointment details
POST /api/appointments            Create appointment
PUT  /api/appointments/[id]       Update appointment
DELETE /api/appointments/[id]     Cancel appointment
```

## 🚢 Deployment

### Supabase Setup

1. Create new Supabase project
2. Run migrations from `supabase/migrations/`
3. Configure RLS policies for security
4. Set up webhooks (if using Loyverse integration)

### Vercel Deployment

1. Connect GitHub repository
2. Configure environment variables
3. Deploy to production

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
LOYVERSE_API_TOKEN=your-loyverse-token
NEXT_PUBLIC_APP_BASE_URL=https://your-domain.com
```

## 🤝 Contributing

### Development Guidelines

1. **Follow existing patterns** - Check similar modules for reference
2. **Use TypeScript strictly** - No `any` types
3. **Validate with Zod** - All form inputs and API payloads
4. **Test thoroughly** - Unit tests for utilities, integration tests for APIs
5. **Philippine context** - PHP currency, Manila timezone, local medical forms

### Key Reminders

- Always use Supabase directly (no Prisma, no local database)
- Generate UUIDs server-side using `crypto.randomUUID()`
- Use service role for writes to bypass RLS
- Labs module is current priority
- Payment before service (specimens not collected until payment settled)
- Two-receipt system (patient claim slip + lab procedure guide)

### Pull Request Process

1. Create feature branch from `main`
2. Make changes following code conventions
3. Test locally with Supabase connection
4. Submit PR with clear description
5. Ensure all checks pass

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for Philippine clinics**
