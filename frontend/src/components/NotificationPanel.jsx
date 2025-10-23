import { useState, useEffect } from "react";
import {
  BellIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";

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
          <div className="flex-shrink-0 w-10 h-10 bg-error-100 dark:bg-error-900/30 rounded-xl flex items-center justify-center border border-error-200 dark:border-error-800">
            <HeroIcon
              icon={ExclamationTriangleIcon}
              size="md"
              className="text-error-600 dark:text-error-400"
            />
          </div>
        );
      case "DOSE_DUE":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-info-100 dark:bg-info-900/30 rounded-xl flex items-center justify-center border border-info-200 dark:border-info-800">
            <HeroIcon
              icon={ClockIcon}
              size="md"
              className="text-info-600 dark:text-info-400"
            />
          </div>
        );
      case "MISSED_DOSE":
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center border border-warning-200 dark:border-warning-800">
            <HeroIcon
              icon={ExclamationCircleIcon}
              size="md"
              className="text-warning-600 dark:text-warning-400"
            />
          </div>
        );
      default:
        return (
          <div className="flex-shrink-0 w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center border border-neutral-200 dark:border-neutral-700">
            <HeroIcon
              icon={InformationCircleIcon}
              size="md"
              className="text-neutral-600 dark:text-neutral-400"
            />
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-neutral-800 shadow-2xl border-l border-neutral-200 dark:border-neutral-700 notification-slide-in">
        <div className="flex flex-col h-full">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <HeroIcon
                  icon={BellIcon}
                  size="md"
                  className="text-primary-600 dark:text-primary-400"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <StatusBadge
                    status="error"
                    size="sm"
                    variant="soft"
                    className="mt-1"
                  >
                    {unreadCount} unread
                  </StatusBadge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                >
                  Mark all read
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700"
              >
                <HeroIcon icon={XMarkIcon} size="md" />
              </Button>
            </div>
          </div>

          {/* Enhanced Content */}
          <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
            {loading && (
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="loading-spinner w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Loading notifications...
                </p>
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <HeroIcon
                      icon={ExclamationCircleIcon}
                      size="md"
                      className="text-error-500 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-error-800 dark:text-error-200">
                        Error Loading Notifications
                      </h4>
                      <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                        {error}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchNotifications}
                        className="mt-3 border-error-300 text-error-700 hover:bg-error-50 dark:border-error-700 dark:text-error-300 dark:hover:bg-error-900/30"
                      >
                        <HeroIcon
                          icon={ArrowPathIcon}
                          size="sm"
                          className="mr-2"
                        />
                        Try again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <HeroIcon
                    icon={BellIcon}
                    size="xl"
                    className="text-neutral-400 dark:text-neutral-500"
                  />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  No notifications
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                  {showUnreadOnly
                    ? "All caught up! No unread notifications at the moment."
                    : "You're all set! No notifications to display right now."}
                </p>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div className="p-4 space-y-3">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`relative bg-white dark:bg-neutral-800 rounded-xl border transition-all duration-200 hover:shadow-md interactive-enhanced stagger-item ${
                      !notification.is_read
                        ? "border-primary-200 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="p-4">
                      <div className="flex items-start space-x-4">
                        {getNotificationIcon(notification.type)}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <StatusBadge
                              status={
                                notification.type === "BUY_SOON"
                                  ? "error"
                                  : notification.type === "DOSE_DUE"
                                  ? "info"
                                  : notification.type === "MISSED_DOSE"
                                  ? "warning"
                                  : "neutral"
                              }
                              size="sm"
                              variant="soft"
                            >
                              {getTypeDisplayName(notification.type)}
                            </StatusBadge>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                          </div>

                          <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium mb-2 leading-relaxed">
                            {notification.message}
                          </p>

                          {notification.medication_name && (
                            <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg px-3 py-2 mb-3">
                              <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                {notification.medication_name}
                                {notification.medication_strength &&
                                  ` (${notification.medication_strength})`}
                              </p>
                            </div>
                          )}

                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              disabled={markingAsRead.has(notification.id)}
                              loading={markingAsRead.has(notification.id)}
                              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                            >
                              {markingAsRead.has(notification.id)
                                ? "Marking..."
                                : "Mark as read"}
                            </Button>
                          )}
                        </div>

                        {!notification.is_read && (
                          <div className="flex-shrink-0 w-3 h-3 bg-primary-500 rounded-full mt-1 animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enhanced Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/50">
            <Button
              variant="outline"
              size="md"
              onClick={fetchNotifications}
              disabled={loading}
              loading={loading}
              className="w-full border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <HeroIcon icon={ArrowPathIcon} size="sm" className="mr-2" />
              Refresh Notifications
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
