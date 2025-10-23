import { useState, useEffect } from "react";
import {
  CubeIcon,
  PlusIcon,
  MinusIcon,
  ArrowsRightLeftIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";
import Input from "./ui/Input";
import StatusBadge from "./ui/StatusBadge";

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
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 hover:shadow-md transition-all duration-200 card-parallax">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-xl">
            <HeroIcon
              icon={CubeIcon}
              size="md"
              className="text-success-600 dark:text-success-400"
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Inventory Tracker
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Manage medication stock levels
            </p>
          </div>
        </div>

        {showConversion && (
          <div className="flex bg-neutral-100 dark:bg-neutral-700 rounded-xl p-1 border border-neutral-200 dark:border-neutral-600">
            <Button
              type="button"
              variant={inputMode === "tablets" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handleInputModeChange("tablets")}
              className={`rounded-lg transition-all duration-200 ${
                inputMode === "tablets"
                  ? "shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <HeroIcon icon={CubeIcon} size="sm" className="mr-1" />
              Tablets
            </Button>
            <Button
              type="button"
              variant={inputMode === "sheets" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handleInputModeChange("sheets")}
              className={`rounded-lg transition-all duration-200 ${
                inputMode === "sheets"
                  ? "shadow-sm"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              <HeroIcon icon={ArrowsRightLeftIcon} size="sm" className="mr-1" />
              Sheets
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {inputMode === "tablets" ? (
          /* Enhanced Tablets Input Mode */
          <div className="space-y-4">
            <Input
              label="Total Tablets"
              type="number"
              step="0.5"
              min="0"
              value={formData.totalTablets}
              onChange={(e) => handleChange("totalTablets", e.target.value)}
              disabled={disabled}
              error={errors.totalTablets || totalTabletsError}
              placeholder="Enter total number of tablets"
              leftIcon={<HeroIcon icon={CubeIcon} size="sm" />}
            />

            {showConversion && parseInt(formData.sheetSize) > 0 && (
              <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <HeroIcon
                    icon={ArrowsRightLeftIcon}
                    size="sm"
                    className="text-info-600 dark:text-info-400"
                  />
                  <p className="text-sm text-info-700 dark:text-info-300 font-medium">
                    Equivalent: {currentEquivalent.sheets} sheet(s)
                    {currentEquivalent.remainder > 0 &&
                      ` + ${currentEquivalent.remainder} tablet(s)`}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Enhanced Sheets Input Mode */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Number of Sheets"
                type="number"
                min="0"
                value={formData.sheetCount}
                onChange={(e) => handleChange("sheetCount", e.target.value)}
                disabled={disabled}
                error={errors.sheetCount}
                placeholder="0"
                leftIcon={<HeroIcon icon={ArrowsRightLeftIcon} size="sm" />}
              />

              <Input
                label="Tablets per Sheet"
                type="number"
                min="1"
                value={formData.sheetSize}
                onChange={(e) => handleChange("sheetSize", e.target.value)}
                disabled={disabled}
                error={errors.sheetSize || sheetSizeError}
                placeholder="10"
                leftIcon={<HeroIcon icon={CubeIcon} size="sm" />}
              />
            </div>

            <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <HeroIcon
                  icon={CheckCircleIcon}
                  size="md"
                  className="text-success-600 dark:text-success-400"
                />
                <div>
                  <p className="text-sm font-semibold text-success-800 dark:text-success-200">
                    Total Tablets Calculated
                  </p>
                  <p className="text-lg font-bold text-success-900 dark:text-success-100">
                    {formData.totalTablets || 0} tablets
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Current Inventory Display */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <HeroIcon
              icon={CubeIcon}
              size="sm"
              className="text-neutral-600 dark:text-neutral-400"
            />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Current Inventory
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Total Tablets
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {totalTablets}
              </p>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Sheet Equivalent
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {Math.floor(totalTablets / sheetSize)}
              </p>
              {totalTablets % sheetSize > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  + {totalTablets % sheetSize} tablets
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Update Button */}
        {hasChanges() && (
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={disabled || Object.keys(errors).length > 0}
              className="w-full success-celebration"
            >
              <HeroIcon icon={CheckCircleIcon} size="sm" className="mr-2" />
              Update Inventory
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Quick Actions */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-6 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <HeroIcon
            icon={ArrowsRightLeftIcon}
            size="sm"
            className="text-neutral-600 dark:text-neutral-400"
          />
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Quick Actions
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
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
            className="border-success-300 text-success-700 hover:bg-success-50 dark:border-success-700 dark:text-success-300 dark:hover:bg-success-900/30"
          >
            <HeroIcon icon={PlusIcon} size="sm" className="mr-2" />
            +1 Sheet
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
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
            className="border-error-300 text-error-700 hover:bg-error-50 dark:border-error-700 dark:text-error-300 dark:hover:bg-error-900/30"
          >
            <HeroIcon icon={MinusIcon} size="sm" className="mr-2" />
            -1 Sheet
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventoryTracker;
