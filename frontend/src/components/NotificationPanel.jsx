import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

const NotificationPanel = ({
  isOpen,
  onClose,
  medicationId = null,
  showUnreadOnly = false,
}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingAsRead, setMarkingAsRead] = useState(new Set());

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (medicationId) {
        params.append("medicine_id", medicationId);
      }
      if (showUnreadOnly) {
        params.append("is_read", "false");
      }
      params.append("limit", "50");

      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Failed to fetch notifications"
        );
      }

      setNotifications(result.data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      setMarkingAsRead((prev) => new Set(prev).add(notificationId));

      const response = await fetch(
        `/api/notifications/${notificationId}/mark-read`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Failed to mark notification as read"
        );
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError(err.message);
    } finally {
      setMarkingAsRead((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      setLoading(true);

      const requestBody = {};
      if (medicationId) {
        requestBody.medicine_id = medicationId;
      }

      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Failed to mark all notifications as read"
        );
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case "BUY_SOON":
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "DOSE_DUE":
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
      case "MISSED_DOSE":
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  // Format notification time
  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  // Get notification type display name
  const getTypeDisplayName = (type) => {
    switch (type) {
      case "BUY_SOON":
        return "Buy Soon";
      case "DOSE_DUE":
        return "Dose Due";
      case "MISSED_DOSE":
        return "Missed Dose";
      default:
        return type;
    }
  };

  // Load notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, medicationId, showUnreadOnly]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}

              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center p-8">
                <LoadingSpinner />
              </div>
            )}

            {error && (
              <div className="p-4">
                <ErrorMessage message={error} />
                <button
                  onClick={fetchNotifications}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 01-7.5-7.5H7.5a7.5 7.5 0 017.5 7.5v5z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-sm text-gray-500">
                  {showUnreadOnly
                    ? "No unread notifications"
                    : "No notifications to display"}
                </p>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {getTypeDisplayName(notification.type)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatNotificationTime(notification.created_at)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-900 mb-1">
                          {notification.message}
                        </p>

                        {notification.medication_name && (
                          <p className="text-xs text-gray-600">
                            {notification.medication_name}
                            {notification.medication_strength &&
                              ` (${notification.medication_strength})`}
                          </p>
                        )}

                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            disabled={markingAsRead.has(notification.id)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                          >
                            {markingAsRead.has(notification.id)
                              ? "Marking..."
                              : "Mark as read"}
                          </button>
                        )}
                      </div>

                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={fetchNotifications}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
  );
};

export default NotificationPanel;
