"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { patientFormSchema, type PatientFormData } from "../../lib/validations/patient";

interface PatientFormProps {
  mode: "create" | "edit";
  patientId?: string;
  initialData?: Partial<PatientFormData>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PatientForm({
  mode,
  patientId,
  initialData,
  onSuccess,
  onCancel,
}: PatientFormProps) {
  const queryClient = useQueryClient();
  const [showReasonField, setShowReasonField] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PatientFormData>({
    resolver: async (data, context, options) => {
      // Parse the schema and convert Zod errors to react-hook-form format
      const result = patientFormSchema.safeParse(data);
      
      if (!result.success) {
        // Convert Zod errors to react-hook-form errors
        const fieldErrors: Record<string, { type: string; message: string }> = {};
        
        result.error.issues.forEach((issue) => {
          const path = issue.path.join('.');
          // Only take the FIRST error for each field
          if (!fieldErrors[path]) {
            fieldErrors[path] = {
              type: issue.code,
              message: issue.message,
            };
          }
        });
        
        console.log("Validation errors:", fieldErrors);
        
        return {
          values: {},
          errors: fieldErrors,
        };
      }
      
      console.log("Validation passed:", result.data);
      
      return {
        values: result.data,
        errors: {},
      };
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: initialData || {
      firstName: "",
      lastName: "",
      middleName: "",
      mrn: "",
      dob: "",
      gender: undefined,
      email: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
    },
  });

  const createPatientMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create patient");
      }

      return res.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      reset();
      
      // Extract patient ID from response (API returns { success, patient, source })
      const patientId = data.patient?.id || data.id;
      
      // Sync to Loyverse in background
      if (patientId) {
        console.log('[PatientForm] Syncing patient to Loyverse:', patientId);
        try {
          const response = await fetch('/api/loyverse/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId }),
          });
          
          const result = await response.json();
          console.log('[PatientForm] Loyverse sync result:', result);
          
          if (!response.ok) {
            console.error('[PatientForm] Loyverse sync failed:', result);
          }
        } catch (error) {
          console.error('[PatientForm] Failed to sync to Loyverse:', error);
        }
      } else {
        console.warn('[PatientForm] No patient ID found in response:', data);
      }
      
      onSuccess?.();
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: async (data: PatientFormData & { reason: string }) => {
      if (!patientId) throw new Error("Patient ID is required for update");

      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update patient");
      }

      return res.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
      setShowReasonField(false);
      
      // Extract patient ID for sync
      const updatedPatientId = patientId || data.patient?.id || data.id;
      
      // Sync to Loyverse in background
      if (updatedPatientId) {
        console.log('[PatientForm] Syncing updated patient to Loyverse:', updatedPatientId);
        try {
          await fetch('/api/loyverse/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId: updatedPatientId }),
          });
        } catch (error) {
          console.error('[PatientForm] Failed to sync to Loyverse:', error);
        }
      }
      
      onSuccess?.();
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    // Trim all string values before submission
    const trimmedData = {
      ...data,
      firstName: data.firstName?.trim(),
      lastName: data.lastName?.trim(),
      middleName: data.middleName?.trim() || null,
      mrn: data.mrn?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      phone: data.phone?.trim() || null,
      addressLine1: data.addressLine1?.trim() || null,
      addressLine2: data.addressLine2?.trim() || null,
    };

    if (mode === "create") {
      await createPatientMutation.mutateAsync(trimmedData);
    } else {
      // For edit mode, we need to show reason field first
      if (!showReasonField) {
        setShowReasonField(true);
        return;
      }

      // Get reason from form (will be added to form later)
      const reason = (document.getElementById("update-reason") as HTMLTextAreaElement)?.value;
      if (!reason) {
        alert("Please provide a reason for this update");
        return;
      }

      await updatePatientMutation.mutateAsync({ ...trimmedData, reason });
    }
  };

  const error = createPatientMutation.error || updatePatientMutation.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="text-sm font-medium text-red-800">Failed to save patient</p>
              <p className="text-xs text-red-600 mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">
                Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} before submitting
              </p>
              <ul className="mt-2 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-xs text-red-600">
                    • <strong className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</strong> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-xs font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("firstName")}
              type="text"
              id="firstName"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.firstName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="John"
              aria-invalid={errors.firstName ? "true" : "false"}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
            />
            {errors.firstName && (
              <p id="firstName-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="middleName" className="block text-xs font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              {...register("middleName")}
              type="text"
              id="middleName"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.middleName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Cruz"
              aria-invalid={errors.middleName ? "true" : "false"}
              aria-describedby={errors.middleName ? "middleName-error" : undefined}
            />
            {errors.middleName && (
              <p id="middleName-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.middleName.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-xs font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              {...register("lastName")}
              type="text"
              id="lastName"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.lastName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Doe"
              aria-invalid={errors.lastName ? "true" : "false"}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
            />
            {errors.lastName && (
              <p id="lastName-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dob" className="block text-xs font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              {...register("dob")}
              type="date"
              id="dob"
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.dob ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              aria-invalid={errors.dob ? "true" : "false"}
              aria-describedby={errors.dob ? "dob-error" : undefined}
            />
            {errors.dob && (
              <p id="dob-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.dob.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gender" className="block text-xs font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              {...register("gender")}
              id="gender"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              aria-invalid={errors.gender ? "true" : "false"}
              aria-describedby={errors.gender ? "gender-error" : undefined}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p id="gender-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.gender.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="mrn" className="block text-xs font-medium text-gray-700 mb-1">
              MRN
            </label>
            <input
              {...register("mrn")}
              type="text"
              id="mrn"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase ${
                errors.mrn ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } ${mode === "edit" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Auto-generated if empty"
              disabled={mode === "edit"}
              aria-invalid={errors.mrn ? "true" : "false"}
              aria-describedby={errors.mrn ? "mrn-error" : "mrn-hint"}
            />
            {errors.mrn ? (
              <p id="mrn-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.mrn.message}
              </p>
            ) : mode === "create" && (
              <p id="mrn-hint" className="mt-1 text-xs text-gray-500">
                Leave empty to auto-generate
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              {...register("phone")}
              type="tel"
              id="phone"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="+63 912 345 6789"
              aria-invalid={errors.phone ? "true" : "false"}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
            />
            {errors.phone ? (
              <p id="phone-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.phone.message}
              </p>
            ) : (
              <p id="phone-hint" className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +63)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              {...register("email")}
              type="email"
              id="email"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="john.doe@example.com"
              aria-invalid={errors.email ? "true" : "false"}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="addressLine1" className="block text-xs font-medium text-gray-700 mb-1">
              Address Line 1
            </label>
            <input
              {...register("addressLine1")}
              type="text"
              id="addressLine1"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.addressLine1 ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="123 Main Street"
              aria-invalid={errors.addressLine1 ? "true" : "false"}
              aria-describedby={errors.addressLine1 ? "addressLine1-error" : undefined}
            />
            {errors.addressLine1 && (
              <p id="addressLine1-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.addressLine1.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="addressLine2" className="block text-xs font-medium text-gray-700 mb-1">
              Address Line 2
            </label>
            <input
              {...register("addressLine2")}
              type="text"
              id="addressLine2"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.addressLine2 ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="Barangay, City, Province"
              aria-invalid={errors.addressLine2 ? "true" : "false"}
              aria-describedby={errors.addressLine2 ? "addressLine2-error" : "addressLine2-hint"}
            />
            {errors.addressLine2 ? (
              <p id="addressLine2-error" className="mt-1 text-xs text-red-600 flex items-start gap-1">
                <span className="text-red-500">⚠</span>
                {errors.addressLine2.message}
              </p>
            ) : (
              <p id="addressLine2-hint" className="mt-1 text-xs text-gray-500">
                City, province, postal code
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reason field for updates */}
      {mode === "edit" && showReasonField && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xl">📝</span>
            <div>
              <h3 className="text-sm font-medium text-amber-900">Document Your Changes</h3>
              <p className="text-xs text-amber-700 mt-1">
                For audit and compliance purposes, please explain why you&apos;re updating this patient&apos;s information.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="update-reason" className="block text-xs font-medium text-gray-700 mb-1">
              Reason for Update <span className="text-red-500">*</span>
            </label>
            <textarea
              id="update-reason"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Example: Patient called to update phone number from +63 912 345 6789 to +63 917 123 4567"
              maxLength={500}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Be specific about what changed and why. This will be saved in the patient&apos;s version history.
            </p>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || createPatientMutation.isPending || updatePatientMutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || createPatientMutation.isPending || updatePatientMutation.isPending
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : mode === "create"
            ? "Create Patient"
            : showReasonField
            ? "Save Changes"
            : "Continue"}
        </button>
      </div>
    </form>
  );
}
