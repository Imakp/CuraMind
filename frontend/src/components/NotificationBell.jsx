import { useState, useEffect } from "react";
import NotificationPanel from "./NotificationPanel";

const NotificationBell = ({ medicationId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.append("is_read", "false");
      if (medicationId) {
        params.append("medicine_id", medicationId);
      }

      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();

      if (response.ok) {
        setUnreadCount(result.count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh unread count periodically
  useEffect(() => {
    fetchUnreadCount();

    // Set up polling for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [medicationId]);

  // Handle panel close
  const handlePanelClose = () => {
    setIsOpen(false);
    // Refresh count when panel closes in case notifications were marked as read
    setTimeout(fetchUnreadCount, 500);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md transition-colors"
        title="View notifications"
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
            d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 01-7.5-7.5H7.5a7.5 7.5 0 017.5 7.5v5z"
          />
        </svg>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Loading indicator */}
        {loading && (
          <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full h-3 w-3 animate-pulse" />
        )}
      </button>

      <NotificationPanel
        isOpen={isOpen}
        onClose={handlePanelClose}
        medicationId={medicationId}
      />
    </>
  );
};

export default NotificationBell;
