import { useState, useEffect } from "react";
import {
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";
import { useOnline } from "../hooks/useOnline";

const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnline();
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowOnlineMessage(true);
      setDismissed(false);
      // Auto-hide the "back online" message after 5 seconds
      const timer = setTimeout(() => {
        setShowOnlineMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  if ((isOnline && !showOnlineMessage) || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    setShowOnlineMessage(false);
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
      <div className="max-w-md w-full">
        {!isOnline ? (
          // Enhanced Offline indicator
          <div className="bg-error-600 dark:bg-error-700 text-white rounded-xl shadow-lg border border-error-700 dark:border-error-600 p-4 animate-slide-down">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-error-500/20 rounded-xl flex items-center justify-center">
                  <HeroIcon
                    icon={ExclamationTriangleIcon}
                    size="md"
                    className="text-white"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">You're offline</h4>
                <p className="text-xs text-error-100">
                  Some features may not work properly. Check your internet
                  connection.
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-error-400 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        ) : showOnlineMessage ? (
          // Enhanced Back online indicator
          <div className="bg-success-600 dark:bg-success-700 text-white rounded-xl shadow-lg border border-success-700 dark:border-success-600 p-4 animate-slide-down">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-success-500/20 rounded-xl flex items-center justify-center animate-bounce">
                  <HeroIcon
                    icon={CheckCircleIcon}
                    size="md"
                    className="text-white"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">
                  You're back online!
                </h4>
                <p className="text-xs text-success-100">
                  All features are now available.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-white hover:bg-success-500/20 -mr-2"
                >
                  <HeroIcon icon={XMarkIcon} size="sm" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default OfflineIndicator;
