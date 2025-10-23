import React from "react";
import { useAsync } from "../hooks/useAsync";
import { useOnline } from "../hooks/useOnline";
import { scheduleApi } from "../utils/apiClient";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import GlobalLoadingOverlay from "../components/GlobalLoadingOverlay";

/**
 * Example component demonstrating enhanced error handling and loading states
 * This shows how to use the new hooks and utilities for better UX
 */
const EnhancedDashboardExample = () => {
  const { isOnline } = useOnline();
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );

  // Using the useAsync hook for better loading and error state management
  const {
    loading: scheduleLoading,
    error: scheduleError,
    data: schedule,
    execute: fetchSchedule,
    setError: setScheduleError,
  } = useAsync(
    async (date) => {
      const result = await scheduleApi.getDaily(date);
      return result.data;
    },
    false // Don't execute immediately
  );

  // Fetch schedule when date changes
  React.useEffect(() => {
    if (selectedDate) {
      fetchSchedule(selectedDate);
    }
  }, [selectedDate, fetchSchedule]);

  // Handle date change
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Handle retry
  const handleRetry = () => {
    setScheduleError(null);
    fetchSchedule(selectedDate);
  };

  // Show offline message
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            You're Offline
          </h3>
          <p className="text-sm text-gray-600">
            Please check your internet connection and try again.
          </p>
        </div>
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
                Enhanced Dashboard Example
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Demonstrating improved error handling and loading states
              </p>
            </div>

            <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRetry}
                disabled={scheduleLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlobalLoadingOverlay
          isLoading={scheduleLoading}
          message="Loading your medication schedule..."
        >
          {/* Error State */}
          {scheduleError && (
            <div className="mb-6">
              <ErrorMessage
                message={scheduleError.message}
                onRetry={handleRetry}
                onDismiss={() => setScheduleError(null)}
              />
            </div>
          )}

          {/* Content */}
          {schedule && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Schedule for {selectedDate}
              </h2>

              {schedule.total_medications > 0 ? (
                <div className="space-y-4">
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

                  {/* Schedule Details */}
                  {schedule.schedule &&
                    Object.keys(schedule.schedule).length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-md font-medium text-gray-900 mb-3">
                          Medication Schedule
                        </h3>
                        {Object.entries(schedule.schedule).map(
                          ([period, entries]) => (
                            <div key={period} className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                                {period} ({entries.length} medications)
                              </h4>
                              <div className="bg-gray-50 rounded-md p-3">
                                {entries.map((entry, index) => (
                                  <div
                                    key={index}
                                    className="flex justify-between items-center py-1"
                                  >
                                    <span className="text-sm text-gray-900">
                                      {entry.medication_name}
                                      {entry.medication_strength &&
                                        ` (${entry.medication_strength})`}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {entry.dose_amount} at {entry.time_of_day}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-8">
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
                    No medications are scheduled for this date.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Loading State (when not using overlay) */}
          {!schedule && !scheduleError && !scheduleLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                Select a date to view your medication schedule.
              </p>
            </div>
          )}
        </GlobalLoadingOverlay>
      </div>

      {/* Features Demonstration */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Enhanced Features Demonstrated
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Error Handling:
              </h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Automatic retry with exponential backoff</li>
                <li>• User-friendly error messages</li>
                <li>• Manual retry and dismiss options</li>
                <li>• Network error detection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Loading States:
              </h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Global loading overlay</li>
                <li>• Async operation management</li>
                <li>• Loading state indicators</li>
                <li>• Optimistic updates support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                Offline Support:
              </h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Online/offline detection</li>
                <li>• Offline state handling</li>
                <li>• Reconnection notifications</li>
                <li>• Graceful degradation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">
                User Experience:
              </h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Consistent error boundaries</li>
                <li>• Accessible error reporting</li>
                <li>• Responsive design</li>
                <li>• Clear user feedback</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboardExample;
