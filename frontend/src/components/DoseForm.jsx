import { useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";

const DoseForm = ({ doses = [], onChange, routes = [], error = null }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  // Add new dose
  const addDose = () => {
    const newDose = {
      id: Date.now(), // Temporary ID for new doses
      dose_amount: 1,
      time_of_day: "08:00",
      route_override: "",
      instructions: "",
    };

    onChange([...doses, newDose]);
    setEditingIndex(doses.length);
  };

  // Update dose
  const updateDose = (index, updatedDose) => {
    const newDoses = [...doses];
    newDoses[index] = { ...newDoses[index], ...updatedDose };
    onChange(newDoses);
  };

  // Remove dose
  const removeDose = (index) => {
    const newDoses = doses.filter((_, i) => i !== index);
    onChange(newDoses);
    setEditingIndex(null);
  };

  // Format time for display
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Sort doses by time
  const sortedDoses = [...doses].sort((a, b) => {
    return a.time_of_day.localeCompare(b.time_of_day);
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="form-message form-error">
          <HeroIcon
            icon={XMarkIcon}
            size="sm"
            className="text-error-600 flex-shrink-0"
          />
          <span>{error}</span>
        </div>
      )}

      {/* Enhanced Existing Doses */}
      {sortedDoses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
            <HeroIcon
              icon={ClockIcon}
              size="md"
              className="mr-2 text-primary-600"
            />
            Dose Schedule ({sortedDoses.length})
          </h3>
          <div className="space-y-3">
            {sortedDoses.map((dose, originalIndex) => {
              const actualIndex = doses.findIndex((d) => d === dose);
              const isEditing = editingIndex === actualIndex;

              return (
                <div
                  key={dose.id || actualIndex}
                  className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 hover:shadow-md transition-all duration-200 card-parallax interactive-enhanced"
                >
                  {isEditing ? (
                    <DoseEditor
                      dose={dose}
                      routes={routes}
                      onSave={(updatedDose) => {
                        updateDose(actualIndex, updatedDose);
                        setEditingIndex(null);
                      }}
                      onCancel={() => setEditingIndex(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center space-x-2">
                            <HeroIcon
                              icon={ClockIcon}
                              size="sm"
                              className="text-primary-600"
                            />
                            <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                              {formatTimeForDisplay(dose.time_of_day)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="bg-neutral-100 dark:bg-neutral-700 px-3 py-1 rounded-full">
                              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {dose.dose_amount} tablet
                                {dose.dose_amount !== 1 ? "s" : ""}
                              </span>
                            </div>
                            {dose.route_override && (
                              <div className="bg-primary-100 dark:bg-primary-900/30 px-3 py-1 rounded-full border border-primary-200 dark:border-primary-800">
                                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                                  {routes.find(
                                    (r) => r.id == dose.route_override
                                  )?.name || "Custom Route"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {dose.instructions && (
                          <div className="mt-3 p-3 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg">
                            <p className="text-sm text-info-700 dark:text-info-300 italic">
                              {dose.instructions}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingIndex(actualIndex)}
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                        >
                          <HeroIcon icon={PencilIcon} size="sm" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDose(actualIndex)}
                          className="text-error-600 hover:text-error-700 hover:bg-error-50"
                        >
                          <HeroIcon icon={TrashIcon} size="sm" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Add Dose Button */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={addDose}
        className="w-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
      >
        <HeroIcon icon={PlusIcon} size="md" className="mr-2" />
        Add Dose Time
      </Button>

      {/* Enhanced empty state */}
      {doses.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <HeroIcon icon={ClockIcon} size="xl" className="text-neutral-400" />
          </div>
          <h4 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            No doses scheduled
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Add dose times to create a medication schedule
          </p>
        </div>
      )}
    </div>
  );
};

// Individual dose editor component
const DoseEditor = ({ dose, routes, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    dose_amount: dose.dose_amount || 1,
    time_of_day: dose.time_of_day || "08:00",
    route_override: dose.route_override || "",
    instructions: dose.instructions || "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.dose_amount || parseFloat(formData.dose_amount) <= 0) {
      newErrors.dose_amount = "Dose amount must be greater than 0";
    }

    if (!formData.time_of_day) {
      newErrors.time_of_day = "Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      ...formData,
      dose_amount: parseFloat(formData.dose_amount),
      route_override: formData.route_override || null,
    });
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-neutral-50 dark:bg-neutral-700/50 p-6 rounded-xl border border-neutral-200 dark:border-neutral-600"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Dose Amount */}
        <div className="form-field">
          <label className="form-label">Dose Amount (tablets) *</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={formData.dose_amount}
            onChange={(e) => handleChange("dose_amount", e.target.value)}
            className={`form-input-base form-input-animated form-input-md w-full ${
              errors.dose_amount ? "form-input-error form-error-animated" : ""
            }`}
            placeholder="e.g., 1, 0.5, 2"
          />
          {errors.dose_amount && (
            <div className="form-message form-error form-message-animated animate-error">
              <HeroIcon
                icon={XMarkIcon}
                size="sm"
                className="text-error-600 flex-shrink-0"
              />
              <span>{errors.dose_amount}</span>
            </div>
          )}
        </div>

        {/* Enhanced Time of Day */}
        <div className="form-field">
          <label className="form-label">Time of Day *</label>
          <div className="flex gap-3">
            <input
              type="time"
              value={formData.time_of_day}
              onChange={(e) => handleChange("time_of_day", e.target.value)}
              className={`form-input-base form-input-animated form-input-md flex-1 ${
                errors.time_of_day ? "form-input-error form-error-animated" : ""
              }`}
            />
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => handleChange("time_of_day", getCurrentTime())}
            >
              <HeroIcon icon={ClockIcon} size="sm" className="mr-1" />
              Now
            </Button>
          </div>
          {errors.time_of_day && (
            <div className="form-message form-error form-message-animated animate-error">
              <HeroIcon
                icon={XMarkIcon}
                size="sm"
                className="text-error-600 flex-shrink-0"
              />
              <span>{errors.time_of_day}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Route Override */}
      {routes.length > 0 && (
        <div className="form-field">
          <label className="form-label">Route Override</label>
          <select
            value={formData.route_override}
            onChange={(e) => handleChange("route_override", e.target.value)}
            className="form-input-base form-input-animated form-input-md w-full"
          >
            <option value="">Use medication default</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Enhanced Instructions */}
      <div className="form-field">
        <label className="form-label">Special Instructions</label>
        <textarea
          rows={3}
          value={formData.instructions}
          onChange={(e) => handleChange("instructions", e.target.value)}
          className="form-input-base form-input-animated form-input-md w-full resize-none"
          placeholder="e.g., Take with food, Before meals, etc."
        />
      </div>

      {/* Enhanced Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-600">
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="flex-1 sm:flex-none"
        >
          <HeroIcon icon={CheckIcon} size="sm" className="mr-2" />
          Save Dose
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          <HeroIcon icon={XMarkIcon} size="sm" className="mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default DoseForm;
