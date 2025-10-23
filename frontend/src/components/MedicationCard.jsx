import { useState } from "react";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import StatusBadge from "./ui/StatusBadge";
import Button from "./ui/Button";

const MedicationCard = ({
  medication,
  onMarkAsGiven,
  onEdit,
  onDelete,
  onUpdateInventory,
  showTime = false,
  showActions = false,
  doseAmount = null,
  timeOfDay = null,
  isMarking: externalIsMarking = false,
}) => {
  const [isMarking, setIsMarking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const actualIsMarking = externalIsMarking || isMarking;

  const handleMarkAsGiven = async () => {
    if (actualIsMarking) return;

    setIsMarking(true);
    try {
      await onMarkAsGiven(
        medication.id,
        doseAmount || medication.defaultDoseAmount
      );
      // Trigger success animation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1000);
    } finally {
      setIsMarking(false);
    }
  };

  const getInventoryStatus = () => {
    const remaining = medication.total_tablets || 0;
    const dailyConsumption = medication.dailyConsumption || 0;

    if (remaining <= 0) {
      return {
        status: "error",
        message: "Out of stock",
        urgency: "critical",
      };
    } else if (remaining <= dailyConsumption) {
      return {
        status: "error",
        message: "Buy soon!",
        urgency: "critical",
      };
    } else if (remaining <= dailyConsumption * 3) {
      return {
        status: "warning",
        message: "Low stock",
        urgency: "moderate",
      };
    }
    return {
      status: "success",
      message: "In stock",
      urgency: "none",
    };
  };

  const inventoryStatus = getInventoryStatus();
  const sheetsRemaining = medication.sheet_size
    ? Math.floor(medication.total_tablets / medication.sheet_size)
    : 0;

  return (
    <div
      className={`group bg-white dark:bg-neutral-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 ease-out border border-neutral-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-700 overflow-hidden hover-lift-subtle card-parallax interactive-enhanced ${
        showSuccess ? "success-celebration success-glow" : ""
      }`}
    >
      {/* Enhanced Header with improved visual hierarchy */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-200">
              {medication.name}
            </h3>
            {medication.strength && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {medication.strength}
              </p>
            )}
          </div>

          {/* Enhanced status badge with semantic colors */}
          <StatusBadge
            status={inventoryStatus.status}
            size="sm"
            variant="soft"
            className="ml-3 flex-shrink-0"
            aria-label={`Inventory status: ${inventoryStatus.message}`}
          >
            {inventoryStatus.message}
          </StatusBadge>
        </div>

        {/* Enhanced time display with better visual treatment */}
        {showTime && timeOfDay && (
          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium">
            <HeroIcon icon={ClockIcon} size="sm" className="mr-1.5" />
            {timeOfDay}
          </div>
        )}
      </div>

      {/* Enhanced dose information with better typography */}
      {(doseAmount || medication.defaultDoseAmount) && (
        <div className="px-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Dose
              </span>
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {doseAmount || medication.defaultDoseAmount} tablet(s)
              </span>
            </div>
            {medication.route && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  Route
                </span>
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {medication.route}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced inventory section with better visual hierarchy */}
      <div className="px-6 pb-4">
        <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4 border border-neutral-100 dark:border-neutral-600/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                Tablets Remaining
              </p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {medication.total_tablets || 0}
              </p>
            </div>
            {medication.sheet_size && (
              <div className="text-center">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Sheets Remaining
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {sheetsRemaining}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced notes section */}
      {medication.notes && (
        <div className="px-6 pb-4">
          <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <HeroIcon
                icon={InformationCircleIcon}
                size="sm"
                className="text-info-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-sm text-info-700 dark:text-info-300 italic">
                {medication.notes}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced action buttons with smooth micro-interactions */}
      <div className="px-6 pb-6">
        <div className="flex gap-3">
          {onMarkAsGiven && (doseAmount || medication.defaultDoseAmount) && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkAsGiven}
              disabled={actualIsMarking || medication.total_tablets <= 0}
              loading={actualIsMarking}
              className={`flex-1 group-hover:shadow-md transition-shadow duration-200 ${
                showSuccess ? "success-celebration" : ""
              }`}
              aria-label={`Mark ${medication.name} dose as taken`}
            >
              {!actualIsMarking && (
                <HeroIcon icon={CheckIcon} size="sm" className="mr-2" />
              )}
              {actualIsMarking ? "Marking..." : "Mark as Given"}
            </Button>
          )}

          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(medication)}
              className="hover:shadow-md transition-shadow duration-200"
              aria-label={`Edit ${medication.name} medication`}
            >
              <HeroIcon icon={PencilIcon} size="sm" />
            </Button>
          )}

          {showActions && (
            <>
              {onUpdateInventory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUpdateInventory(medication.id)}
                  className="hover:shadow-md transition-shadow duration-200"
                  aria-label={`Update inventory for ${medication.name}`}
                >
                  <HeroIcon icon={PlusIcon} size="sm" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => onDelete(medication.id)}
                  className="hover:shadow-md transition-shadow duration-200"
                  aria-label={`Delete ${medication.name} medication`}
                >
                  <HeroIcon icon={TrashIcon} size="sm" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced warning for low/empty inventory */}
      {inventoryStatus.urgency !== "none" && (
        <div className="px-6 pb-6">
          <div
            className={`rounded-lg p-4 border ${
              inventoryStatus.urgency === "critical"
                ? "bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800"
                : "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800"
            }`}
          >
            <div className="flex items-start space-x-3">
              <HeroIcon
                icon={ExclamationTriangleIcon}
                size="md"
                className={`mt-0.5 flex-shrink-0 ${
                  inventoryStatus.urgency === "critical"
                    ? "text-error-500"
                    : "text-warning-500"
                }`}
              />
              <div className="flex-1">
                <h4
                  className={`text-sm font-semibold ${
                    inventoryStatus.urgency === "critical"
                      ? "text-error-800 dark:text-error-200"
                      : "text-warning-800 dark:text-warning-200"
                  }`}
                >
                  {inventoryStatus.urgency === "critical"
                    ? "Critical Alert"
                    : "Low Stock Warning"}
                </h4>
                <p
                  className={`text-sm mt-1 ${
                    inventoryStatus.urgency === "critical"
                      ? "text-error-700 dark:text-error-300"
                      : "text-warning-700 dark:text-warning-300"
                  }`}
                >
                  {inventoryStatus.urgency === "critical"
                    ? "This medication is out of stock or critically low. Please refill immediately."
                    : "This medication is running low. Consider refilling soon."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationCard;
