import { useState, useEffect } from "react";
import DatePicker from "../components/DatePicker";
import MedicationCard from "../components/MedicationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import NotificationBell from "../components/NotificationBell";

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

  // Render time period section
  const renderTimePeriod = (period, entries) => {
    if (entries.length === 0) return null;

    return (
      <div key={period} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
            {entries.length}
          </span>
          {getPeriodDisplayName(period)}
        </h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Medication Schedule
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {formatDateForDisplay(selectedDate)}
              </p>
            </div>

            <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-4">
              <NotificationBell />
              <DatePicker
                value={selectedDate}
                onChange={handleDateChange}
                label="Select Date"
                placeholder="Choose date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {schedule && (
          <>
            {/* Schedule Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">
                  Daily Summary
                </h2>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => (window.location.href = "/manage")}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Medication
                  </button>

                  <button
                    onClick={() => (window.location.href = "/manage")}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    View All
                  </button>

                  <button
                    onClick={() => fetchSchedule(selectedDate)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedule.total_medications}
                  </div>
                  <div className="text-sm text-gray-600">Medications</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {schedule.total_doses}
                  </div>
                  <div className="text-sm text-gray-600">Total Doses</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {schedule.skipped_medications?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {schedule.schedule
                      ? Object.values(schedule.schedule)
                          .flat()
                          .filter((entry) => entry.is_low_inventory).length
                      : 0}
                  </div>
                  <div className="text-sm text-gray-600">Low Inventory</div>
                </div>
              </div>
            </div>

            {/* Buy Soon Alerts */}
            {schedule.schedule &&
              Object.values(schedule.schedule)
                .flat()
                .some((entry) => entry.is_low_inventory) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                  <h2 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Buy Soon Alerts
                  </h2>

                  <div className="space-y-3">
                    {Object.values(schedule.schedule)
                      .flat()
                      .filter((entry) => entry.is_low_inventory)
                      .map((entry) => (
                        <div
                          key={`${entry.medication_id}-alert`}
                          className="bg-white rounded-md p-4 border border-red-200"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {entry.medication_name}
                              </h4>
                              {entry.medication_strength && (
                                <p className="text-sm text-gray-600">
                                  {entry.medication_strength}
                                </p>
                              )}
                              <p className="text-sm text-red-600 mt-1">
                                Only {entry.remaining_tablets} tablets remaining
                              </p>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                Buy Soon
                              </span>
                              <button
                                onClick={() =>
                                  handleUpdateInventory(entry.medication_id)
                                }
                                className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              >
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                  />
                                </svg>
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Skipped Medications */}
            {schedule.skipped_medications &&
              schedule.skipped_medications.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                  <h2 className="text-lg font-semibold text-yellow-800 mb-4">
                    Skipped Medications
                  </h2>

                  <div className="space-y-2">
                    {schedule.skipped_medications.map((skipped) => (
                      <div
                        key={skipped.id}
                        className="flex justify-between items-center bg-white rounded-md p-3 border border-yellow-200"
                      >
                        <span className="font-medium text-gray-900">
                          {skipped.name}
                        </span>
                        <span className="text-sm text-yellow-700">
                          {skipped.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Schedule by Time Periods */}
            {schedule.schedule && (
              <div className="space-y-8">
                {Object.entries(schedule.schedule).map(([period, entries]) =>
                  renderTimePeriod(period, entries)
                )}
              </div>
            )}

            {/* Empty State */}
            {schedule.total_doses === 0 && (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No medications scheduled
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  No medications are scheduled for{" "}
                  {formatDateForDisplay(selectedDate)}.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <div className="relative quick-actions-container">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>

          {/* Quick Actions Menu */}
          {showQuickActions && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48">
              <button
                onClick={() => {
                  window.location.href = "/manage";
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add Medication
              </button>

              <button
                onClick={() => {
                  window.location.href = "/manage";
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                View All Medications
              </button>

              <button
                onClick={() => {
                  fetchSchedule(selectedDate);
                  setShowQuickActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
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
