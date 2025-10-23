import LoadingSpinnerUI from "./ui/LoadingSpinner";

const LoadingSpinner = ({
  size = "md",
  color = "primary",
  text = "",
  fullScreen = false,
  overlay = false,
  variant = "spinner",
}) => {
  const spinnerElement = (
    <div
      className="flex flex-col items-center justify-center space-y-3"
      data-testid="loading-spinner"
    >
      <LoadingSpinnerUI
        size={size}
        color={color}
        variant={variant}
        className="animate-fade-in"
      />
      {text && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-8 animate-scale-in">
          {spinnerElement}
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 p-6 animate-scale-in">
          {spinnerElement}
        </div>
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner;
