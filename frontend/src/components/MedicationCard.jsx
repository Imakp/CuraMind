import { useState } from "react";

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
  const actualIsMarking = externalIsMarking || isMarking;

  const handleMarkAsGiven = async () => {
    if (actualIsMarking) return;

    setIsMarking(true);
    try {
      await onMarkAsGiven(
        medication.id,
        doseAmount || medication.defaultDoseAmount
      );
    } finally {
      setIsMarking(false);
    }
  };

  const getInventoryStatus = () => {
    const remaining = medication.total_tablets || 0;
    const dailyConsumption = medication.dailyConsumption || 0;

    if (remaining <= 0) {
      return {
        status: "empty",
        color: "bg-red-100 text-red-800",
        message: "Out of stock",
      };
    } else if (remaining <= dailyConsumption) {
      return {
        status: "critical",
        color: "bg-red-100 text-red-800",
        message: "Buy soon!",
      };
    } else if (remaining <= dailyConsumption * 3) {
      return {
        status: "low",
        color: "bg-yellow-100 text-yellow-800",
        message: "Low stock",
      };
    }
    return {
      status: "good",
      color: "bg-green-100 text-green-800",
      message: "In stock",
    };
  };

  const inventoryStatus = getInventoryStatus();
  const sheetsRemaining = medication.sheet_size
    ? Math.floor(medication.total_tablets / medication.sheet_size)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg transition-shadow">
      {/* Header with medication name and strength */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {medication.name}
          </h3>
          {medication.strength && (
            <p className="text-sm text-gray-600">{medication.strength}</p>
          )}
          {showTime && timeOfDay && (
            <p className="text-sm font-medium text-blue-600 mt-1">
              {timeOfDay}
            </p>
          )}
        </div>

        {/* Inventory status badge */}
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${inventoryStatus.color}`}
        >
          {inventoryStatus.message}
        </span>
      </div>

      {/* Dose information */}
      {(doseAmount || medication.defaultDoseAmount) && (
        <div className="mb-3">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Dose:</span>{" "}
            {doseAmount || medication.defaultDoseAmount} tablet(s)
          </p>
          {medication.route && (
            <p className="text-sm text-gray-700">
              <span className="font-medium">Route:</span> {medication.route}
            </p>
          )}
        </div>
      )}

      {/* Inventory details */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Tablets remaining:</span>
            <p className="font-medium text-gray-900">
              {medication.total_tablets || 0}
            </p>
          </div>
          {medication.sheet_size && (
            <div>
              <span className="text-gray-600">Sheets remaining:</span>
              <p className="font-medium text-gray-900">{sheetsRemaining}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {medication.notes && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 italic">{medication.notes}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {onMarkAsGiven && (doseAmount || medication.defaultDoseAmount) && (
          <button
            onClick={handleMarkAsGiven}
            disabled={actualIsMarking || medication.total_tablets <= 0}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              actualIsMarking || medication.total_tablets <= 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            }`}
          >
            {actualIsMarking ? "Marking..." : "Mark as Given"}
          </button>
        )}

        {onEdit && (
          <button
            onClick={() => onEdit(medication)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Edit
          </button>
        )}

        {showActions && (
          <>
            {onUpdateInventory && (
              <button
                onClick={() => onUpdateInventory(medication.id)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                title="Update Inventory"
              >
                <svg
                  className="w-4 h-4"
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
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => onDelete(medication.id)}
                className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                title="Delete Medication"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </>
        )}
      </div>

      {/* Warning for low/empty inventory */}
      {(inventoryStatus.status === "critical" ||
        inventoryStatus.status === "empty") && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700 font-medium">
            {inventoryStatus.status === "empty"
              ? "This medication is out of stock. Please refill immediately."
              : "This medication is running low. Consider refilling soon."}
          </p>
        </div>
      )}
    </div>
  );
};

export default MedicationCard;
