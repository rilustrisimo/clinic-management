/**
 * Loyverse Patient-Customer Sync Service
 * Maps clinic patients to Loyverse customers
 */

import { getLoyverseClient, LoyverseCustomer } from './client';
import { getSupabaseClient } from '../db/client';

export class LoyversePatientSync {
  /**
   * Map a Patient from our system to Loyverse Customer format
   */
  private mapPatientToCustomer(patient: any): LoyverseCustomer {
    const fullName = [
      patient.firstName,
      patient.middleName,
      patient.lastName
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: patient.loyverse_customer_id || undefined, // Use existing ID if already synced
      name: fullName.slice(0, 64), // Max 64 chars
      email: patient.email?.slice(0, 100) || undefined,
      phone_number: patient.phone?.slice(0, 15) || undefined,
      address: patient.address?.slice(0, 192) || undefined,
      city: undefined, // Add if you have city field
      region: undefined, // Add if you have region field
      postal_code: undefined, // Add if you have postal code field
      country_code: 'PH', // Philippines - adjust as needed
      customer_code: patient.mrn?.slice(0, 40) || undefined, // Use MRN as customer code
      note: `Clinic Patient - MRN: ${patient.mrn}`,
      // Visit stats - you can populate from Visit table
      first_visit: undefined,
      last_visit: undefined,
      total_visits: 0,
      total_spent: 0,
      total_points: 0,
    };
  }

  /**
   * Sync a single patient to Loyverse
   */
  async syncPatient(patientId: string): Promise<{
    success: boolean;
    loyverseCustomerId?: string;
    error?: string;
  }> {
    try {
      console.log(`[LoyverseSync] Syncing patient ${patientId}...`);

      // Get patient from database
      const supabase = getSupabaseClient();
      const { data: patient, error: patientError } = await supabase
        .from('Patient')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError || !patient) {
        throw new Error('Patient not found');
      }

      // Map to Loyverse format
      const customerData = this.mapPatientToCustomer(patient);

      // Upsert to Loyverse
      const loyverseClient = getLoyverseClient();
      const loyverseCustomer = await loyverseClient.upsertCustomer(customerData);

      console.log(`[LoyverseSync] Patient synced successfully: ${loyverseCustomer.id}`);

      // Update patient with Loyverse customer ID
      const { error: updateError } = await supabase
        .from('Patient')
        .update({ loyverse_customer_id: loyverseCustomer.id })
        .eq('id', patientId);
      
      if (updateError) throw updateError;

      return {
        success: true,
        loyverseCustomerId: loyverseCustomer.id,
      };
    } catch (error: any) {
      console.error(`[LoyverseSync] Error syncing patient ${patientId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sync all patients to Loyverse
   */
  async syncAllPatients(): Promise<{
    total: number;
    synced: number;
    failed: number;
    errors: string[];
  }> {
    console.log('[LoyverseSync] Starting bulk patient sync...');

    const supabase = getSupabaseClient();
    const { data: patients, error: patientsError } = await supabase
      .from('Patient')
      .select('id')
      .order('"createdAt"', { ascending: true });
    
    if (patientsError) {
      console.error('[LoyverseSync] Error fetching patients:', patientsError);
    }

    const results = {
      total: patients?.length || 0,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!patients) return results;

    for (const patient of patients) {
      const result = await this.syncPatient(patient.id);
      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push(`${patient.id}: ${result.error}`);
      }
    }

    console.log('[LoyverseSync] Bulk sync completed:', results);
    return results;
  }

  /**
   * Delete a patient from Loyverse
   */
  async deletePatient(patientId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const supabase = getSupabaseClient();
      const { data: patient, error: patientError } = await supabase
        .from('Patient')
        .select('loyverse_customer_id')
        .eq('id', patientId)
        .single();
      
      if (patientError) throw patientError;

      if (!patient?.loyverse_customer_id) {
        return { success: true }; // Not synced to Loyverse yet
      }

      const loyverseClient = getLoyverseClient();
      await loyverseClient.deleteCustomer(patient.loyverse_customer_id);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Import customers from Loyverse
   * Returns all Loyverse customers with potential patient matches
   */
  async importFromLoyverse(): Promise<{
    success: boolean;
    customers: Array<{
      loyverseCustomer: LoyverseCustomer;
      potentialMatches: Array<{
        id: string;
        firstName: string;
        lastName: string;
        email: string | null;
        phone: string | null;
        loyverse_customer_id: string | null;
        matchScore: number;
        matchReasons: string[];
      }>;
    }>;
    error?: string;
  }> {
    try {
      console.log('[LoyverseSync] Fetching customers from Loyverse...');
      
      const loyverseClient = getLoyverseClient();
      const response = await loyverseClient.getCustomers({ limit: 250 });
      const customers = response.customers || [];

      console.log(`[LoyverseSync] Found ${customers.length} Loyverse customers`);

      // Get all existing patients
      const supabase = getSupabaseClient();
      const { data: patients, error: patientsError } = await supabase
        .from('Patient')
        .select('id, "firstName", "lastName", email, phone, loyverse_customer_id')
        .is('deleted_at', null);

      if (patientsError) throw patientsError;

      // For each Loyverse customer, find potential patient matches
      const customersWithMatches = customers.map((customer: LoyverseCustomer) => {
        const potentialMatches = this.findPotentialMatches(customer, patients || []);
        return {
          loyverseCustomer: customer,
          potentialMatches,
        };
      });

      return {
        success: true,
        customers: customersWithMatches,
      };
    } catch (error: any) {
      console.error('[LoyverseSync] Error importing from Loyverse:', error);
      return {
        success: false,
        customers: [],
        error: error.message,
      };
    }
  }

  /**
   * Find potential patient matches for a Loyverse customer
   */
  private findPotentialMatches(
    customer: LoyverseCustomer,
    patients: any[]
  ): Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    loyverse_customer_id: string | null;
    matchScore: number;
    matchReasons: string[];
  }> {
    const matches: any[] = [];

    for (const patient of patients) {
      let matchScore = 0;
      const matchReasons: string[] = [];

      // Already linked to this Loyverse customer
      if (patient.loyverse_customer_id === customer.id) {
        matchScore += 100;
        matchReasons.push('Already linked');
      }

      // Email match (strong signal)
      if (customer.email && patient.email && 
          customer.email.toLowerCase() === patient.email.toLowerCase()) {
        matchScore += 50;
        matchReasons.push('Email match');
      }

      // Phone match (strong signal)
      if (customer.phone_number && patient.phone) {
        const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
        if (normalizePhone(customer.phone_number) === normalizePhone(patient.phone)) {
          matchScore += 50;
          matchReasons.push('Phone match');
        }
      }

      // Name similarity (weak signal)
      if (customer.name && patient.firstName && patient.lastName) {
        const customerName = customer.name.toLowerCase();
        const patientName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        
        if (customerName === patientName) {
          matchScore += 30;
          matchReasons.push('Exact name match');
        } else if (customerName.includes(patient.lastName.toLowerCase()) || 
                   patientName.includes(customer.name.toLowerCase())) {
          matchScore += 15;
          matchReasons.push('Partial name match');
        }
      }

      // Only include if there's some match
      if (matchScore > 0) {
        matches.push({
          ...patient,
          matchScore,
          matchReasons,
        });
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Import a Loyverse customer as a new patient
   */
  async importCustomerAsPatient(
    customer: LoyverseCustomer
  ): Promise<{
    success: boolean;
    patientId?: string;
    error?: string;
  }> {
    try {
      console.log(`[LoyverseSync] Importing Loyverse customer as patient: ${customer.name}`);

      // Parse name (simple splitting - first word is firstName, rest is lastName)
      const nameParts = customer.name.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Unknown';

      const supabase = getSupabaseClient();
      const { data: patient, error: insertError } = await supabase
        .from('Patient')
        .insert({
          "firstName": firstName,
          "lastName": lastName,
          email: customer.email || null,
          phone: customer.phone_number || null,
          address: customer.address || null,
          loyverse_customer_id: customer.id,
          mrn: customer.customer_code || null,
          // Required fields with defaults
          dob: new Date('2000-01-01').toISOString(), // Default DOB - should be updated
          gender: 'unknown',
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`[LoyverseSync] ✅ Customer imported as patient: ${patient.id}`);

      return {
        success: true,
        patientId: patient.id,
      };
    } catch (error: any) {
      console.error('[LoyverseSync] Error importing customer:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Link an existing patient to a Loyverse customer
   */
  async linkPatientToCustomer(
    patientId: string,
    loyverseCustomerId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`[LoyverseSync] Linking patient ${patientId} to Loyverse customer ${loyverseCustomerId}`);

      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase
        .from('Patient')
        .update({ loyverse_customer_id: loyverseCustomerId })
        .eq('id', patientId);

      if (updateError) throw updateError;

      console.log(`[LoyverseSync] ✅ Patient linked successfully`);

      return { success: true };
    } catch (error: any) {
      console.error('[LoyverseSync] Error linking patient:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export const loyversePatientSync = new LoyversePatientSync();
