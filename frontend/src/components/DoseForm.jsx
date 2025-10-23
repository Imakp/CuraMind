import { useState } from "react";

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
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Existing Doses */}
      {sortedDoses.length > 0 && (
        <div className="space-y-3">
          {sortedDoses.map((dose, originalIndex) => {
            const actualIndex = doses.findIndex((d) => d === dose);
            const isEditing = editingIndex === actualIndex;

            return (
              <div
                key={dose.id || actualIndex}
                className="border border-gray-200 rounded-md p-4"
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
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatTimeForDisplay(dose.time_of_day)}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">
                            {dose.dose_amount} tablet
                            {dose.dose_amount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {dose.route_override && (
                          <div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {routes.find((r) => r.id == dose.route_override)
                                ?.name || "Custom Route"}
                            </span>
                          </div>
                        )}
                      </div>
                      {dose.instructions && (
                        <p className="mt-1 text-sm text-gray-500">
                          {dose.instructions}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(actualIndex)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDose(actualIndex)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dose Button */}
      <button
        type="button"
        onClick={addDose}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <svg
          className="w-5 h-5 inline-block mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Dose Time
      </button>

      {doses.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No doses added yet. Click "Add Dose Time" to get started.
        </p>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dose Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dose Amount (tablets) *
          </label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={formData.dose_amount}
            onChange={(e) => handleChange("dose_amount", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.dose_amount ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="e.g., 1, 0.5, 2"
          />
          {errors.dose_amount && (
            <p className="mt-1 text-sm text-red-600">{errors.dose_amount}</p>
          )}
        </div>

        {/* Time of Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time of Day *
          </label>
          <div className="flex gap-2">
            <input
              type="time"
              value={formData.time_of_day}
              onChange={(e) => handleChange("time_of_day", e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.time_of_day ? "border-red-300" : "border-gray-300"
              }`}
            />
            <button
              type="button"
              onClick={() => handleChange("time_of_day", getCurrentTime())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Now
            </button>
          </div>
          {errors.time_of_day && (
            <p className="mt-1 text-sm text-red-600">{errors.time_of_day}</p>
          )}
        </div>
      </div>

      {/* Route Override */}
      {routes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Route Override
          </label>
          <select
            value={formData.route_override}
            onChange={(e) => handleChange("route_override", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Instructions
        </label>
        <textarea
          rows={2}
          value={formData.instructions}
          onChange={(e) => handleChange("instructions", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Take with food, Before meals, etc."
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Dose
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default DoseForm;
