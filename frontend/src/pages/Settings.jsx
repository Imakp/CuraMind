import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { HeroIcon } from "../components/ui/Icon";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import {
  CogIcon,
  MapPinIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="layout-container py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                <HeroIcon icon={CogIcon} size="lg" color="primary" />
              </div>
              <div>
                <h1 className="text-heading-2 text-neutral-900 dark:text-neutral-100">
                  Settings
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-400">
                  Manage master data for your medications
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => (window.location.href = "/")}
                className="btn-base btn-ghost btn-md lg:hidden"
              >
                <HeroIcon icon={ArrowLeftIcon} size="sm" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Enhanced Tab Navigation */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 mb-8">
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="flex px-6">
              <button
                onClick={() => setActiveTab("routes")}
                className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "routes"
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
                }`}
              >
                <HeroIcon icon={MapPinIcon} size="sm" />
                Routes ({routes.length})
              </button>
              <button
                onClick={() => setActiveTab("frequencies")}
                className={`py-4 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === "frequencies"
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
                }`}
              >
                <HeroIcon icon={ClockIcon} size="sm" />
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
      </main>

      {/* Enhanced Back to Dashboard Button */}
      <div className="fixed bottom-6 left-6 hidden lg:block">
        <button
          onClick={() => (window.location.href = "/")}
          className="w-12 h-12 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex items-center justify-center"
        >
          <HeroIcon icon={ArrowLeftIcon} size="lg" />
        </button>
      </div>
    </div>
  );
};

// Enhanced Route Management Component
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
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
          <HeroIcon icon={MapPinIcon} size="lg" color="primary" />
        </div>
        <div>
          <h2 className="text-heading-4 text-neutral-900 dark:text-neutral-100">
            Route Management
          </h2>
          <p className="text-body-small text-neutral-600 dark:text-neutral-400">
            Manage medication administration routes (oral, inhale, subcutaneous,
            etc.)
          </p>
        </div>
      </div>

      {/* Enhanced Route Form */}
      <form
        onSubmit={onSubmit}
        className="mb-8 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-600"
      >
        <div className="flex items-center gap-3 mb-6">
          <HeroIcon
            icon={editingRoute ? PencilIcon : PlusIcon}
            size="md"
            color="primary"
          />
          <h3 className="text-heading-5 text-neutral-900 dark:text-neutral-100">
            {editingRoute ? "Edit Route" : "Add New Route"}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Route Name"
            required
            value={routeForm.name}
            onChange={(e) =>
              setRouteForm({ ...routeForm, name: e.target.value })
            }
            placeholder="e.g., Oral, Inhale, Subcutaneous"
            error={routeFormErrors.name}
          />

          <Input
            label="Description"
            value={routeForm.description}
            onChange={(e) =>
              setRouteForm({ ...routeForm, description: e.target.value })
            }
            placeholder="Optional description"
            error={routeFormErrors.description}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {editingRoute && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              <HeroIcon icon={XMarkIcon} size="sm" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={savingRoute}
            disabled={savingRoute}
          >
            <HeroIcon
              icon={editingRoute ? CheckCircleIcon : PlusIcon}
              size="sm"
            />
            {editingRoute ? "Update Route" : "Add Route"}
          </Button>
        </div>
      </form>

      {/* Enhanced Routes List */}
      <div>
        <h3 className="text-heading-5 text-neutral-900 dark:text-neutral-100 mb-4">
          Existing Routes ({routes.length})
        </h3>

        <div className="space-y-4">
          {routes.length > 0 ? (
            routes.map((route) => (
              <div
                key={route.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HeroIcon icon={MapPinIcon} size="sm" color="primary" />
                      </div>
                      <h4 className="text-heading-6 text-neutral-900 dark:text-neutral-100 truncate">
                        {route.name}
                      </h4>
                    </div>
                    {route.description && (
                      <p className="text-body-small text-neutral-600 dark:text-neutral-400 mb-3 ml-11">
                        {route.description}
                      </p>
                    )}
                    <p className="text-caption text-neutral-500 dark:text-neutral-500 ml-11">
                      Created: {new Date(route.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(route)}
                    >
                      <HeroIcon icon={PencilIcon} size="sm" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(route)}
                      className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <HeroIcon icon={TrashIcon} size="sm" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeroIcon icon={MapPinIcon} size="xl" color="muted" />
              </div>
              <h4 className="text-heading-6 text-neutral-900 dark:text-neutral-100 mb-2">
                No routes configured yet
              </h4>
              <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                Add your first route using the form above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Frequency Management Component
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
      {/* Section Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
          <HeroIcon icon={ClockIcon} size="lg" color="primary" />
        </div>
        <div>
          <h2 className="text-heading-4 text-neutral-900 dark:text-neutral-100">
            Frequency Management
          </h2>
          <p className="text-body-small text-neutral-600 dark:text-neutral-400">
            Manage medication frequency presets (daily, twice daily, as needed,
            etc.)
          </p>
        </div>
      </div>

      {/* Enhanced Frequency Form */}
      <form
        onSubmit={onSubmit}
        className="mb-8 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl p-6 border border-neutral-200 dark:border-neutral-600"
      >
        <div className="flex items-center gap-3 mb-6">
          <HeroIcon
            icon={editingFrequency ? PencilIcon : PlusIcon}
            size="md"
            color="primary"
          />
          <h3 className="text-heading-5 text-neutral-900 dark:text-neutral-100">
            {editingFrequency ? "Edit Frequency" : "Add New Frequency"}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Frequency Name"
            required
            value={frequencyForm.name}
            onChange={(e) =>
              setFrequencyForm({ ...frequencyForm, name: e.target.value })
            }
            placeholder="e.g., Daily, Twice Daily, As Needed"
            error={frequencyFormErrors.name}
          />

          <Input
            label="Description"
            value={frequencyForm.description}
            onChange={(e) =>
              setFrequencyForm({
                ...frequencyForm,
                description: e.target.value,
              })
            }
            placeholder="Optional description"
            error={frequencyFormErrors.description}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          {editingFrequency && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              <HeroIcon icon={XMarkIcon} size="sm" />
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={savingFrequency}
            disabled={savingFrequency}
          >
            <HeroIcon
              icon={editingFrequency ? CheckCircleIcon : PlusIcon}
              size="sm"
            />
            {editingFrequency ? "Update Frequency" : "Add Frequency"}
          </Button>
        </div>
      </form>

      {/* Enhanced Frequencies List */}
      <div>
        <h3 className="text-heading-5 text-neutral-900 dark:text-neutral-100 mb-4">
          Existing Frequencies ({frequencies.length})
        </h3>

        <div className="space-y-4">
          {frequencies.length > 0 ? (
            frequencies.map((frequency) => (
              <div
                key={frequency.id}
                className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HeroIcon icon={ClockIcon} size="sm" color="primary" />
                      </div>
                      <h4 className="text-heading-6 text-neutral-900 dark:text-neutral-100 truncate">
                        {frequency.name}
                      </h4>
                    </div>
                    {frequency.description && (
                      <p className="text-body-small text-neutral-600 dark:text-neutral-400 mb-3 ml-11">
                        {frequency.description}
                      </p>
                    )}
                    <p className="text-caption text-neutral-500 dark:text-neutral-500 ml-11">
                      Created:{" "}
                      {new Date(frequency.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(frequency)}
                    >
                      <HeroIcon icon={PencilIcon} size="sm" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(frequency)}
                      className="text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <HeroIcon icon={TrashIcon} size="sm" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeroIcon icon={ClockIcon} size="xl" color="muted" />
              </div>
              <h4 className="text-heading-6 text-neutral-900 dark:text-neutral-100 mb-2">
                No frequencies configured yet
              </h4>
              <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                Add your first frequency using the form above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
