import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const Settings = () => {
  const [routes, setRoutes] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("routes");

  // Route form state
  const [routeForm, setRouteForm] = useState({
    name: "",
    description: "",
  });
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeFormErrors, setRouteFormErrors] = useState({});
  const [savingRoute, setSavingRoute] = useState(false);

  // Frequency form state
  const [frequencyForm, setFrequencyForm] = useState({
    name: "",
    description: "",
  });
  const [editingFrequency, setEditingFrequency] = useState(null);
  const [frequencyFormErrors, setFrequencyFormErrors] = useState({});
  const [savingFrequency, setSavingFrequency] = useState(false);

  // Fetch routes
  const fetchRoutes = async () => {
    try {
      const response = await fetch("/api/settings/routes");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to fetch routes");
      }

      setRoutes(result.data || []);
    } catch (err) {
      console.error("Error fetching routes:", err);
      setError(err.message);
    }
  };

  // Fetch frequencies
  const fetchFrequencies = async () => {
    try {
      const response = await fetch("/api/settings/frequencies");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to fetch frequencies");
      }

      setFrequencies(result.data || []);
    } catch (err) {
      console.error("Error fetching frequencies:", err);
      setError(err.message);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        await Promise.all([fetchRoutes(), fetchFrequencies()]);
      } catch (err) {
        console.error("Error loading settings data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Validate route form
  const validateRouteForm = (data) => {
    const errors = {};

    if (!data.name?.trim()) {
      errors.name = "Route name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Route name must be at least 2 characters";
    } else if (data.name.trim().length > 50) {
      errors.name = "Route name must be less than 50 characters";
    }

    if (data.description && data.description.length > 200) {
      errors.description = "Description must be less than 200 characters";
    }

    return errors;
  };

  // Validate frequency form
  const validateFrequencyForm = (data) => {
    const errors = {};

    if (!data.name?.trim()) {
      errors.name = "Frequency name is required";
    } else if (data.name.trim().length < 2) {
      errors.name = "Frequency name must be at least 2 characters";
    } else if (data.name.trim().length > 50) {
      errors.name = "Frequency name must be less than 50 characters";
    }

    if (data.description && data.description.length > 200) {
      errors.description = "Description must be less than 200 characters";
    }

    return errors;
  };

  // Handle route form submission
  const handleRouteSubmit = async (e) => {
    e.preventDefault();

    const errors = validateRouteForm(routeForm);
    setRouteFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingRoute(true);
    setError("");

    try {
      const url = editingRoute
        ? `/api/settings/routes/${editingRoute.id}`
        : "/api/settings/routes";

      const method = editingRoute ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: routeForm.name.trim(),
          description: routeForm.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save route");
      }

      // Reset form and refresh data
      setRouteForm({ name: "", description: "" });
      setEditingRoute(null);
      setRouteFormErrors({});
      await fetchRoutes();
    } catch (err) {
      console.error("Error saving route:", err);
      setError(err.message);
    } finally {
      setSavingRoute(false);
    }
  };

  // Handle frequency form submission
  const handleFrequencySubmit = async (e) => {
    e.preventDefault();

    const errors = validateFrequencyForm(frequencyForm);
    setFrequencyFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingFrequency(true);
    setError("");

    try {
      const url = editingFrequency
        ? `/api/settings/frequencies/${editingFrequency.id}`
        : "/api/settings/frequencies";

      const method = editingFrequency ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: frequencyForm.name.trim(),
          description: frequencyForm.description.trim() || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to save frequency");
      }

      // Reset form and refresh data
      setFrequencyForm({ name: "", description: "" });
      setEditingFrequency(null);
      setFrequencyFormErrors({});
      await fetchFrequencies();
    } catch (err) {
      console.error("Error saving frequency:", err);
      setError(err.message);
    } finally {
      setSavingFrequency(false);
    }
  };

  // Handle route edit
  const handleEditRoute = (route) => {
    setEditingRoute(route);
    setRouteForm({
      name: route.name,
      description: route.description || "",
    });
    setRouteFormErrors({});
  };

  // Handle frequency edit
  const handleEditFrequency = (frequency) => {
    setEditingFrequency(frequency);
    setFrequencyForm({
      name: frequency.name,
      description: frequency.description || "",
    });
    setFrequencyFormErrors({});
  };

  // Handle route deletion
  const handleDeleteRoute = async (route) => {
    if (
      !confirm(`Are you sure you want to delete the route "${route.name}"?`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/settings/routes/${route.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(
            "Cannot delete this route because it is being used by existing medications."
          );
          return;
        }
        throw new Error(result.error?.message || "Failed to delete route");
      }

      await fetchRoutes();
    } catch (err) {
      console.error("Error deleting route:", err);
      setError(err.message);
    }
  };

  // Handle frequency deletion
  const handleDeleteFrequency = async (frequency) => {
    if (
      !confirm(
        `Are you sure you want to delete the frequency "${frequency.name}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/settings/frequencies/${frequency.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(
            "Cannot delete this frequency because it is being used by existing medications."
          );
          return;
        }
        throw new Error(result.error?.message || "Failed to delete frequency");
      }

      await fetchFrequencies();
    } catch (err) {
      console.error("Error deleting frequency:", err);
      setError(err.message);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRoute(null);
    setEditingFrequency(null);
    setRouteForm({ name: "", description: "" });
    setFrequencyForm({ name: "", description: "" });
    setRouteFormErrors({});
    setFrequencyFormErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage routes and frequencies for your medications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("routes")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "routes"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Routes ({routes.length})
              </button>
              <button
                onClick={() => setActiveTab("frequencies")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "frequencies"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Frequencies ({frequencies.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "routes" && (
              <RouteManagement
                routes={routes}
                routeForm={routeForm}
                setRouteForm={setRouteForm}
                editingRoute={editingRoute}
                routeFormErrors={routeFormErrors}
                savingRoute={savingRoute}
                onSubmit={handleRouteSubmit}
                onEdit={handleEditRoute}
                onDelete={handleDeleteRoute}
                onCancel={handleCancelEdit}
              />
            )}

            {activeTab === "frequencies" && (
              <FrequencyManagement
                frequencies={frequencies}
                frequencyForm={frequencyForm}
                setFrequencyForm={setFrequencyForm}
                editingFrequency={editingFrequency}
                frequencyFormErrors={frequencyFormErrors}
                savingFrequency={savingFrequency}
                onSubmit={handleFrequencySubmit}
                onEdit={handleEditFrequency}
                onDelete={handleDeleteFrequency}
                onCancel={handleCancelEdit}
              />
            )}
          </div>
        </div>
      </div>

      {/* Back to Dashboard Button */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Route Management Component
const RouteManagement = ({
  routes,
  routeForm,
  setRouteForm,
  editingRoute,
  routeFormErrors,
  savingRoute,
  onSubmit,
  onEdit,
  onDelete,
  onCancel,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">Route Management</h2>
        <p className="text-sm text-gray-600">
          Manage medication administration routes (oral, inhale, subcutaneous,
          etc.)
        </p>
      </div>

      {/* Route Form */}
      <form onSubmit={onSubmit} className="mb-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          {editingRoute ? "Edit Route" : "Add New Route"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="route-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Route Name *
            </label>
            <input
              type="text"
              id="route-name"
              value={routeForm.name}
              onChange={(e) =>
                setRouteForm({ ...routeForm, name: e.target.value })
              }
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                routeFormErrors.name ? "border-red-300" : ""
              }`}
              placeholder="e.g., Oral, Inhale, Subcutaneous"
            />
            {routeFormErrors.name && (
              <p className="mt-1 text-sm text-red-600">
                {routeFormErrors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="route-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <input
              type="text"
              id="route-description"
              value={routeForm.description}
              onChange={(e) =>
                setRouteForm({ ...routeForm, description: e.target.value })
              }
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                routeFormErrors.description ? "border-red-300" : ""
              }`}
              placeholder="Optional description"
            />
            {routeFormErrors.description && (
              <p className="mt-1 text-sm text-red-600">
                {routeFormErrors.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          {editingRoute && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={savingRoute}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {savingRoute
              ? "Saving..."
              : editingRoute
              ? "Update Route"
              : "Add Route"}
          </button>
        </div>
      </form>

      {/* Routes List */}
      <div className="space-y-4">
        {routes.length > 0 ? (
          routes.map((route) => (
            <div
              key={route.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{route.name}</h4>
                {route.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {route.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(route.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEdit(route)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(route)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No routes configured yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first route above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Frequency Management Component
const FrequencyManagement = ({
  frequencies,
  frequencyForm,
  setFrequencyForm,
  editingFrequency,
  frequencyFormErrors,
  savingFrequency,
  onSubmit,
  onEdit,
  onDelete,
  onCancel,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          Frequency Management
        </h2>
        <p className="text-sm text-gray-600">
          Manage medication frequency presets (daily, twice daily, as needed,
          etc.)
        </p>
      </div>

      {/* Frequency Form */}
      <form onSubmit={onSubmit} className="mb-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">
          {editingFrequency ? "Edit Frequency" : "Add New Frequency"}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="frequency-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Frequency Name *
            </label>
            <input
              type="text"
              id="frequency-name"
              value={frequencyForm.name}
              onChange={(e) =>
                setFrequencyForm({ ...frequencyForm, name: e.target.value })
              }
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                frequencyFormErrors.name ? "border-red-300" : ""
              }`}
              placeholder="e.g., Daily, Twice Daily, As Needed"
            />
            {frequencyFormErrors.name && (
              <p className="mt-1 text-sm text-red-600">
                {frequencyFormErrors.name}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="frequency-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <input
              type="text"
              id="frequency-description"
              value={frequencyForm.description}
              onChange={(e) =>
                setFrequencyForm({
                  ...frequencyForm,
                  description: e.target.value,
                })
              }
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                frequencyFormErrors.description ? "border-red-300" : ""
              }`}
              placeholder="Optional description"
            />
            {frequencyFormErrors.description && (
              <p className="mt-1 text-sm text-red-600">
                {frequencyFormErrors.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-4">
          {editingFrequency && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={savingFrequency}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {savingFrequency
              ? "Saving..."
              : editingFrequency
              ? "Update Frequency"
              : "Add Frequency"}
          </button>
        </div>
      </form>

      {/* Frequencies List */}
      <div className="space-y-4">
        {frequencies.length > 0 ? (
          frequencies.map((frequency) => (
            <div
              key={frequency.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-start"
            >
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{frequency.name}</h4>
                {frequency.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {frequency.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(frequency.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onEdit(frequency)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(frequency)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No frequencies configured yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first frequency above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
