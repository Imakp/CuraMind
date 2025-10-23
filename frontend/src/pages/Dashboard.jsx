import { useState, useEffect } from "react";
import DatePicker from "../components/DatePicker";
import MedicationCard from "../components/MedicationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import NotificationBell from "../components/NotificationBell";
import SummaryCard from "../components/ui/SummaryCard";
import { HeroIcon } from "../components/ui/Icon";
import { DashboardSkeleton } from "../components/LoadingSkeleton";
import {
  SummaryCardStagger,
  MedicationCardStagger,
} from "../components/StaggerContainer";
import {
  BeakerIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingDose, setMarkingDose] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Fetch daily schedule
  const fetchSchedule = async (date) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/schedule/daily?date=${date}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to fetch schedule");
      }

      setSchedule(result.data);
    } catch (err) {
      console.error("Error fetching schedule:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark dose as given
  const handleMarkAsGiven = async (medicationId, doseAmount) => {
    try {
      setMarkingDose(`${medicationId}-${doseAmount}`);

      const response = await fetch(
        `/api/medications/${medicationId}/mark-dose-given`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dose_amount: doseAmount,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Failed to mark dose as given"
        );
      }

      // Refresh schedule to show updated inventory
      await fetchSchedule(selectedDate);
    } catch (err) {
      console.error("Error marking dose as given:", err);
      setError(err.message);
    } finally {
      setMarkingDose(null);
    }
  };

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Handle inventory update
  const handleUpdateInventory = (medicationId) => {
    // For now, prompt for new inventory amount
    const newAmount = prompt("Enter new tablet count:");
    if (newAmount && !isNaN(newAmount) && parseFloat(newAmount) >= 0) {
      updateInventory(medicationId, parseFloat(newAmount));
    }
  };

  // Update inventory
  const updateInventory = async (medicationId, newAmount) => {
    try {
      const response = await fetch(
        `/api/medications/${medicationId}/update-inventory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            total_tablets: newAmount,
            reason: "Manual update from dashboard",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to update inventory");
      }

      // Refresh schedule to show updated inventory
      await fetchSchedule(selectedDate);
    } catch (err) {
      console.error("Error updating inventory:", err);
      setError(err.message);
    }
  };

  // Load schedule when component mounts or date changes
  useEffect(() => {
    if (selectedDate) {
      fetchSchedule(selectedDate);
    }
  }, [selectedDate]);

  // Close quick actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showQuickActions &&
        !event.target.closest(".quick-actions-container")
      ) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showQuickActions]);

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateString === today.toISOString().split("T")[0]) {
      return "Today";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Tomorrow";
    } else if (dateString === yesterday.toISOString().split("T")[0]) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get time period display name
  const getPeriodDisplayName = (period) => {
    const names = {
      morning: "Morning (5:00 AM - 11:59 AM)",
      afternoon: "Afternoon (12:00 PM - 4:59 PM)",
      evening: "Evening (5:00 PM - 9:59 PM)",
      night: "Night (10:00 PM - 4:59 AM)",
    };
    return names[period] || period;
  };

  // Enhanced time period section with better visual separation
  const renderTimePeriod = (period, entries) => {
    if (entries.length === 0) return null;

    return (
      <section key={period} className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <span className="text-primary-700 dark:text-primary-300 font-bold text-lg">
                {entries.length}
              </span>
            </div>
            <div>
              <h3 className="text-heading-4 text-neutral-900 dark:text-neutral-100">
                {getPeriodDisplayName(period)}
              </h3>
              <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                {entries.length}{" "}
                {entries.length === 1 ? "medication" : "medications"} scheduled
              </p>
            </div>
          </div>
        </div>

        <MedicationCardStagger>
          {entries.map((entry) => (
            <MedicationCard
              key={`${entry.medication_id}-${entry.dose_id}`}
              medication={{
                id: entry.medication_id,
                name: entry.medication_name,
                strength: entry.medication_strength,
                route: entry.route,
                total_tablets: entry.remaining_tablets,
                notes: entry.instructions,
                dailyConsumption: entry.dose_amount,
              }}
              onMarkAsGiven={handleMarkAsGiven}
              showTime={true}
              timeOfDay={entry.time_of_day}
              doseAmount={entry.dose_amount}
              isMarking={
                markingDose === `${entry.medication_id}-${entry.dose_amount}`
              }
            />
          ))}
        </MedicationCardStagger>
      </section>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
          <div className="layout-container py-8">
            <DashboardSkeleton />
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Enhanced Header with Gradient Background */}
      <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="layout-container py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-heading-2 text-neutral-900 dark:text-neutral-100 mb-2">
                Today's Schedule
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                {formatDateForDisplay(selectedDate)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <NotificationBell />
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                label="Select Date"
                placeholder="Choose date"
                className="min-w-0"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {schedule && (
          <>
            {/* Enhanced Summary Cards with Stagger Animation */}
            <section className="mb-8">
              <SummaryCardStagger>
                <SummaryCard
                  title="Medications"
                  value={schedule.total_medications}
                  icon={<HeroIcon icon={BeakerIcon} size="lg" />}
                  color="primary"
                  variant="filled"
                />
                <SummaryCard
                  title="Total Doses"
                  value={schedule.total_doses}
                  icon={<HeroIcon icon={ClockIcon} size="lg" />}
                  color="success"
                  variant="filled"
                />
                <SummaryCard
                  title="Skipped"
                  value={schedule.skipped_medications?.length || 0}
                  icon={<HeroIcon icon={XCircleIcon} size="lg" />}
                  color="warning"
                  variant="filled"
                />
                <SummaryCard
                  title="Low Inventory"
                  value={
                    schedule.schedule
                      ? Object.values(schedule.schedule)
                          .flat()
                          .filter((entry) => entry.is_low_inventory).length
                      : 0
                  }
                  icon={<HeroIcon icon={ExclamationTriangleIcon} size="lg" />}
                  color="error"
                  variant="filled"
                />
              </SummaryCardStagger>
            </section>

            {/* Quick Actions Section */}
            <section className="mb-8">
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-heading-4 text-neutral-900 dark:text-neutral-100 mb-1">
                      Quick Actions
                    </h2>
                    <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                      Manage your medications and schedule
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => (window.location.href = "/manage")}
                      className="btn-base btn-primary btn-sm"
                    >
                      <HeroIcon icon={PlusIcon} size="sm" />
                      Add Medication
                    </button>

                    <button
                      onClick={() => (window.location.href = "/manage")}
                      className="btn-base btn-secondary btn-sm"
                    >
                      <HeroIcon icon={ClipboardDocumentListIcon} size="sm" />
                      View All
                    </button>

                    <button
                      onClick={() => fetchSchedule(selectedDate)}
                      className="btn-base btn-ghost btn-sm"
                    >
                      <HeroIcon icon={ArrowPathIcon} size="sm" />
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Enhanced Buy Soon Alerts */}
            {schedule.schedule &&
              Object.values(schedule.schedule)
                .flat()
                .some((entry) => entry.is_low_inventory) && (
                <section className="mb-8">
                  <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex-shrink-0 w-10 h-10 bg-error-100 dark:bg-error-900/50 rounded-lg flex items-center justify-center">
                        <HeroIcon
                          icon={ExclamationTriangleIcon}
                          size="lg"
                          color="error"
                        />
                      </div>
                      <div>
                        <h2 className="text-heading-4 text-error-800 dark:text-error-200">
                          Low Inventory Alerts
                        </h2>
                        <p className="text-body-small text-error-700 dark:text-error-300">
                          These medications need to be restocked soon
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {Object.values(schedule.schedule)
                        .flat()
                        .filter((entry) => entry.is_low_inventory)
                        .map((entry) => (
                          <div
                            key={`${entry.medication_id}-alert`}
                            className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-error-200 dark:border-error-700 shadow-sm"
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                                  {entry.medication_name}
                                </h4>
                                {entry.medication_strength && (
                                  <p className="text-body-small text-neutral-600 dark:text-neutral-400 mb-2">
                                    {entry.medication_strength}
                                  </p>
                                )}
                                <p className="text-body-small text-error-600 dark:text-error-400 font-medium">
                                  Only {entry.remaining_tablets} tablets
                                  remaining
                                </p>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="badge-base badge-error badge-filled badge-sm">
                                  Buy Soon
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateInventory(entry.medication_id)
                                  }
                                  className="btn-base btn-secondary btn-xs"
                                >
                                  <HeroIcon icon={PlusIcon} size="xs" />
                                  Update
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </section>
              )}

            {/* Enhanced Skipped Medications */}
            {schedule.skipped_medications &&
              schedule.skipped_medications.length > 0 && (
                <section className="mb-8">
                  <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="flex-shrink-0 w-10 h-10 bg-warning-100 dark:bg-warning-900/50 rounded-lg flex items-center justify-center">
                        <HeroIcon
                          icon={XCircleIcon}
                          size="lg"
                          color="warning"
                        />
                      </div>
                      <div>
                        <h2 className="text-heading-4 text-warning-800 dark:text-warning-200">
                          Skipped Medications
                        </h2>
                        <p className="text-body-small text-warning-700 dark:text-warning-300">
                          Medications that were skipped today
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {schedule.skipped_medications.map((skipped) => (
                        <div
                          key={skipped.id}
                          className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-warning-200 dark:border-warning-700 shadow-sm"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {skipped.name}
                            </span>
                            <span className="text-body-small text-warning-700 dark:text-warning-300 font-medium">
                              {skipped.reason}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

            {/* Enhanced Schedule by Time Periods */}
            {schedule.schedule && (
              <div className="space-y-10">
                {Object.entries(schedule.schedule).map(([period, entries]) =>
                  renderTimePeriod(period, entries)
                )}
              </div>
            )}

            {/* Enhanced Empty State */}
            {schedule.total_doses === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <HeroIcon icon={CalendarDaysIcon} size="2xl" color="muted" />
                </div>
                <h3 className="text-heading-4 text-neutral-900 dark:text-neutral-100 mb-2">
                  No medications scheduled
                </h3>
                <p className="text-body text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                  No medications are scheduled for{" "}
                  {formatDateForDisplay(selectedDate)}. Add medications to get
                  started.
                </p>
                <button
                  onClick={() => (window.location.href = "/manage")}
                  className="btn-base btn-primary btn-md"
                >
                  <HeroIcon icon={PlusIcon} size="sm" />
                  Add Your First Medication
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Enhanced Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <div className="relative quick-actions-container">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="w-14 h-14 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex items-center justify-center"
          >
            <HeroIcon icon={PlusIcon} size="lg" />
          </button>

          {/* Enhanced Quick Actions Menu */}
          {showQuickActions && (
            <div className="absolute bottom-16 right-0 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-2 min-w-56 animate-scale-in">
              <button
                onClick={() => {
                  window.location.href = "/manage";
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
              >
                <HeroIcon icon={PlusIcon} size="sm" color="primary" />
                Add Medication
              </button>

              <button
                onClick={() => {
                  window.location.href = "/manage";
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
              >
                <HeroIcon
                  icon={ClipboardDocumentListIcon}
                  size="sm"
                  color="primary"
                />
                View All Medications
              </button>

              <button
                onClick={() => {
                  fetchSchedule(selectedDate);
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-3 transition-colors"
              >
                <HeroIcon icon={ArrowPathIcon} size="sm" color="primary" />
                Refresh Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
