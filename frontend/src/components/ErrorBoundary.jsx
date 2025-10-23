import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Enhanced error logging
    const errorDetails = {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.props.userId || "anonymous",
    };

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.group("🚨 Error Boundary Caught Error");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("Error Details:", errorDetails);
      console.groupEnd();
    }

    // In production, you would send this to an error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === "production" && this.props.onError) {
      this.props.onError(errorDetails);
    }

    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId,
    });
  }

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  reportError = () => {
    const { error, errorInfo, errorId } = this.state;

    // Create error report
    const report = {
      errorId,
      message: error?.message || "Unknown error",
      stack: error?.stack || "No stack trace",
      componentStack: errorInfo?.componentStack || "No component stack",
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    // Copy to clipboard
    navigator.clipboard
      .writeText(JSON.stringify(report, null, 2))
      .then(() => {
        alert(
          "Error report copied to clipboard. Please share this with support."
        );
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = JSON.stringify(report, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert(
          "Error report copied to clipboard. Please share this with support."
        );
      });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, retryCount } = this.state;

      // Custom error UI with enhanced features
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900">
                Oops! Something went wrong
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                We encountered an unexpected error. Don't worry, your data is
                safe.
              </p>

              {errorId && (
                <p className="mt-2 text-xs text-gray-500">
                  Error ID:{" "}
                  <code className="bg-gray-100 px-1 rounded">{errorId}</code>
                </p>
              )}

              {retryCount > 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  Retry attempts: {retryCount}
                </p>
              )}
            </div>

            {/* Error Details for Development */}
            {process.env.NODE_ENV === "development" && error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  🔍 Error Details (Development Mode)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Error Message
                    </h4>
                    <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                      {error.toString()}
                    </pre>
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        Component Stack
                      </h4>
                      <pre className="mt-1 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto max-h-32">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="mt-8 space-y-3">
              <div className="flex space-x-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Refresh Page
                </button>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={this.reportError}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                >
                  Report Error
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                If this problem persists, please use the "Report Error" button
                to get help.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
