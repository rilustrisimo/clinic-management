'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  mrn: string | null;
}

interface LoyverseItem {
  id: string;
  item_name: string;
  variants: Array<{
    variant_id: string;
    variant_name: string;
    price: number;
  }>;
  modifiers_info?: Array<{
    id: string;
    name: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
    }>;
  }>;
}

interface SelectedService {
  itemId: string;
  variantId: string;
  itemName: string;
  variantName: string;
  basePrice: number;
  modifiers: Record<string, string>; // modifierId -> optionId
}

interface AppointmentFormData {
  patientId: string;
  providerId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  notes: string;
  // SOAP Notes
  soapSubjective: string;
  soapObjective: string;
  soapAssessment: string;
  soapPlan: string;
}

interface AppointmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultDate?: string;
  defaultTime?: string;
  preSelectedPatient?: Patient;
  editMode?: boolean;
  appointmentId?: string;
  initialData?: {
    providerId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    notes?: string;
    services?: SelectedService[];
    // SOAP Notes
    soapSubjective?: string;
    soapObjective?: string;
    soapAssessment?: string;
    soapPlan?: string;
  };
}

async function searchPatients(query: string): Promise<{ patients: Patient[] }> {
  const response = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`);
  if (!response.ok) throw new Error('Failed to search patients');
  return response.json();
}

async function fetchProviders(): Promise<{ id: string; email: string; name?: string | null }[]> {
  const response = await fetch('/api/providers');
  if (!response.ok) throw new Error('Failed to fetch providers');
  const data = await response.json();
  return data.providers || [];
}

async function fetchLoyverseItems(): Promise<{ items: LoyverseItem[] }> {
  const response = await fetch('/api/loyverse/items');
  if (!response.ok) throw new Error('Failed to fetch Loyverse items');
  return response.json();
}

async function createAppointment(data: any) {
  console.log('[createAppointment] Before stringify:', data);
  console.log('[createAppointment] start type:', typeof data.start, data.start);
  console.log('[createAppointment] end type:', typeof data.end, data.end);

  const stringified = JSON.stringify(data);
  console.log('[createAppointment] After stringify:', stringified);

  const response = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: stringified,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create appointment');
  }

  return response.json();
}

async function updateAppointment(id: string, data: any) {
  const response = await fetch(`/api/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update appointment');
  }

  return response.json();
}

export function AppointmentForm({
  onSuccess,
  onCancel,
  defaultDate,
  defaultTime,
  preSelectedPatient,
  editMode,
  appointmentId,
  initialData,
}: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState(
    preSelectedPatient
      ? `${preSelectedPatient.firstName} ${preSelectedPatient.lastName}${preSelectedPatient.mrn ? ` (${preSelectedPatient.mrn})` : ''}`
      : '',
  );
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    preSelectedPatient || null,
  );
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Multiple services state
  const [services, setServices] = useState<SelectedService[]>(initialData?.services || []);
  const [currentItemId, setCurrentItemId] = useState('');
  const [currentVariantId, setCurrentVariantId] = useState('');
  const [currentModifiers, setCurrentModifiers] = useState<Record<string, string>>({});
  const [selectedItem, setSelectedItem] = useState<LoyverseItem | null>(null);

  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().slice(0, 5); // Format: HH:MM
  };

  const addOneHour = (time: string) => {
    const [hours, minutes] = time.split(':');
    const newHour = (parseInt(hours) + 1) % 24;
    return `${String(newHour).padStart(2, '0')}:${minutes}`;
  };

  const currentTime = defaultTime || getCurrentTime();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AppointmentFormData>({
    defaultValues: {
      date: initialData?.date || defaultDate || new Date().toISOString().split('T')[0],
      startTime: initialData?.startTime || currentTime,
      endTime: initialData?.endTime || addOneHour(currentTime),
      providerId: initialData?.providerId || '',
      reason: initialData?.reason || '',
      notes: initialData?.notes || '',
      // SOAP Notes
      soapSubjective: initialData?.soapSubjective || '',
      soapObjective: initialData?.soapObjective || '',
      soapAssessment: initialData?.soapAssessment || '',
      soapPlan: initialData?.soapPlan || '',
    },
  });

  const startTime = watch('startTime');

  // Auto-adjust end time when start time changes
  useEffect(() => {
    if (startTime) {
      const newEndTime = addOneHour(startTime);
      setValue('endTime', newEndTime);
    }
  }, [startTime, setValue]);

  // Search patients query
  const { data: searchResults } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => searchPatients(patientSearch),
    enabled: patientSearch.length >= 2,
  });

  // Fetch providers query
  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: fetchProviders,
  });

  // Fetch Loyverse items query
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['loyverse-items'],
    queryFn: fetchLoyverseItems,
  });

  const items = itemsData?.items || [];

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn:
      editMode && appointmentId
        ? (data: any) => updateAppointment(appointmentId, data)
        : createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.();
    },
  });

  // Add service to list
  const addService = () => {
    if (!currentItemId || !currentVariantId) {
      alert('Please select a service and variant');
      return;
    }

    const item = items.find((i) => i.id === currentItemId);
    if (!item) return;

    const variant = item.variants.find((v) => v.variant_id === currentVariantId);
    if (!variant) return;

    const newService: SelectedService = {
      itemId: currentItemId,
      variantId: currentVariantId,
      itemName: item.item_name,
      variantName: variant.variant_name,
      basePrice: variant.price || 0,
      modifiers: { ...currentModifiers },
    };

    setServices([...services, newService]);

    // Reset current service form
    setCurrentItemId('');
    setCurrentVariantId('');
    setCurrentModifiers({});
    setSelectedItem(null);
  };

  // Remove service from list
  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const onSubmit = (data: AppointmentFormData) => {
    if (!selectedPatient && !editMode) {
      alert('Please select a patient');
      return;
    }

    // Auto-add current service if it's being built but not yet added
    let finalServices = [...services];
    if (currentItemId && currentVariantId && selectedItem) {
      const variant = selectedItem.variants.find((v) => v.variant_id === currentVariantId);
      if (variant) {
        finalServices.push({
          itemId: currentItemId,
          variantId: currentVariantId,
          itemName: selectedItem.item_name,
          variantName: variant.variant_name,
          basePrice: variant.price || 0,
          modifiers: { ...currentModifiers },
        });
      }
    }

    if (finalServices.length === 0) {
      alert('Please add at least one service');
      return;
    }

    // Combine date and time into ISO strings
    const start = `${data.date}T${data.startTime}:00`;
    const end = `${data.date}T${data.endTime}:00`;

    // Calculate total price across all services
    const totalPrice = finalServices.reduce((total, service) => {
      const item = items.find((i) => i.id === service.itemId);
      const modifiersPrice = Object.entries(service.modifiers).reduce((sum, [modId, optId]) => {
        const modifier = item?.modifiers_info?.find((m) => m.id === modId);
        const option = modifier?.options.find((o) => o.id === optId);
        return sum + (option?.price || 0);
      }, 0);
      return total + service.basePrice + modifiersPrice;
    }, 0);

    // Prepare services data with modifier details
    const servicesData = finalServices.map((service) => {
      const item = items.find((i) => i.id === service.itemId);
      return {
        itemId: service.itemId,
        variantId: service.variantId,
        itemName: service.itemName,
        variantName: service.variantName,
        basePrice: service.basePrice,
        modifiers: Object.entries(service.modifiers).map(([modifierId, optionId]) => {
          const modifier = item?.modifiers_info?.find((m) => m.id === modifierId);
          const option = modifier?.options.find((o) => o.id === optionId);
          return {
            modifierId,
            optionId,
            modifierName: modifier?.name,
            optionName: option?.name,
            price: option?.price || 0,
          };
        }),
      };
    });

    if (editMode) {
      createMutation.mutate({
        providerId: data.providerId || null,
        start,
        end,
        services: servicesData,
        totalPrice,
        reason: data.reason || null,
        notes: data.notes || null,
        // SOAP Notes
        soapSubjective: data.soapSubjective || null,
        soapObjective: data.soapObjective || null,
        soapAssessment: data.soapAssessment || null,
        soapPlan: data.soapPlan || null,
      });
    } else {
      createMutation.mutate({
        patientId: selectedPatient!.id,
        providerId: data.providerId || null,
        start,
        end,
        services: servicesData,
        totalPrice,
        reason: data.reason || null,
        notes: data.notes || null,
        // SOAP Notes
        soapSubjective: data.soapSubjective || null,
        soapObjective: data.soapObjective || null,
        soapAssessment: data.soapAssessment || null,
        soapPlan: data.soapPlan || null,
      });
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setValue('patientId', patient.id);
    setPatientSearch(
      `${patient.firstName} ${patient.lastName}${patient.mrn ? ` (${patient.mrn})` : ''}`,
    );
    setShowPatientDropdown(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Patient Selection */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Patient *
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            value={patientSearch}
            onChange={(e) => {
              setPatientSearch(e.target.value);
              setShowPatientDropdown(true);
              if (selectedPatient) setSelectedPatient(null);
            }}
            onFocus={() => setShowPatientDropdown(true)}
            placeholder="Search by name or MRN..."
            disabled={!!preSelectedPatient}
            className="h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500 dark:disabled:bg-neutral-800"
          />

          {showPatientDropdown && searchResults && searchResults.patients.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {searchResults.patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">
                      {patient.firstName} {patient.middleName && `${patient.middleName} `}
                      {patient.lastName}
                    </div>
                    {patient.mrn && (
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        MRN: {patient.mrn}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedPatient && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-950">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-900 dark:text-green-100">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </div>
                  {selectedPatient.mrn && (
                    <div className="text-[10px] text-green-700 dark:text-green-300">
                      MRN: {selectedPatient.mrn}
                    </div>
                  )}
                </div>
                {!preSelectedPatient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientSearch('');
                    }}
                    className="text-[11px] text-green-700 hover:text-green-800 dark:text-green-300"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Date *
        </label>
        <input
          type="date"
          {...register('date', { required: 'Date is required' })}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        {errors.date && (
          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{errors.date.message}</p>
        )}
      </div>

      {/* Time Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            Start Time *
          </label>
          <input
            type="time"
            {...register('startTime', { required: 'Start time is required' })}
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          {errors.startTime && (
            <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
              {errors.startTime.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            End Time *
          </label>
          <input
            type="time"
            {...register('endTime', { required: 'End time is required' })}
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
          {errors.endTime && (
            <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">
              {errors.endTime.message}
            </p>
          )}
        </div>
      </div>

      {/* Provider */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Provider / Doctor
        </label>
        <select
          {...register('providerId')}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        >
          <option value="">Not assigned</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name || provider.email}
            </option>
          ))}
        </select>
      </div>

      {/* Added Services List */}
      {services.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/50">
          <div className="mb-2 text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            Added Services ({services.length})
          </div>
          <div className="space-y-2">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">
                    {service.itemName} {service.variantName && `- ${service.variantName}`}
                  </div>
                  <div className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                    Base: ₱{service.basePrice.toFixed(2)}
                    {Object.keys(service.modifiers).length > 0 && (
                      <span className="ml-2">
                        • {Object.keys(service.modifiers).length} modifier(s)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="ml-2 text-[11px] text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-2 dark:border-green-900 dark:bg-green-950">
            <div className="text-[11px] font-medium text-green-900 dark:text-green-100">
              Total for All Services
            </div>
            <div className="text-sm font-semibold text-green-900 dark:text-green-100">
              ₱
              {services
                .reduce((total, service) => {
                  const modifiersPrice = Object.values(service.modifiers).reduce(
                    (sum, optionId) => {
                      const item = items.find((i) => i.id === service.itemId);
                      const modifier = item?.modifiers_info?.find((m) =>
                        m.options.some((o) => o.id === optionId),
                      );
                      const option = modifier?.options.find((o) => o.id === optionId);
                      return sum + (option?.price || 0);
                    },
                    0,
                  );
                  return total + service.basePrice + modifiersPrice;
                }, 0)
                .toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Service/Item Selection */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          {services.length > 0 ? 'Add Another Service / Procedure' : 'Service / Procedure *'}
        </label>
        {itemsLoading ? (
          <div className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
            Loading services...
          </div>
        ) : (
          <select
            value={currentItemId}
            onChange={(e) => {
              const itemId = e.target.value;
              setCurrentItemId(itemId);
              const item = items.find((i) => i.id === itemId);
              console.log('[AppointmentForm] Selected item:', item);
              console.log('[AppointmentForm] Item modifiers:', item?.modifiers_info);
              setSelectedItem(item || null);
              setCurrentModifiers({});
              // Auto-select first variant if only one exists
              if (item && item.variants.length === 1) {
                setCurrentVariantId(item.variants[0].variant_id);
              } else {
                setCurrentVariantId('');
              }
            }}
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Select a service...</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Variant Selection (if item has multiple variants) */}
      {selectedItem && selectedItem.variants.length > 1 && (
        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            Variant / Type *
          </label>
          <select
            value={currentVariantId}
            onChange={(e) => setCurrentVariantId(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Select variant...</option>
            {selectedItem.variants.map((variant) => (
              <option key={variant.variant_id} value={variant.variant_id}>
                {variant.variant_name} - ₱{(variant.price || 0).toFixed(2)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Price Display */}
      {selectedItem &&
        currentVariantId &&
        (() => {
          const variant = selectedItem.variants.find((v) => v.variant_id === currentVariantId);
          return variant ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <div className="text-[11px] font-medium text-blue-900 dark:text-blue-100">
                Base Price
              </div>
              <div className="mt-1 text-lg font-semibold text-blue-900 dark:text-blue-100">
                ₱{(variant.price || 0).toFixed(2)}
              </div>
            </div>
          ) : null;
        })()}

      {/* Modifiers */}
      {selectedItem && currentVariantId && (
        <div className="space-y-3">
          <div className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
            Available Add-ons / Modifiers
          </div>
          {selectedItem.modifiers_info && selectedItem.modifiers_info.length > 0 ? (
            selectedItem.modifiers_info.map((modifier) => (
              <div
                key={modifier.id}
                className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
              >
                <div className="mb-2 text-sm font-medium text-neutral-900 dark:text-white">
                  {modifier.name}
                </div>
                <div className="space-y-2">
                  {modifier.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 p-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`modifier-${modifier.id}`}
                          checked={currentModifiers[modifier.id] === option.id}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCurrentModifiers((prev) => ({
                                ...prev,
                                [modifier.id]: option.id,
                              }));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-neutral-900 dark:text-white">
                          {option.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {(option.price || 0) > 0 ? `+₱${(option.price || 0).toFixed(2)}` : 'Free'}
                      </span>
                    </label>
                  ))}
                  {/* Option to deselect */}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-neutral-200 p-2 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`modifier-${modifier.id}`}
                        checked={!currentModifiers[modifier.id]}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCurrentModifiers((prev) => {
                              const updated = { ...prev };
                              delete updated[modifier.id];
                              return updated;
                            });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">None</span>
                    </div>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/50">
              <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                <div className="mb-1">📝 No modifiers available for this service</div>
                <div className="text-[10px]">
                  To add modifiers: Go to Loyverse → Items → Select &quot;{selectedItem?.item_name}
                  &quot; → Add Modifiers
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Total Price for Current Service */}
      {selectedItem && currentVariantId && (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-green-900 dark:text-green-100">
                Total Price for This Service
              </div>
              <div className="text-xl font-semibold text-green-900 dark:text-green-100">
                ₱
                {(() => {
                  const basePrice =
                    selectedItem.variants.find((v) => v.variant_id === currentVariantId)?.price ||
                    0;
                  const modifiersPrice = Object.values(currentModifiers).reduce((sum, optionId) => {
                    const modifier = selectedItem.modifiers_info?.find((m) =>
                      m.options.some((o) => o.id === optionId),
                    );
                    const option = modifier?.options.find((o) => o.id === optionId);
                    return sum + (option?.price || 0);
                  }, 0);
                  return (basePrice + modifiersPrice).toFixed(2);
                })()}
              </div>
            </div>
          </div>

          {/* Add Service Button */}
          <button
            type="button"
            onClick={addService}
            className="w-full h-9 rounded-lg bg-blue-600 px-4 text-[11px] font-medium text-white hover:bg-blue-700"
          >
            {services.length > 0 ? 'Add Another Service' : 'Add Service'}
          </button>
        </div>
      )}

      {/* Reason */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Reason for Visit
        </label>
        <input
          type="text"
          {...register('reason')}
          placeholder="e.g., Annual checkup, Follow-up from previous visit..."
          className="mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
          Notes (Optional)
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Additional notes or special instructions..."
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
        />
      </div>

      {/* SOAP Notes Section */}
      <div className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              SOAP Notes (Optional)
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Structured clinical documentation for this appointment
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            S - Subjective
            <span className="ml-2 text-[10px] font-normal text-neutral-500">
              What the patient says
            </span>
          </label>
          <textarea
            {...register('soapSubjective')}
            rows={3}
            placeholder='Chief complaint, symptoms, history (e.g., "Patient reports sharp chest pain for 2 days...")'
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            O - Objective
            <span className="ml-2 text-[10px] font-normal text-neutral-500">
              What is observed or measured
            </span>
          </label>
          <textarea
            {...register('soapObjective')}
            rows={3}
            placeholder="Vitals, exam findings (e.g., BP 140/90 mmHg, Temp 38.2C, HR 88 bpm...)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            A - Assessment
            <span className="ml-2 text-[10px] font-normal text-neutral-500">
              Clinical judgment and diagnosis
            </span>
          </label>
          <textarea
            {...register('soapAssessment')}
            rows={3}
            placeholder="Diagnosis (e.g., Acute gastroenteritis, likely viral etiology...)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            P - Plan
            <span className="ml-2 text-[10px] font-normal text-neutral-500">
              Treatment plan and follow-up
            </span>
          </label>
          <textarea
            {...register('soapPlan')}
            rows={3}
            placeholder="Treatment plan (e.g., Start Amoxicillin 500mg TID x 7 days. Follow-up in 1 week...)"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Error Display */}
      {createMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-[11px] font-medium text-red-900 dark:text-red-100">
                Failed to create appointment
              </p>
              <p className="mt-0.5 text-[10px] text-red-700 dark:text-red-300">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'An error occurred'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg border border-neutral-300 px-4 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={
            createMutation.isPending ||
            (!editMode && !selectedPatient) ||
            (services.length === 0 && !currentItemId)
          }
          className="h-9 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
        >
          {createMutation.isPending
            ? editMode
              ? 'Updating...'
              : 'Creating...'
            : editMode
              ? 'Update Appointment'
              : 'Create Appointment'}
        </button>
      </div>
    </form>
  );
}
