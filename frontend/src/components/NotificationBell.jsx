import { useState, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
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
        className={`relative p-3 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-neutral-800 interactive-enhanced ${
          unreadCount > 0
            ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 breathe"
            : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        title={`View notifications${
          unreadCount > 0 ? ` (${unreadCount} unread)` : ""
        }`}
      >
        <HeroIcon
          icon={BellIcon}
          size="lg"
          className={`transition-transform duration-200 ${
            unreadCount > 0 ? "animate-pulse" : "hover:scale-110"
          }`}
        />

        {/* Enhanced Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-800 animate-bounce">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Enhanced Loading indicator */}
        {loading && !unreadCount && (
          <span className="absolute -top-1 -right-1 bg-primary-500 rounded-full h-3 w-3 animate-pulse shadow-lg" />
        )}

        {/* Notification pulse ring */}
        {unreadCount > 0 && (
          <span className="absolute inset-0 rounded-xl bg-primary-400 opacity-20 animate-ping" />
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
