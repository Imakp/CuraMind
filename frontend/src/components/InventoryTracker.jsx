import { useState, useEffect } from "react";

const InventoryTracker = ({
  totalTablets = 0,
  sheetSize = 10,
  onChange,
  onInventoryChange, // Legacy prop for backward compatibility
  disabled = false,
  showConversion = true,
  sheetSizeError = null,
  totalTabletsError = null,
}) => {
  const [inputMode, setInputMode] = useState("tablets"); // 'tablets' or 'sheets'
  const [formData, setFormData] = useState({
    totalTablets: "",
    sheetCount: "",
    sheetSize: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData({
      totalTablets: totalTablets.toString(),
      sheetCount:
        sheetSize > 0 ? Math.floor(totalTablets / sheetSize).toString() : "0",
      sheetSize: sheetSize.toString(),
    });
  }, [totalTablets, sheetSize]);

  const validateForm = () => {
    const newErrors = {};

    if (inputMode === "tablets") {
      if (!formData.totalTablets || parseFloat(formData.totalTablets) < 0) {
        newErrors.totalTablets = "Total tablets must be 0 or greater";
      }
    } else {
      if (!formData.sheetCount || parseInt(formData.sheetCount) < 0) {
        newErrors.sheetCount = "Sheet count must be 0 or greater";
      }
      if (!formData.sheetSize || parseInt(formData.sheetSize) <= 0) {
        newErrors.sheetSize = "Sheet size must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputModeChange = (mode) => {
    setInputMode(mode);
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Auto-calculate when in sheets mode
    if (field === "sheetCount" || field === "sheetSize") {
      const sheets =
        field === "sheetCount"
          ? parseInt(value) || 0
          : parseInt(formData.sheetCount) || 0;
      const size =
        field === "sheetSize"
          ? parseInt(value) || 0
          : parseInt(formData.sheetSize) || 0;

      if (sheets >= 0 && size > 0) {
        const calculatedTablets = sheets * size;
        setFormData((prev) => ({
          ...prev,
          totalTablets: calculatedTablets.toString(),
        }));
      }
    }

    // Validate on change for immediate feedback
    if (
      inputMode === "sheets" &&
      (field === "sheetCount" || field === "sheetSize")
    ) {
      const newErrors = { ...errors };

      if (field === "sheetCount" && (!value || parseInt(value) < 0)) {
        newErrors.sheetCount = "Sheet count must be 0 or greater";
      } else if (field === "sheetCount") {
        delete newErrors.sheetCount;
      }

      if (field === "sheetSize" && (!value || parseInt(value) <= 0)) {
        newErrors.sheetSize = "Sheet size must be greater than 0";
      } else if (field === "sheetSize") {
        delete newErrors.sheetSize;
      }

      setErrors(newErrors);
    }
  };

  const handleSubmit = () => {
    if (!validateForm() || disabled) return;

    const newTotalTablets = parseFloat(formData.totalTablets) || 0;
    const newSheetSize = parseInt(formData.sheetSize) || sheetSize;

    const inventoryData = {
      total_tablets: newTotalTablets,
      sheet_size: newSheetSize,
    };

    // Call the appropriate callback
    if (onChange) {
      onChange(inventoryData);
    } else if (onInventoryChange) {
      onInventoryChange({
        totalTablets: newTotalTablets,
        sheetSize: newSheetSize,
      });
    }
  };

  const calculateSheetEquivalent = (tablets, size) => {
    if (size <= 0) return { sheets: 0, remainder: tablets };
    const sheets = Math.floor(tablets / size);
    const remainder = tablets % size;
    return { sheets, remainder };
  };

  const currentEquivalent = calculateSheetEquivalent(
    parseFloat(formData.totalTablets) || 0,
    parseInt(formData.sheetSize) || sheetSize
  );

  const hasChanges = () => {
    const newTotal = parseFloat(formData.totalTablets) || 0;
    const newSheetSize = parseInt(formData.sheetSize) || sheetSize;
    return newTotal !== totalTablets || newSheetSize !== sheetSize;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Inventory Tracker</h3>

        {showConversion && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => handleInputModeChange("tablets")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                inputMode === "tablets"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tablets
            </button>
            <button
              type="button"
              onClick={() => handleInputModeChange("sheets")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                inputMode === "sheets"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sheets
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {inputMode === "tablets" ? (
          /* Tablets Input Mode */
          <div>
            <label
              htmlFor="totalTablets"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Total Tablets
            </label>
            <input
              type="number"
              id="totalTablets"
              step="0.5"
              min="0"
              value={formData.totalTablets}
              onChange={(e) => handleChange("totalTablets", e.target.value)}
              disabled={disabled}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                errors.totalTablets || totalTabletsError
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
              placeholder="Enter total number of tablets"
            />
            {(errors.totalTablets || totalTabletsError) && (
              <p className="mt-1 text-sm text-red-600">
                {errors.totalTablets || totalTabletsError}
              </p>
            )}

            {showConversion && parseInt(formData.sheetSize) > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Equivalent: {currentEquivalent.sheets} sheet(s)
                {currentEquivalent.remainder > 0 &&
                  ` + ${currentEquivalent.remainder} tablet(s)`}
              </p>
            )}
          </div>
        ) : (
          /* Sheets Input Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="sheetCount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Number of Sheets
                </label>
                <input
                  type="number"
                  id="sheetCount"
                  min="0"
                  value={formData.sheetCount}
                  onChange={(e) => handleChange("sheetCount", e.target.value)}
                  disabled={disabled}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.sheetCount ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0"
                />
                {errors.sheetCount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.sheetCount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="sheetSize"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tablets per Sheet
                </label>
                <input
                  type="number"
                  id="sheetSize"
                  min="1"
                  value={formData.sheetSize}
                  onChange={(e) => handleChange("sheetSize", e.target.value)}
                  disabled={disabled}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 ${
                    errors.sheetSize || sheetSizeError
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                  placeholder="10"
                />
                {(errors.sheetSize || sheetSizeError) && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.sheetSize || sheetSizeError}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Total tablets:</span>{" "}
                {formData.totalTablets || 0}
              </p>
            </div>
          </div>
        )}

        {/* Current Inventory Display */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Current Inventory
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total tablets:</span>
              <p className="font-medium text-gray-900">{totalTablets}</p>
            </div>
            <div>
              <span className="text-gray-600">Sheet equivalent:</span>
              <p className="font-medium text-gray-900">
                {Math.floor(totalTablets / sheetSize)} sheets
                {totalTablets % sheetSize > 0 &&
                  ` + ${totalTablets % sheetSize} tablets`}
              </p>
            </div>
          </div>
        </div>

        {/* Update Button */}
        {hasChanges() && (
          <div className="border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled || Object.keys(errors).length > 0}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                disabled || Object.keys(errors).length > 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              }`}
            >
              Update Inventory
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Quick Actions
        </h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const currentTotal = parseFloat(formData.totalTablets) || 0;
              const newTotal =
                currentTotal +
                (parseInt(formData.sheetSize) || sheetSize || 10);
              setFormData((prev) => ({
                ...prev,
                totalTablets: newTotal.toString(),
                sheetCount: Math.floor(
                  newTotal / (parseInt(formData.sheetSize) || sheetSize)
                ).toString(),
              }));
            }}
            disabled={disabled}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            +1 Sheet
          </button>
          <button
            type="button"
            onClick={() => {
              const currentTotal = parseFloat(formData.totalTablets) || 0;
              const newTotal = Math.max(
                0,
                currentTotal - (parseInt(formData.sheetSize) || sheetSize || 10)
              );
              setFormData((prev) => ({
                ...prev,
                totalTablets: newTotal.toString(),
                sheetCount: Math.floor(
                  newTotal / (parseInt(formData.sheetSize) || sheetSize)
                ).toString(),
              }));
            }}
            disabled={disabled || parseFloat(formData.totalTablets) === 0}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            -1 Sheet
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTracker;
