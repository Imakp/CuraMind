import { useState, useEffect } from "react";
import DoseForm from "./DoseForm";
import SkipDateCalendar from "./SkipDateCalendar";
import InventoryTracker from "./InventoryTracker";
import DatePicker from "./DatePicker";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";

const MedicationForm = ({
  medication = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    strength: "",
    route_id: "",
    frequency_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    sheet_size: 10,
    total_tablets: 0,
    notes: "",
  });

  const [doses, setDoses] = useState([]);
  const [skipDates, setSkipDates] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Load form data when medication prop changes
  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name || "",
        strength: medication.strength || "",
        route_id: medication.route_id || "",
        frequency_id: medication.frequency_id || "",
        start_date:
          medication.start_date || new Date().toISOString().split("T")[0],
        end_date: medication.end_date || "",
        sheet_size: medication.sheet_size || 10,
        total_tablets: medication.total_tablets || 0,
        notes: medication.notes || "",
      });

      if (medication.doses) {
        setDoses(medication.doses);
      }

      if (medication.skip_dates) {
        setSkipDates(medication.skip_dates.map((sd) => sd.skip_date));
      }
    }
  }, [medication]);

  // Fetch master data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setLoading(true);
        setError("");

        const [routesResponse, frequenciesResponse] = await Promise.all([
          fetch("/api/settings/routes"),
          fetch("/api/settings/frequencies"),
        ]);

        if (routesResponse.ok) {
          const routesResult = await routesResponse.json();
          setRoutes(routesResult.data || []);
        }

        if (frequenciesResponse.ok) {
          const frequenciesResult = await frequenciesResponse.json();
          setFrequencies(frequenciesResult.data || []);
        }
      } catch (err) {
        console.error("Error fetching master data:", err);
        setError("Failed to load form data. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchMasterData();
  }, []);

  // Handle form field changes
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  // Handle dose changes
  const handleDosesChange = (newDoses) => {
    setDoses(newDoses);

    // Clear dose validation errors
    if (validationErrors.doses) {
      setValidationErrors((prev) => ({
        ...prev,
        doses: null,
      }));
    }
  };

  // Handle skip dates changes
  const handleSkipDatesChange = (newSkipDates) => {
    setSkipDates(newSkipDates);
  };

  // Handle inventory changes
  const handleInventoryChange = (inventoryData) => {
    setFormData((prev) => ({
      ...prev,
      sheet_size: inventoryData.sheet_size,
      total_tablets: inventoryData.total_tablets,
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!formData.name.trim()) {
      errors.name = "Medication name is required";
    }

    if (!formData.route_id) {
      errors.route_id = "Route is required";
    }

    if (!formData.frequency_id) {
      errors.frequency_id = "Frequency is required";
    }

    if (!formData.start_date) {
      errors.start_date = "Start date is required";
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        errors.end_date = "End date must be after start date";
      }
    }

    // Dose validation
    if (doses.length === 0) {
      errors.doses = "At least one dose is required";
    } else {
      // Validate individual doses
      const doseErrors = doses.some(
        (dose) =>
          !dose.time_of_day ||
          !dose.dose_amount ||
          parseFloat(dose.dose_amount) <= 0
      );

      if (doseErrors) {
        errors.doses = "All doses must have valid time and amount";
      }
    }

    // Inventory validation
    if (formData.sheet_size <= 0) {
      errors.sheet_size = "Sheet size must be greater than 0";
    }

    if (formData.total_tablets < 0) {
      errors.total_tablets = "Total tablets cannot be negative";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      doses: doses.map((dose) => ({
        ...dose,
        dose_amount: parseFloat(dose.dose_amount),
      })),
      skip_dates: skipDates.map((date) => ({ skip_date: date })),
      sheet_size: parseInt(formData.sheet_size),
      total_tablets: parseFloat(formData.total_tablets),
    };

    try {
      await onSubmit(submitData);
    } catch (err) {
      setError(err.message || "Failed to save medication");
    }
  };

  // Calculate active days
  const calculateActiveDays = () => {
    if (!formData.start_date) return 0;

    const startDate = new Date(formData.start_date);
    const endDate = formData.end_date
      ? new Date(formData.end_date)
      : new Date();

    const totalDays =
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const activeDays = Math.max(0, totalDays - skipDates.length);

    return activeDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError("")} />
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Medication Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter medication name"
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="strength"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Strength
              </label>
              <input
                type="text"
                id="strength"
                value={formData.strength}
                onChange={(e) => handleFieldChange("strength", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100mg, 5ml"
              />
            </div>

            <div>
              <label
                htmlFor="route_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Route *
              </label>
              <select
                id="route_id"
                value={formData.route_id}
                onChange={(e) => handleFieldChange("route_id", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.route_id
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              >
                <option value="">Select route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name}
                  </option>
                ))}
              </select>
              {validationErrors.route_id && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.route_id}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="frequency_id"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Frequency *
              </label>
              <select
                id="frequency_id"
                value={formData.frequency_id}
                onChange={(e) =>
                  handleFieldChange("frequency_id", e.target.value)
                }
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.frequency_id
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              >
                <option value="">Select frequency</option>
                {frequencies.map((frequency) => (
                  <option key={frequency.id} value={frequency.id}>
                    {frequency.name}
                  </option>
                ))}
              </select>
              {validationErrors.frequency_id && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.frequency_id}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Start Date *
              </label>
              <DatePicker
                value={formData.start_date}
                onChange={(date) => handleFieldChange("start_date", date)}
                className={validationErrors.start_date ? "border-red-300" : ""}
              />
              {validationErrors.start_date && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.start_date}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="end_date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                End Date (Optional)
              </label>
              <DatePicker
                value={formData.end_date}
                onChange={(date) => handleFieldChange("end_date", date)}
                placeholder="Leave empty for ongoing"
                className={validationErrors.end_date ? "border-red-300" : ""}
              />
              {validationErrors.end_date && (
                <p className="mt-1 text-sm text-red-600">
                  {validationErrors.end_date}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes or instructions"
            />
          </div>
        </div>

        {/* Dose Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Dose Schedule *
          </h3>

          <DoseForm
            doses={doses}
            onChange={handleDosesChange}
            routes={routes}
            error={validationErrors.doses}
          />
        </div>

        {/* Skip Dates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Skip Dates</h3>

          <SkipDateCalendar
            selectedDates={skipDates}
            onChange={handleSkipDatesChange}
            startDate={formData.start_date}
            endDate={formData.end_date}
          />

          {/* Duration Display */}
          {formData.start_date && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Days:</span>
                  <p className="font-medium text-gray-900">
                    {formData.end_date
                      ? Math.ceil(
                          (new Date(formData.end_date) -
                            new Date(formData.start_date)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      : "Ongoing"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Skip Days:</span>
                  <p className="font-medium text-gray-900">
                    {skipDates.length}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Active Days:</span>
                  <p className="font-medium text-gray-900">
                    {formData.end_date ? calculateActiveDays() : "Ongoing"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Management */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Inventory Management
          </h3>

          <InventoryTracker
            sheetSize={formData.sheet_size}
            totalTablets={formData.total_tablets}
            onChange={handleInventoryChange}
            sheetSizeError={validationErrors.sheet_size}
            totalTabletsError={validationErrors.total_tablets}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Saving..."
              : medication
              ? "Update Medication"
              : "Create Medication"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MedicationForm;
