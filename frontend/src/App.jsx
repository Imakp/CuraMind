import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import OfflineIndicator from "./components/OfflineIndicator";
import Dashboard from "./pages/Dashboard";
import Manage from "./pages/Manage";
import Settings from "./pages/Settings";
import MedicationNew from "./pages/MedicationNew";
import MedicationEdit from "./pages/MedicationEdit";
import { AppStateProvider } from "./contexts/AppStateContext";
import { initializeServiceWorker } from "./utils/serviceWorker";
import dataSynchronizer, { syncConfig } from "./utils/dataSync";
import { cleanup } from "./utils/localStorage";
import apiClient from "./utils/apiClient";

// Error reporting function for production
const handleError = (errorDetails) => {
  // In a real application, you would send this to an error reporting service
  // like Sentry, LogRocket, Bugsnag, etc.
  console.error("Production Error:", errorDetails);

  // Example: Send to error reporting service
  // if (window.Sentry) {
  //   window.Sentry.captureException(new Error(errorDetails.message), {
  //     extra: errorDetails
  //   });
  // }
};

function App() {
  const [serviceWorker, setServiceWorker] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Initialize service worker and offline capabilities
    const initializeApp = async () => {
      try {
        // Initialize service worker
        const sw = await initializeServiceWorker({
          onUpdateAvailable: (detail) => {
            console.log("App update available");
            setUpdateAvailable(true);
          },
          onOffline: () => {
            console.log("App went offline");
          },
          onOnline: () => {
            console.log("App came back online");
            // Trigger sync when coming back online
            if (dataSynchronizer.needsSync()) {
              dataSynchronizer.sync().catch((error) => {
                console.error("Auto-sync failed:", error);
              });
            }
          },
        });

        setServiceWorker(sw);

        // Configure data synchronization
        syncConfig.enableAutoSync(true);
        syncConfig.enablePeriodicSync(5 * 60 * 1000); // 5 minutes

        // Setup API client offline queue callback
        apiClient.setOfflineQueueCallback((operation) => {
          // This will be handled by the AppStateContext
          console.log("Operation queued for offline:", operation);
        });

        // Perform initial sync if needed
        if (navigator.onLine && dataSynchronizer.needsSync()) {
          dataSynchronizer.sync().catch((error) => {
            console.error("Initial sync failed:", error);
          });
        }

        // Perform maintenance cleanup
        cleanup.performMaintenance();

        console.log("App initialization complete");
      } catch (error) {
        console.error("App initialization failed:", error);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      if (serviceWorker?.cleanup) {
        serviceWorker.cleanup();
      }
      syncConfig.disablePeriodicSync();
    };
  }, []);

  // Handle app update
  const handleUpdateApp = async () => {
    if (serviceWorker?.skipWaiting) {
      await serviceWorker.skipWaiting();
      window.location.reload();
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <AppStateProvider>
        <Router>
          <OfflineIndicator />

          {/* Update notification */}
          {updateAvailable && (
            <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-3 text-center z-50">
              <span className="mr-4">
                A new version of the app is available!
              </span>
              <button
                onClick={handleUpdateApp}
                className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
              >
                Update Now
              </button>
              <button
                onClick={() => setUpdateAvailable(false)}
                className="ml-2 text-blue-200 hover:text-white"
              >
                ×
              </button>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="manage" element={<Manage />} />
              <Route path="manage/new" element={<MedicationNew />} />
              <Route path="manage/edit/:id" element={<MedicationEdit />} />
              <Route path="settings" element={<Settings />} />
              {/* Catch all route - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </AppStateProvider>
    </ErrorBoundary>
  );
}

export default App;
