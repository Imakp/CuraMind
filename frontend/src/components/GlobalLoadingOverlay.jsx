import LoadingSpinner from "./ui/LoadingSpinner";

const GlobalLoadingOverlay = ({
  isLoading,
  message = "Loading...",
  children,
  variant = "overlay", // "overlay" | "fullscreen" | "inline"
}) => {
  if (!isLoading) {
    return children;
  }

  const loadingContent = (
    <div className="flex flex-col items-center space-y-4 animate-fade-in">
      <div className="relative">
        <LoadingSpinner size="xl" color="primary" variant="spinner" />
        <div className="absolute inset-0 animate-ping">
          <LoadingSpinner
            size="xl"
            color="primary"
            variant="ring"
            className="opacity-20"
          />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {message}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Please wait while we process your request
        </p>
      </div>
    </div>
  );

  if (variant === "fullscreen") {
    return (
      <div className="fixed inset-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-8 max-w-sm mx-4">
          {loadingContent}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center py-16">
        {loadingContent}
      </div>
    );
  }

  // Default overlay variant
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-40 rounded-xl">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 max-w-xs mx-4">
          {loadingContent}
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
