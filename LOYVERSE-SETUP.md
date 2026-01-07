# Loyverse Integration Setup

## Step 1: Add Environment Variable

Add your Loyverse API token to `apps/web/.env.local`:

```env
LOYVERSE_API_TOKEN=your_api_token_here
```

Get your token from: https://r-keeper.loyverse.com/settings/integrations

## Step 2: Run Supabase Migration

Open Supabase SQL Editor and run:

```sql
-- Add loyverse_customer_id to Patient table
ALTER TABLE "public"."Patient" 
ADD COLUMN IF NOT EXISTS "loyverse_customer_id" TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_patient_loyverse_customer_id" 
ON "public"."Patient"("loyverse_customer_id");

-- Add comment
COMMENT ON COLUMN "public"."Patient"."loyverse_customer_id" IS 'Loyverse customer ID for sync';
```

## Step 3: Test the Integration

### Create a New Patient
1. Go to http://localhost:3000/patients
2. Click "New Patient"
3. Fill in the form and save
4. Check the console - you should see: `✅ Patient synced to Loyverse`

### Update a Patient
1. Edit an existing patient
2. Make changes and save
3. Patient will auto-sync to Loyverse

### Manual Sync Single Patient
```bash
curl -X POST http://localhost:3000/api/loyverse/sync \
  -H "Content-Type: application/json" \
  -d '{"patientId": "paste-patient-id-here"}'
```

### Bulk Sync All Patients
```bash
curl -X POST http://localhost:3000/api/loyverse/sync \
  -H "Content-Type: application/json" \
  -d '{"syncAll": true}'
```

## Data Mapping

| Clinic Field | Loyverse Field | Max Length |
|--------------|----------------|------------|
| firstName + middleName + lastName | name | 64 chars |
| email | email | 100 chars |
| phone | phone_number | 15 chars |
| address | address | 192 chars |
| mrn | customer_code | 40 chars |
| - | country_code | 'PH' (Philippines) |

## Files Created

✅ `/apps/web/lib/loyverse/client.ts` - Loyverse API client
✅ `/apps/web/lib/loyverse/sync.ts` - Patient sync service
✅ `/apps/web/app/api/loyverse/sync/route.ts` - Sync API endpoint
✅ `/supabase/migrations/20251129000001_add_loyverse_customer_id.sql` - Database migration
✅ `/packages/db/prisma/schema.prisma` - Updated with loyverseCustomerId field
✅ `/apps/web/components/patients/patient-form.tsx` - Auto-sync on create/update

## Features

- ✅ **Auto-sync on create** - New patients sync to Loyverse automatically
- ✅ **Auto-sync on update** - Patient changes sync to Loyverse
- ✅ **Idempotent** - Uses `loyverseCustomerId` to prevent duplicates
- ✅ **Bulk sync** - Sync all existing patients at once
- ✅ **Error handling** - Graceful failures don't break patient operations
- ✅ **Background sync** - Doesn't block UI operations

## Next Steps

1. Add your `LOYVERSE_API_TOKEN` to `.env.local`
2. Run the SQL migration in Supabase
3. Restart your dev server
4. Test by creating a new patient!
