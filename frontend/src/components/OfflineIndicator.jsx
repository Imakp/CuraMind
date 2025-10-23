import { useOnline } from "../hooks/useOnline";

const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnline();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline ? (
        // Offline indicator
        <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center space-x-2">
            <svg
              className="w-4 h-4"
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
            <span>You're offline. Some features may not work.</span>
          </div>
        </div>
      ) : wasOffline ? (
        // Back online indicator
        <div className="bg-green-600 text-white px-4 py-2 text-center text-sm font-medium animate-pulse">
          <div className="flex items-center justify-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>You're back online!</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
