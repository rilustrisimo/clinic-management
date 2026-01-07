"use client";

import { useRouter } from "next/navigation";
import { PatientForm } from "../../../components/patients/patient-form";

export default function NewPatientPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Add New Patient</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create a new patient record in the system
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-200 p-6">
          <PatientForm
            mode="create"
            onSuccess={() => {
              router.push("/patients");
            }}
            onCancel={() => {
              router.back();
            }}
          />
        </div>
      </div>
    </div>
  );
}
