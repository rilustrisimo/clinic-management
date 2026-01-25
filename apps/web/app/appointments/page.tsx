'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppointmentForm } from '../../components/appointments/appointment-form';

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
  subtotal?: number;
  discountId?: string | null;
  discountName?: string | null;
  discountType?: 'FIXED_PERCENT' | 'FIXED_AMOUNT' | null;
  discountValue?: number | null;
  discountAmount?: number | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string | null;
    mrn: string | null;
  };
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

async function fetchAppointments(
  date: string,
  view: string,
): Promise<{ appointments: Appointment[] }> {
  const response = await fetch(`/api/appointments?date=${date}&view=${view}`);
  if (!response.ok) throw new Error('Failed to fetch appointments');
  return response.json();
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

export default function AppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [showNewAppointmentDialog, setShowNewAppointmentDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const dateStr = currentDate.toISOString().split('T')[0];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['appointments', dateStr, view],
    queryFn: () => fetchAppointments(dateStr, view),
  });

  const appointments = data?.appointments || [];

  console.log('[Appointments Page] Data:', data);
  console.log('[Appointments Page] Appointments count:', appointments.length);
  console.log('[Appointments Page] First appointment:', appointments[0]);

  const todayStr = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(currentDate.getDate() - 1);
    else if (view === 'week') newDate.setDate(currentDate.getDate() - 7);
    else newDate.setMonth(currentDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(currentDate.getDate() + 1);
    else if (view === 'week') newDate.setDate(currentDate.getDate() + 7);
    else newDate.setMonth(currentDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Helper function to get local date string (YYYY-MM-DD) from a Date object
  const getLocalDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate time slots for day view (12 AM - 11 PM, full day)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    return `${i.toString().padStart(2, '0')}:00`;
  });

  // Group appointments by hour for day view
  const appointmentsByHour: Record<string, Appointment[]> = {};
  appointments.forEach((appt) => {
    const hour = new Date(appt.startsAt).getHours();
    const key = `${hour.toString().padStart(2, '0')}:00`;
    if (!appointmentsByHour[key]) appointmentsByHour[key] = [];
    appointmentsByHour[key].push(appt);
  });

  // Generate week days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  // Generate calendar for month view
  const getMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks: Date[][] = [];
    const current = new Date(startDate);

    while (current <= lastDay || weeks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
      if (current > lastDay && weeks.length >= 5) break;
    }

    return weeks;
  };

  const weekDays = getWeekDays();
  const monthCalendar = getMonthCalendar();

  // Group appointments by date for week/month views
  const appointmentsByDate: Record<string, Appointment[]> = {};
  appointments.forEach((appt) => {
    const apptDate = new Date(appt.startsAt);
    const date = getLocalDateStr(apptDate);
    if (!appointmentsByDate[date]) appointmentsByDate[date] = [];
    appointmentsByDate[date].push(appt);
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Appointments</h1>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{todayStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="h-8 rounded-lg border border-neutral-300 bg-white px-4 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Today
            </button>
            <button
              onClick={() => setShowNewAppointmentDialog(true)}
              className="h-8 rounded-lg bg-neutral-900 px-4 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
            >
              + New Appointment
            </button>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-7 rounded-lg px-3 text-[11px] font-medium capitalize ${
                  view === v
                    ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/10 dark:bg-neutral-900 dark:text-white dark:ring-white/10'
                    : 'text-neutral-600 hover:bg-white dark:text-neutral-400 dark:hover:bg-neutral-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="h-7 w-7 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              ←
            </button>
            <button
              onClick={goToNext}
              className="h-7 w-7 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Calendar/Schedule View */}
      <div className="flex-1 overflow-auto bg-white p-6 dark:bg-neutral-900">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-neutral-500">Loading appointments...</div>
          </div>
        ) : view === 'day' ? (
          appointments.length === 0 ? (
            // No appointments message
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                No appointments on this day
              </h3>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <button
                onClick={() => setShowNewAppointmentDialog(true)}
                className="mt-6 rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              >
                Schedule an Appointment
              </button>
            </div>
          ) : (
            // Timeline with appointments
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-[80px_1fr] gap-4">
                <div className="text-right text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Time
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Appointments
                </div>
              </div>

              {/* Only show time slots that have appointments */}
              {Object.keys(appointmentsByHour)
                .sort()
                .map((timeSlot) => {
                  const hour = parseInt(timeSlot.split(':')[0]);
                  const displayTime =
                    hour > 12
                      ? `${hour - 12}:00 PM`
                      : hour === 12
                        ? '12:00 PM'
                        : hour === 0
                          ? '12:00 AM'
                          : `${hour}:00 AM`;
                  const slotAppointments = appointmentsByHour[timeSlot] || [];

                  return (
                    <div key={timeSlot} className="grid grid-cols-[80px_1fr] gap-4">
                      <div className="pt-2 text-right text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                        {displayTime}
                      </div>
                      <div className="min-h-[60px]">
                        <div className="space-y-2">
                          {slotAppointments.map((appointment) => {
                            const colors = getStatusColor(appointment.status);
                            return (
                              <div
                                key={appointment.id}
                                className={`rounded-xl border ${colors.border} ${colors.bg} p-3`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                                        {appointment.patient.firstName}{' '}
                                        {appointment.patient.lastName}
                                      </h3>
                                      <span
                                        className={`rounded-full ${colors.badge} px-2 py-0.5 text-[10px] font-medium`}
                                      >
                                        {appointment.status}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-600 dark:text-neutral-400">
                                      <span>
                                        ⏱️ {formatTime(appointment.startsAt)} -{' '}
                                        {formatTime(appointment.endsAt)}
                                      </span>
                                      {appointment.patient.mrn && (
                                        <>
                                          <span>•</span>
                                          <span>MRN: {appointment.patient.mrn}</span>
                                        </>
                                      )}
                                    </div>
                                    {appointment.reason && (
                                      <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                        📝 {appointment.reason}
                                      </div>
                                    )}
                                    {/* Services and Total Cost */}
                                    {appointment.services && appointment.services.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                          {appointment.services.map((service, idx) => (
                                            <div
                                              key={service.id}
                                              className="flex items-center gap-1"
                                            >
                                              <span>•</span>
                                              <span>
                                                {service.itemName}
                                                {service.variantName && ` - ${service.variantName}`}
                                              </span>
                                              {service.modifiers &&
                                                service.modifiers.length > 0 && (
                                                  <span className="text-neutral-400 dark:text-neutral-500">
                                                    ({service.modifiers.length} modifier
                                                    {service.modifiers.length > 1 ? 's' : ''})
                                                  </span>
                                                )}
                                            </div>
                                          ))}
                                        </div>
                                        {appointment.totalPrice !== undefined &&
                                          appointment.totalPrice > 0 && (
                                            <div className="text-[11px]">
                                              {appointment.discountAmount &&
                                                appointment.discountAmount > 0 && (
                                                  <>
                                                    <div className="text-neutral-500 dark:text-neutral-400">
                                                      Subtotal: ₱
                                                      {(
                                                        appointment.subtotal ??
                                                        appointment.totalPrice
                                                      ).toFixed(2)}
                                                    </div>
                                                    <div className="text-green-600 dark:text-green-500">
                                                      {appointment.discountName} -₱
                                                      {appointment.discountAmount.toFixed(2)}
                                                    </div>
                                                  </>
                                                )}
                                              <div className="font-medium text-green-700 dark:text-green-400">
                                                Total: ₱{appointment.totalPrice.toFixed(2)}
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {appointment.status === 'scheduled' && (
                                      <>
                                        <button
                                          onClick={async () => {
                                            if (!confirm('Mark this appointment as completed?'))
                                              return;
                                            try {
                                              const response = await fetch(
                                                `/api/appointments/${appointment.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ status: 'completed' }),
                                                },
                                              );
                                              if (!response.ok)
                                                throw new Error('Failed to update appointment');
                                              refetch();
                                            } catch (error) {
                                              console.error('Update error:', error);
                                              alert('Failed to update appointment');
                                            }
                                          }}
                                          className="h-7 rounded-lg bg-green-600 px-3 text-[11px] font-medium text-white hover:bg-green-700"
                                        >
                                          Complete
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (!confirm('Cancel this appointment?')) return;
                                            try {
                                              const response = await fetch(
                                                `/api/appointments/${appointment.id}`,
                                                {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ status: 'cancelled' }),
                                                },
                                              );
                                              if (!response.ok)
                                                throw new Error('Failed to update appointment');
                                              refetch();
                                            } catch (error) {
                                              console.error('Update error:', error);
                                              alert('Failed to update appointment');
                                            }
                                          }}
                                          className="h-7 rounded-lg border border-neutral-300 px-3 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={() => setSelectedAppointment(appointment)}
                                      className="h-7 rounded-lg border border-neutral-300 px-3 text-[11px] font-medium text-neutral-700 hover:bg-white dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                    >
                                      View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        ) : view === 'week' ? (
          // Week View
          <div className="space-y-4">
            {/* Week Label */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {weekDays[0].toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                -{' '}
                {weekDays[6].toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
            </div>
            {/* Week Header */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                const dayAppointments = appointmentsByDate[getLocalDateStr(day)] || [];

                return (
                  <div key={idx} className="text-center">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                          : 'text-neutral-900 dark:text-white'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    {dayAppointments.length > 0 && (
                      <div className="mt-1 text-[10px] text-neutral-500">
                        {dayAppointments.length} appt{dayAppointments.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Week Appointments Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day, idx) => {
                const dateStr = getLocalDateStr(day);
                const dayAppointments = appointmentsByDate[dateStr] || [];
                const isToday = day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={idx}
                    className={`min-h-[200px] rounded-lg border p-2 ${
                      isToday
                        ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                        : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    }`}
                  >
                    <div className="space-y-1.5">
                      {dayAppointments.map((appointment) => {
                        const colors = getStatusColor(appointment.status);
                        return (
                          <button
                            key={appointment.id}
                            onClick={() => setSelectedAppointment(appointment)}
                            className={`w-full rounded-lg border ${colors.border} ${colors.bg} p-2 text-left hover:shadow-sm transition-shadow`}
                          >
                            <div className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">
                              {formatTime(appointment.startsAt)}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-neutral-900 dark:text-white truncate">
                              {appointment.patient.firstName} {appointment.patient.lastName}
                            </div>
                            {appointment.totalPrice !== undefined && appointment.totalPrice > 0 && (
                              <div className="mt-0.5 text-[10px]">
                                {appointment.discountAmount && appointment.discountAmount > 0 && (
                                  <div className="text-green-600 dark:text-green-500 truncate">
                                    {appointment.discountName}
                                  </div>
                                )}
                                <div className="font-medium text-green-700 dark:text-green-400">
                                  ₱{appointment.totalPrice.toFixed(2)}
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Month View
          <div className="space-y-4">
            {/* Month Label */}
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
            {/* Month Header */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-medium uppercase tracking-wider text-neutral-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Month Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthCalendar.flat().map((day, idx) => {
                const dateStr = getLocalDateStr(day);
                const dayAppointments = appointmentsByDate[dateStr] || [];
                const isToday = day.toDateString() === new Date().toDateString();
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] rounded-lg border p-2 ${
                      isToday
                        ? 'border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800'
                        : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                    } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                  >
                    <div
                      className={`text-[11px] font-semibold ${
                        isToday
                          ? 'text-neutral-900 dark:text-white'
                          : isCurrentMonth
                            ? 'text-neutral-700 dark:text-neutral-300'
                            : 'text-neutral-400'
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment) => {
                        const colors = getStatusColor(appointment.status);
                        return (
                          <button
                            key={appointment.id}
                            onClick={() => setSelectedAppointment(appointment)}
                            className={`w-full rounded border ${colors.border} ${colors.bg} px-1.5 py-1 text-left hover:shadow-sm transition-shadow`}
                          >
                            <div className="text-[9px] font-medium text-neutral-600 dark:text-neutral-400">
                              {formatTime(appointment.startsAt)}
                            </div>
                            <div className="text-[10px] font-semibold text-neutral-900 dark:text-white truncate">
                              {appointment.patient.firstName} {appointment.patient.lastName}
                            </div>
                          </button>
                        );
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="text-[9px] text-center text-neutral-500 dark:text-neutral-400">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* New Appointment Dialog */}
      {showNewAppointmentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  New Appointment
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Schedule a new patient appointment
                </p>
              </div>
              <button
                onClick={() => setShowNewAppointmentDialog(false)}
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
                defaultDate={dateStr}
                onSuccess={() => {
                  setShowNewAppointmentDialog(false);
                  refetch();
                }}
                onCancel={() => setShowNewAppointmentDialog(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* View Appointment Dialog */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Appointment Details
                </h2>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {formatTime(selectedAppointment.startsAt)} -{' '}
                  {formatTime(selectedAppointment.endsAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
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
            <div className="p-6 space-y-4">
              {/* Patient Info */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Patient
                </label>
                <div className="mt-1 text-sm font-medium text-neutral-900 dark:text-white">
                  {selectedAppointment.patient.firstName}{' '}
                  {selectedAppointment.patient.middleName &&
                    `${selectedAppointment.patient.middleName} `}
                  {selectedAppointment.patient.lastName}
                </div>
                {selectedAppointment.patient.mrn && (
                  <div className="text-[11px] text-neutral-500">
                    MRN: {selectedAppointment.patient.mrn}
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Date & Time
                </label>
                <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                  {new Date(selectedAppointment.startsAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  {formatTime(selectedAppointment.startsAt)} -{' '}
                  {formatTime(selectedAppointment.endsAt)}
                </div>
              </div>

              {/* Provider */}
              {selectedAppointment.providerId && selectedAppointment.provider && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Provider / Doctor
                  </label>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {selectedAppointment.provider.name || selectedAppointment.provider.email}
                  </div>
                  {selectedAppointment.provider.name && (
                    <div className="text-[11px] text-neutral-500">
                      {selectedAppointment.provider.email}
                    </div>
                  )}
                </div>
              )}

              {/* Services & Procedures */}
              {selectedAppointment.services && selectedAppointment.services.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Services / Procedures
                  </label>
                  <div className="mt-2 space-y-3">
                    {selectedAppointment.services.map((service, idx) => (
                      <div
                        key={service.id}
                        className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-neutral-900 dark:text-white">
                              {service.itemName}
                              {service.variantName && ` - ${service.variantName}`}
                            </div>
                            <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                              Base Price: ₱{service.basePrice.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {service.modifiers && service.modifiers.length > 0 && (
                          <div className="mt-2 space-y-1 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                            <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                              Modifiers
                            </div>
                            {service.modifiers.map((modifier) => (
                              <div
                                key={modifier.id}
                                className="flex items-center justify-between text-[11px]"
                              >
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  {modifier.modifierName}: {modifier.optionName}
                                </span>
                                <span className="text-neutral-600 dark:text-neutral-400">
                                  +₱{modifier.price.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              {selectedAppointment.totalPrice !== undefined &&
                selectedAppointment.totalPrice > 0 && (
                  <div>
                    <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                      Pricing
                    </label>
                    <div className="mt-1 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                      {selectedAppointment.discountAmount &&
                        selectedAppointment.discountAmount > 0 && (
                          <>
                            <div className="flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
                              <span>Subtotal</span>
                              <span>
                                ₱
                                {(
                                  selectedAppointment.subtotal ?? selectedAppointment.totalPrice
                                ).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                              <span>{selectedAppointment.discountName}</span>
                              <span>-₱{selectedAppointment.discountAmount.toFixed(2)}</span>
                            </div>
                            <div className="my-2 border-t border-green-200 dark:border-green-800" />
                          </>
                        )}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          Total
                        </span>
                        <span className="text-2xl font-semibold text-green-900 dark:text-green-100">
                          ₱{selectedAppointment.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* Reason */}
              {selectedAppointment.reason && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Reason
                  </label>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white">
                    {selectedAppointment.reason}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedAppointment.notes && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    Notes
                  </label>
                  <div className="mt-1 text-sm text-neutral-900 dark:text-white whitespace-pre-wrap">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getStatusColor(selectedAppointment.status).badge}`}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => {
                        setEditingAppointment(selectedAppointment);
                        setSelectedAppointment(null);
                      }}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm('Mark this appointment as completed?')) return;
                        try {
                          const response = await fetch(
                            `/api/appointments/${selectedAppointment.id}`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'completed' }),
                            },
                          );

                          if (!response.ok) {
                            const error = await response.json();
                            alert(error.error || 'Failed to update appointment');
                            return;
                          }

                          setSelectedAppointment(null);
                          refetch();
                        } catch (error) {
                          console.error('Update error:', error);
                          alert('Failed to update appointment');
                        }
                      }}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Complete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Dialog */}
      {editingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Edit Appointment
              </h2>
              <button
                onClick={() => setEditingAppointment(null)}
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
                editMode
                appointmentId={editingAppointment.id}
                preSelectedPatient={editingAppointment.patient}
                initialData={{
                  providerId: editingAppointment.providerId || undefined,
                  date: new Date(editingAppointment.startsAt).toISOString().split('T')[0],
                  startTime: new Date(editingAppointment.startsAt).toTimeString().slice(0, 5),
                  endTime: new Date(editingAppointment.endsAt).toTimeString().slice(0, 5),
                  reason: editingAppointment.reason || undefined,
                  notes: editingAppointment.notes || undefined,
                  services: editingAppointment.services?.map((s) => ({
                    itemId: s.itemId,
                    variantId: s.variantId,
                    itemName: s.itemName || '',
                    variantName: s.variantName || '',
                    basePrice: s.basePrice,
                    modifiers: (s.modifiers || []).reduce(
                      (acc, mod) => {
                        acc[mod.modifierId] = mod.optionId;
                        return acc;
                      },
                      {} as Record<string, string>,
                    ),
                  })),
                  // Discount info
                  discountId: editingAppointment.discountId || undefined,
                  discountName: editingAppointment.discountName || undefined,
                  discountType: editingAppointment.discountType || undefined,
                  discountValue: editingAppointment.discountValue ?? undefined,
                }}
                onSuccess={() => {
                  setEditingAppointment(null);
                  refetch();
                }}
                onCancel={() => setEditingAppointment(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
