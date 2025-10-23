import { Component } from "react";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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

      // Enhanced custom error UI with modern design
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 p-4">
          <div className="max-w-lg w-full bg-white dark:bg-neutral-800 shadow-2xl rounded-2xl p-8 border border-neutral-200 dark:border-neutral-700 animate-scale-in">
            <div className="flex items-center justify-center w-20 h-20 mx-auto bg-error-100 dark:bg-error-900/30 rounded-2xl mb-6 animate-pulse">
              <ExclamationTriangleIcon className="w-10 h-10 text-error-600 dark:text-error-400" />
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                Oops! Something went wrong
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                We encountered an unexpected error. Don't worry, your data is
                safe and we're working to fix this.
              </p>

              {errorId && (
                <div className="bg-neutral-100 dark:bg-neutral-700 rounded-lg p-3 mb-4">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                    Error ID
                  </p>
                  <code className="text-sm font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-200 dark:bg-neutral-600 px-2 py-1 rounded">
                    {errorId}
                  </code>
                </div>
              )}

              {retryCount > 0 && (
                <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-warning-700 dark:text-warning-300">
                    <span className="font-semibold">Retry attempts:</span>{" "}
                    {retryCount}
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Error Details for Development */}
            {process.env.NODE_ENV === "development" && error && (
              <details className="mt-6 text-left bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
                <summary className="cursor-pointer p-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                  🔍 Error Details (Development Mode)
                </summary>
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                      Error Message
                    </h4>
                    <pre className="text-xs text-error-700 dark:text-error-300 bg-error-50 dark:bg-error-900/20 p-3 rounded-lg overflow-auto border border-error-200 dark:border-error-800">
                      {error.toString()}
                    </pre>
                  </div>
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2">
                        Component Stack
                      </h4>
                      <pre className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg overflow-auto max-h-32 border border-neutral-200 dark:border-neutral-700">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Enhanced Action Buttons */}
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 hover:shadow-lg interactive-enhanced"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center space-x-2 bg-neutral-600 dark:bg-neutral-700 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-neutral-700 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 transition-all duration-200 hover:shadow-lg interactive-enhanced"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Refresh Page</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center space-x-2 bg-success-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-success-700 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 transition-all duration-200 hover:shadow-lg interactive-enhanced"
                >
                  <HomeIcon className="w-4 h-4" />
                  <span>Go to Dashboard</span>
                </button>
                <button
                  onClick={this.reportError}
                  className="flex items-center justify-center space-x-2 bg-warning-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 transition-all duration-200 hover:shadow-lg interactive-enhanced"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>Report Error</span>
                </button>
              </div>
            </div>

            {/* Enhanced Help Text */}
            <div className="mt-6 text-center bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-4">
              <p className="text-sm text-info-700 dark:text-info-300">
                If this problem persists, please use the{" "}
                <span className="font-semibold">"Report Error"</span> button to
                get help from our support team.
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
