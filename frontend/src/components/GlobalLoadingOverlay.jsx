import LoadingSpinner from "./LoadingSpinner";

const GlobalLoadingOverlay = ({
  isLoading,
  message = "Loading...",
  children,
}) => {
  if (!isLoading) {
    return children;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-40">
        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingOverlay;
