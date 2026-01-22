'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SoapNotesFormProps {
  appointmentId: string;
  initialData?: {
    soapSubjective?: string | null;
    soapObjective?: string | null;
    soapAssessment?: string | null;
    soapPlan?: string | null;
  };
  onSave?: () => void;
  readOnly?: boolean;
}

export function SoapNotesForm({
  appointmentId,
  initialData,
  onSave,
  readOnly = false,
}: SoapNotesFormProps) {
  const queryClient = useQueryClient();
  const [soapSubjective, setSoapSubjective] = useState(initialData?.soapSubjective || '');
  const [soapObjective, setSoapObjective] = useState(initialData?.soapObjective || '');
  const [soapAssessment, setSoapAssessment] = useState(initialData?.soapAssessment || '');
  const [soapPlan, setSoapPlan] = useState(initialData?.soapPlan || '');
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when initialData changes
  useEffect(() => {
    setSoapSubjective(initialData?.soapSubjective || '');
    setSoapObjective(initialData?.soapObjective || '');
    setSoapAssessment(initialData?.soapAssessment || '');
    setSoapPlan(initialData?.soapPlan || '');
    setHasChanges(false);
  }, [initialData]);

  // Track changes
  useEffect(() => {
    const changed =
      soapSubjective !== (initialData?.soapSubjective || '') ||
      soapObjective !== (initialData?.soapObjective || '') ||
      soapAssessment !== (initialData?.soapAssessment || '') ||
      soapPlan !== (initialData?.soapPlan || '');
    setHasChanges(changed);
  }, [soapSubjective, soapObjective, soapAssessment, soapPlan, initialData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soapSubjective: soapSubjective || null,
          soapObjective: soapObjective || null,
          soapAssessment: soapAssessment || null,
          soapPlan: soapPlan || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save SOAP notes');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      setHasChanges(false);
      onSave?.();
    },
  });

  if (readOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">SOAP Notes</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Clinical documentation for this appointment
            </p>
          </div>
        </div>

        {soapSubjective && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              S - Subjective
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
              {soapSubjective}
            </p>
          </div>
        )}

        {soapObjective && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              O - Objective
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
              {soapObjective}
            </p>
          </div>
        )}

        {soapAssessment && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              A - Assessment
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
              {soapAssessment}
            </p>
          </div>
        )}

        {soapPlan && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              P - Plan
            </h4>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-3">
              {soapPlan}
            </p>
          </div>
        )}

        {!soapSubjective && !soapObjective && !soapAssessment && !soapPlan && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
            No SOAP notes recorded for this appointment
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
        <span className="text-xl">📋</span>
        <div>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">SOAP Notes</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Structured clinical documentation for this appointment
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="soapSubjective"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          S - Subjective
          <span className="ml-2 text-xs font-normal text-neutral-500">What the patient says</span>
        </label>
        <textarea
          id="soapSubjective"
          value={soapSubjective}
          onChange={(e) => setSoapSubjective(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          placeholder='Chief complaint, symptoms, history (e.g., "Patient reports sharp chest pain for 2 days...")'
        />
        <p className="mt-1 text-xs text-neutral-500">
          Chief complaint, symptoms, duration, severity, patient&apos;s own words
        </p>
      </div>

      <div>
        <label
          htmlFor="soapObjective"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          O - Objective
          <span className="ml-2 text-xs font-normal text-neutral-500">
            What is observed or measured
          </span>
        </label>
        <textarea
          id="soapObjective"
          value={soapObjective}
          onChange={(e) => setSoapObjective(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          placeholder="Vitals, exam findings (e.g., BP 140/90 mmHg, Temp 38.2C, HR 88 bpm...)"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Vital signs, physical exam findings, lab results, imaging results
        </p>
      </div>

      <div>
        <label
          htmlFor="soapAssessment"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          A - Assessment
          <span className="ml-2 text-xs font-normal text-neutral-500">
            Clinical judgment and diagnosis
          </span>
        </label>
        <textarea
          id="soapAssessment"
          value={soapAssessment}
          onChange={(e) => setSoapAssessment(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          placeholder="Diagnosis (e.g., Acute gastroenteritis, likely viral etiology...)"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Primary diagnosis, differential diagnoses, problem list
        </p>
      </div>

      <div>
        <label
          htmlFor="soapPlan"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          P - Plan
          <span className="ml-2 text-xs font-normal text-neutral-500">
            Treatment plan and follow-up
          </span>
        </label>
        <textarea
          id="soapPlan"
          value={soapPlan}
          onChange={(e) => setSoapPlan(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          placeholder="Treatment plan (e.g., Start Amoxicillin 500mg TID x 7 days. Follow-up in 1 week...)"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Medications, tests to order, referrals, patient education, follow-up
        </p>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div>
          {hasChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
          )}
          {saveMutation.isError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {(saveMutation.error as Error).message}
            </span>
          )}
        </div>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save SOAP Notes'}
        </button>
      </div>
    </div>
  );
}
