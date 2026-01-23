'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { PatientForm } from '../../../components/patients/patient-form';
import { VersionHistory } from '../../../components/patients/version-history';
import { AppointmentForm } from '../../../components/appointments/appointment-form';

interface Patient {
  id: string;
  mrn: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dob: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  age: number;
}

interface Appointment {
  id: string;
  patientId: string;
  providerId: string | null;
  startsAt: string;
  endsAt: string;
  type: string | null;
  reason: string | null;
  notes: string | null;
  status: string;
  totalPrice?: number;
  soapSubjective?: string | null;
  soapObjective?: string | null;
  soapAssessment?: string | null;
  soapPlan?: string | null;
  provider?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  services?: Array<{
    id: string;
    itemId: string;
    variantId: string;
    itemName: string | null;
    variantName: string | null;
    basePrice: number;
    modifiers?: Array<{
      id: string;
      modifierId: string;
      optionId: string;
      modifierName: string | null;
      optionName: string | null;
      price: number;
    }>;
  }>;
}

async function fetchPatient(id: string): Promise<Patient> {
  const response = await fetch(`/api/patients/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch patient');
  }
  return response.json();
}

async function fetchPatientAppointments(
  patientId: string,
): Promise<{ appointments: Appointment[] }> {
  const response = await fetch(`/api/appointments?patientId=${patientId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch appointments');
  }
  return response.json();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getStatusColor(status: string): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    scheduled: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-900/50',
      text: 'text-blue-700 dark:text-blue-300',
      badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    },
    completed: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-900/50',
      text: 'text-green-700 dark:text-green-300',
      badge: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    },
    cancelled: {
      bg: 'bg-neutral-50 dark:bg-neutral-900/20',
      border: 'border-neutral-200 dark:border-neutral-900/50',
      text: 'text-neutral-700 dark:text-neutral-300',
      badge: 'bg-neutral-100 dark:bg-neutral-900/50 text-neutral-700 dark:text-neutral-300',
    },
    no_show: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-900/50',
      text: 'text-red-700 dark:text-red-300',
      badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    },
  };
  return colors[status] || colors.scheduled;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const patientId = params.id as string;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditingSOAP, setIsEditingSOAP] = useState(false);
  const [soapData, setSOAPData] = useState({
    soapSubjective: '',
    soapObjective: '',
    soapAssessment: '',
    soapPlan: '',
  });

  const {
    data: patient,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => fetchPatient(patientId),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', patientId],
    queryFn: () => fetchPatientAppointments(patientId),
    enabled: !!patientId,
  });

  const appointments = (appointmentsData?.appointments || []).sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
  );

  const deletePatientMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete patient');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      router.push('/patients');
    },
  });

  const updateSOAPMutation = useMutation({
    mutationFn: async (data: { appointmentId: string; soapData: typeof soapData }) => {
      const response = await fetch(`/api/appointments/${data.appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.soapData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update SOAP notes');
      }

      return response.json();
    },
    onSuccess: async (updatedAppointment) => {
      await queryClient.invalidateQueries({ queryKey: ['appointments', patientId] });
      // Update the selected appointment with the new SOAP data
      if (selectedAppointment) {
        setSelectedAppointment({
          ...selectedAppointment,
          soapSubjective: updatedAppointment.soapSubjective,
          soapObjective: updatedAppointment.soapObjective,
          soapAssessment: updatedAppointment.soapAssessment,
          soapPlan: updatedAppointment.soapPlan,
        });
      }
      setIsEditingSOAP(false);
    },
  });

  const handleEditSOAP = () => {
    if (selectedAppointment) {
      setSOAPData({
        soapSubjective: selectedAppointment.soapSubjective || '',
        soapObjective: selectedAppointment.soapObjective || '',
        soapAssessment: selectedAppointment.soapAssessment || '',
        soapPlan: selectedAppointment.soapPlan || '',
      });
      setIsEditingSOAP(true);
    }
  };

  const handleSaveSOAP = () => {
    if (selectedAppointment) {
      updateSOAPMutation.mutate({
        appointmentId: selectedAppointment.id,
        soapData,
      });
    }
  };

  const handleCancelSOAP = () => {
    setIsEditingSOAP(false);
    if (selectedAppointment) {
      setSOAPData({
        soapSubjective: selectedAppointment.soapSubjective || '',
        soapObjective: selectedAppointment.soapObjective || '',
        soapAssessment: selectedAppointment.soapAssessment || '',
        soapPlan: selectedAppointment.soapPlan || '',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        {/* Header Skeleton */}
        <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="h-8 w-64 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-auto bg-neutral-50 p-6 dark:bg-neutral-900">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <button
            onClick={() => router.back()}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            ← Back
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900">
          <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950">
            <div className="text-4xl">⚠️</div>
            <p className="mt-3 text-sm font-medium text-red-900 dark:text-red-100">
              Patient not found
            </p>
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : 'Unable to load patient details'}
            </p>
            <button
              onClick={() => router.push('/patients')}
              className="mt-4 h-8 rounded-lg bg-red-900 px-4 text-[11px] font-medium text-white hover:bg-red-800"
            >
              Return to Patients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3">
          <button
            onClick={() => router.back()}
            className="text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            ← Back to Patients
          </button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {patient.firstName} {patient.middleName && `${patient.middleName} `}
                {patient.lastName}
              </h1>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                MRN: {patient.mrn || 'N/A'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Patient record and medical information
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="h-8 rounded-lg border border-red-300 bg-red-50 px-4 text-[11px] font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
            >
              Delete
            </button>
            <button
              onClick={() => setShowEditDialog(true)}
              className="h-8 rounded-lg border border-neutral-300 px-4 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Edit
            </button>
            <button
              onClick={() => setShowAppointmentDialog(true)}
              className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              New Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-neutral-50 p-6 dark:bg-neutral-900">
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Demographics */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Demographics
            </h2>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Date of Birth
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {patient.dob ? formatDate(patient.dob) : 'Not provided'}
                </div>
                {patient.dob && (
                  <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    {patient.age} years old
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Gender
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {patient.gender || 'Not specified'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  MRN
                </div>
                <div className="mt-1 font-mono text-sm text-neutral-900 dark:text-white">
                  {patient.mrn || 'Not assigned'}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Contact Information
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Phone
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {patient.phone || 'Not provided'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Email
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {patient.email || 'Not provided'}
                </div>
              </div>

              <div className="col-span-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Address
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {patient.address || 'Not provided'}
                </div>
              </div>
            </div>
          </div>

          {/* Record Information */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Record Information
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Created
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {formatDateTime(patient.createdAt)}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Last Updated
                </div>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {formatDateTime(patient.updatedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Quick Actions
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <button className="flex h-20 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-center transition-all hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800">
                <div className="text-xl">📅</div>
                <div className="mt-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                  Schedule Appointment
                </div>
              </button>

              <button className="flex h-20 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-center transition-all hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800">
                <div className="text-xl">🧪</div>
                <div className="mt-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                  Order Lab Test
                </div>
              </button>

              <button className="flex h-20 flex-col items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-center transition-all hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800">
                <div className="text-xl">💳</div>
                <div className="mt-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                  Create Invoice
                </div>
              </button>
            </div>
          </div>

          {/* Version History */}
          <VersionHistory patientId={patientId} />

          {/* Appointment History */}
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">
              Appointment History
            </h2>

            {appointments.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-4xl">📅</div>
                <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
                  No appointments yet
                </p>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                  Patient appointment history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => {
                  const colors = getStatusColor(appointment.status);
                  return (
                    <div
                      key={appointment.id}
                      className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                              {formatDate(appointment.startsAt)}
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}
                            >
                              {appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                            {formatTime(appointment.startsAt)} - {formatTime(appointment.endsAt)}
                          </div>
                          {appointment.provider && (
                            <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                              Provider: {appointment.provider.name || appointment.provider.email}
                            </div>
                          )}
                          {appointment.services && appointment.services.length > 0 && (
                            <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                              {appointment.services.length} service
                              {appointment.services.length !== 1 ? 's' : ''}
                              {appointment.totalPrice !== undefined &&
                                appointment.totalPrice > 0 && (
                                  <span className="ml-2 font-medium text-green-700 dark:text-green-400">
                                    ₱{appointment.totalPrice.toFixed(2)}
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedAppointment(appointment)}
                          className="ml-4 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Placeholder for future sections */}
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
            <div className="text-4xl">📋</div>
            <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-white">
              More Features Coming Soon
            </p>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              Lab results and billing history will appear here
            </p>
          </div>
        </div>
      </div>

      {/* Edit Patient Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Edit Patient
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Update patient information
                </p>
              </div>
              <button
                onClick={() => setShowEditDialog(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PatientForm
                mode="edit"
                patientId={patientId}
                initialData={{
                  firstName: patient.firstName,
                  lastName: patient.lastName,
                  middleName: patient.middleName || '',
                  mrn: patient.mrn || '',
                  dob: patient.dob || '',
                  gender: patient.gender as 'male' | 'female' | 'other' | undefined,
                  email: patient.email || '',
                  phone: patient.phone || '',
                  addressLine1: patient.address || '',
                  addressLine2: '',
                }}
                onSuccess={() => {
                  setShowEditDialog(false);
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Delete Patient
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                This action can be undone by contacting support
              </p>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Are you sure you want to delete{' '}
                <strong>
                  {patient.firstName} {patient.lastName}
                </strong>
                ?
              </p>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                This will soft delete the patient record. The data will be hidden but not
                permanently removed from the database.
              </p>
            </div>

            <div className="flex gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletePatientMutation.isPending}
                className="flex-1 h-9 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePatientMutation.mutate()}
                disabled={deletePatientMutation.isPending}
                className="flex-1 h-9 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletePatientMutation.isPending ? 'Deleting...' : 'Delete Patient'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Dialog */}
      {showAppointmentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  New Appointment
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Schedule an appointment for {patient.firstName} {patient.lastName}
                </p>
              </div>
              <button
                onClick={() => setShowAppointmentDialog(false)}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <AppointmentForm
                preSelectedPatient={{
                  id: patient.id,
                  firstName: patient.firstName,
                  lastName: patient.lastName,
                  middleName: patient.middleName,
                  mrn: patient.mrn,
                }}
                onSuccess={() => {
                  setShowAppointmentDialog(false);
                  router.push('/appointments');
                }}
                onCancel={() => {
                  setShowAppointmentDialog(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Appointment Details Dialog */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Appointment Details
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {formatDate(selectedAppointment.startsAt)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAppointment(null);
                  setIsEditingSOAP(false);
                }}
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Status
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getStatusColor(selectedAppointment.status).badge}`}
                  >
                    {selectedAppointment.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Start Time
                  </div>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {formatTime(selectedAppointment.startsAt)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    End Time
                  </div>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {formatTime(selectedAppointment.endsAt)}
                  </div>
                </div>
              </div>

              {/* Provider */}
              {selectedAppointment.provider && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Provider
                  </div>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {selectedAppointment.provider.name || selectedAppointment.provider.email}
                  </div>
                </div>
              )}

              {/* Services */}
              {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Services & Procedures
                  </div>
                  <div className="mt-2 space-y-3">
                    {selectedAppointment.services.map((service, idx) => (
                      <div
                        key={service.id}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                              {service.itemName}
                              {service.variantName && ` - ${service.variantName}`}
                            </div>
                            <div className="mt-0.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                              Base Price: ₱{service.basePrice.toFixed(2)}
                            </div>
                            {service.modifiers && service.modifiers.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                                  Modifiers ({service.modifiers.length})
                                </div>
                                {service.modifiers.map((modifier) => (
                                  <div
                                    key={modifier.id}
                                    className="flex items-center justify-between text-[11px]"
                                  >
                                    <span className="text-neutral-700 dark:text-neutral-300">
                                      {modifier.modifierName}: {modifier.optionName}
                                    </span>
                                    <span className="font-medium text-neutral-900 dark:text-white">
                                      ₱{modifier.price.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Price */}
              {selectedAppointment.totalPrice !== undefined &&
                selectedAppointment.totalPrice > 0 && (
                  <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                        Total Cost
                      </div>
                      <div className="text-xl font-bold text-green-700 dark:text-green-400">
                        ₱{selectedAppointment.totalPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

              {/* Reason */}
              {selectedAppointment.reason && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Reason for Visit
                  </div>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {selectedAppointment.reason}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Notes
                  </div>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}

              {/* SOAP Notes Section */}
              <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      SOAP Notes
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Structured clinical documentation
                    </p>
                  </div>
                  {!isEditingSOAP && (
                    <button
                      onClick={handleEditSOAP}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
                    >
                      {selectedAppointment.soapSubjective ||
                      selectedAppointment.soapObjective ||
                      selectedAppointment.soapAssessment ||
                      selectedAppointment.soapPlan
                        ? 'Edit SOAP'
                        : 'Add SOAP'}
                    </button>
                  )}
                </div>

                {isEditingSOAP ? (
                  <div className="space-y-4">
                    {/* Subjective */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        S - Subjective
                        <span className="ml-2 font-normal text-neutral-500">
                          What the patient says
                        </span>
                      </label>
                      <textarea
                        value={soapData.soapSubjective}
                        onChange={(e) =>
                          setSOAPData({ ...soapData, soapSubjective: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white resize-none"
                        placeholder="Chief complaint, symptoms, duration, severity..."
                      />
                    </div>

                    {/* Objective */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        O - Objective
                        <span className="ml-2 font-normal text-neutral-500">
                          What is observed or measured
                        </span>
                      </label>
                      <textarea
                        value={soapData.soapObjective}
                        onChange={(e) =>
                          setSOAPData({ ...soapData, soapObjective: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white resize-none"
                        placeholder="Vital signs, exam findings, lab results..."
                      />
                    </div>

                    {/* Assessment */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        A - Assessment
                        <span className="ml-2 font-normal text-neutral-500">
                          Clinical judgment and diagnosis
                        </span>
                      </label>
                      <textarea
                        value={soapData.soapAssessment}
                        onChange={(e) =>
                          setSOAPData({ ...soapData, soapAssessment: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white resize-none"
                        placeholder="Primary diagnosis, differential diagnoses..."
                      />
                    </div>

                    {/* Plan */}
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        P - Plan
                        <span className="ml-2 font-normal text-neutral-500">
                          Treatment plan and follow-up
                        </span>
                      </label>
                      <textarea
                        value={soapData.soapPlan}
                        onChange={(e) => setSOAPData({ ...soapData, soapPlan: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white resize-none"
                        placeholder="Medications, tests to order, referrals, follow-up..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelSOAP}
                        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSOAP}
                        disabled={updateSOAPMutation.isPending}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {updateSOAPMutation.isPending ? 'Saving...' : 'Save SOAP Notes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAppointment.soapSubjective && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          S - Subjective
                        </div>
                        <div className="mt-1 text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                          {selectedAppointment.soapSubjective}
                        </div>
                      </div>
                    )}
                    {selectedAppointment.soapObjective && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          O - Objective
                        </div>
                        <div className="mt-1 text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                          {selectedAppointment.soapObjective}
                        </div>
                      </div>
                    )}
                    {selectedAppointment.soapAssessment && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          A - Assessment
                        </div>
                        <div className="mt-1 text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                          {selectedAppointment.soapAssessment}
                        </div>
                      </div>
                    )}
                    {selectedAppointment.soapPlan && (
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          P - Plan
                        </div>
                        <div className="mt-1 text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                          {selectedAppointment.soapPlan}
                        </div>
                      </div>
                    )}
                    {!selectedAppointment.soapSubjective &&
                      !selectedAppointment.soapObjective &&
                      !selectedAppointment.soapAssessment &&
                      !selectedAppointment.soapPlan && (
                        <div className="rounded-lg bg-neutral-100 p-4 text-center dark:bg-neutral-800">
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            No SOAP notes recorded for this appointment
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
