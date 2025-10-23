import { useState, useEffect } from "react";
import {
  BeakerIcon,
  CalendarDaysIcon,
  ClockIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";
import Input from "./ui/Input";
import StatusBadge from "./ui/StatusBadge";
import DoseForm from "./DoseForm";
import SkipDateCalendar from "./SkipDateCalendar";
import InventoryTracker from "./InventoryTracker";
import DatePicker from "./DatePicker";

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
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="loading-spinner w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading form data...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-8 stagger-container">
        {error && (
          <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-xl p-4 animate-slide-down">
            <div className="flex items-start space-x-3">
              <HeroIcon
                icon={ExclamationCircleIcon}
                size="md"
                className="text-error-500 mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-error-800 dark:text-error-200">
                  Error Saving Medication
                </h4>
                <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                  {error}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError("")}
                className="text-error-500 hover:text-error-700 hover:bg-error-100 dark:hover:bg-error-900/30"
              >
                <HeroIcon icon={XMarkIcon} size="sm" />
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Basic Information */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-all duration-200 card-parallax stagger-item">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <HeroIcon
                icon={BeakerIcon}
                size="md"
                className="text-primary-600 dark:text-primary-400"
              />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Basic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Medication Name"
              required
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              error={validationErrors.name}
              placeholder="Enter medication name"
              leftIcon={<HeroIcon icon={BeakerIcon} size="sm" />}
            />

            <Input
              label="Strength"
              value={formData.strength}
              onChange={(e) => handleFieldChange("strength", e.target.value)}
              placeholder="e.g., 100mg, 5ml"
            />

            <div className="form-field">
              <label className="form-label">Route *</label>
              <select
                value={formData.route_id}
                onChange={(e) => handleFieldChange("route_id", e.target.value)}
                className={`form-input-base form-input-animated form-input-md w-full ${
                  validationErrors.route_id
                    ? "form-input-error form-error-animated"
                    : ""
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
                <div className="form-message form-error form-message-animated animate-error">
                  <HeroIcon
                    icon={ExclamationCircleIcon}
                    size="sm"
                    className="text-error-600 flex-shrink-0"
                  />
                  <span>{validationErrors.route_id}</span>
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Frequency *</label>
              <select
                value={formData.frequency_id}
                onChange={(e) =>
                  handleFieldChange("frequency_id", e.target.value)
                }
                className={`form-input-base form-input-animated form-input-md w-full ${
                  validationErrors.frequency_id
                    ? "form-input-error form-error-animated"
                    : ""
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
                <div className="form-message form-error form-message-animated animate-error">
                  <HeroIcon
                    icon={ExclamationCircleIcon}
                    size="sm"
                    className="text-error-600 flex-shrink-0"
                  />
                  <span>{validationErrors.frequency_id}</span>
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Start Date *</label>
              <div className="form-input-container form-field-animated">
                <div className="form-input-icon form-input-icon-left">
                  <HeroIcon
                    icon={CalendarDaysIcon}
                    size="sm"
                    className="text-neutral-400"
                  />
                </div>
                <DatePicker
                  value={formData.start_date}
                  onChange={(date) => handleFieldChange("start_date", date)}
                  className={`form-input-base form-input-animated form-input-md form-input-with-icon ${
                    validationErrors.start_date
                      ? "form-input-error form-error-animated"
                      : ""
                  }`}
                />
              </div>
              {validationErrors.start_date && (
                <div className="form-message form-error form-message-animated animate-error">
                  <HeroIcon
                    icon={ExclamationCircleIcon}
                    size="sm"
                    className="text-error-600 flex-shrink-0"
                  />
                  <span>{validationErrors.start_date}</span>
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">End Date (Optional)</label>
              <div className="form-input-container form-field-animated">
                <div className="form-input-icon form-input-icon-left">
                  <HeroIcon
                    icon={CalendarDaysIcon}
                    size="sm"
                    className="text-neutral-400"
                  />
                </div>
                <DatePicker
                  value={formData.end_date}
                  onChange={(date) => handleFieldChange("end_date", date)}
                  placeholder="Leave empty for ongoing"
                  className={`form-input-base form-input-animated form-input-md form-input-with-icon ${
                    validationErrors.end_date
                      ? "form-input-error form-error-animated"
                      : ""
                  }`}
                />
              </div>
              {validationErrors.end_date && (
                <div className="form-message form-error form-message-animated animate-error">
                  <HeroIcon
                    icon={ExclamationCircleIcon}
                    size="sm"
                    className="text-error-600 flex-shrink-0"
                  />
                  <span>{validationErrors.end_date}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="form-field">
              <label className="form-label">Notes</label>
              <div className="form-input-container form-field-animated">
                <div
                  className="form-input-icon form-input-icon-left"
                  style={{ top: "12px" }}
                >
                  <HeroIcon
                    icon={DocumentTextIcon}
                    size="sm"
                    className="text-neutral-400"
                  />
                </div>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleFieldChange("notes", e.target.value)}
                  className="form-input-base form-input-animated form-input-md form-input-with-icon w-full resize-none"
                  placeholder="Additional notes or instructions"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Dose Management */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-all duration-200 card-parallax stagger-item">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-info-100 dark:bg-info-900/30 rounded-xl">
              <HeroIcon
                icon={ClockIcon}
                size="md"
                className="text-info-600 dark:text-info-400"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Dose Schedule
              </h3>
              <StatusBadge
                status="info"
                size="sm"
                variant="soft"
                className="mt-1"
              >
                Required
              </StatusBadge>
            </div>
          </div>

          <DoseForm
            doses={doses}
            onChange={handleDosesChange}
            routes={routes}
            error={validationErrors.doses}
          />
        </div>

        {/* Enhanced Skip Dates */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-all duration-200 card-parallax stagger-item">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-xl">
              <HeroIcon
                icon={CalendarDaysIcon}
                size="md"
                className="text-warning-600 dark:text-warning-400"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Skip Dates
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Select dates when medication should be skipped
              </p>
            </div>
          </div>

          <SkipDateCalendar
            selectedDates={skipDates}
            onChange={handleSkipDatesChange}
            startDate={formData.start_date}
            endDate={formData.end_date}
          />

          {/* Enhanced Duration Display */}
          {formData.start_date && (
            <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Schedule Summary
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                    Total Days
                  </p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {formData.end_date
                      ? Math.ceil(
                          (new Date(formData.end_date) -
                            new Date(formData.start_date)) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      : "Ongoing"}
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                    Skip Days
                  </p>
                  <p className="text-lg font-bold text-warning-600 dark:text-warning-400">
                    {skipDates.length}
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                    Active Days
                  </p>
                  <p className="text-lg font-bold text-success-600 dark:text-success-400">
                    {formData.end_date ? calculateActiveDays() : "Ongoing"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Inventory Management */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-md transition-all duration-200 card-parallax stagger-item">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-xl">
              <HeroIcon
                icon={CubeIcon}
                size="md"
                className="text-success-600 dark:text-success-400"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                Inventory Management
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Track medication stock and sheet sizes
              </p>
            </div>
          </div>

          <InventoryTracker
            sheetSize={formData.sheet_size}
            totalTablets={formData.total_tablets}
            onChange={handleInventoryChange}
            sheetSizeError={validationErrors.sheet_size}
            totalTabletsError={validationErrors.total_tablets}
          />
        </div>

        {/* Enhanced Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-neutral-200 dark:border-neutral-700 stagger-item">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onCancel}
            disabled={isSubmitting}
            className="sm:order-1"
          >
            <HeroIcon icon={XMarkIcon} size="sm" className="mr-2" />
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="sm:order-2"
          >
            <HeroIcon icon={CheckCircleIcon} size="sm" className="mr-2" />
            {isSubmitting
              ? "Saving..."
              : medication
              ? "Update Medication"
              : "Create Medication"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MedicationForm;
