import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import SearchFilter from "./SearchFilter";

const AuditLog = ({
  medicationId = null,
  showFilters = true,
  maxHeight = "600px",
}) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: "",
    startDate: "",
    endDate: "",
    quantityFilter: "",
    sortBy: "created_at",
    sortDirection: "desc",
  });
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const actionTypes = [
    { value: "", label: "All Actions" },
    { value: "DOSE_GIVEN", label: "Dose Given" },
    { value: "INVENTORY_UPDATED", label: "Inventory Updated" },
    { value: "CREATED", label: "Created" },
    { value: "UPDATED", label: "Updated" },
    { value: "DELETED", label: "Deleted" },
  ];

  const quantityFilters = [
    { value: "", label: "All Changes" },
    { value: "positive", label: "Inventory Added" },
    { value: "negative", label: "Inventory Consumed" },
    { value: "zero", label: "No Quantity Change" },
  ];

  useEffect(() => {
    fetchAuditLogs();
    if (showStats) {
      fetchStats();
    }
  }, [medicationId, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (medicationId) params.append("medicine_id", medicationId);
      if (filters.action) params.append("action", filters.action);
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      if (filters.quantityFilter)
        params.append("quantity_filter", filters.quantityFilter);
      if (filters.sortBy) params.append("sort_by", filters.sortBy);
      if (filters.sortDirection)
        params.append("sort_direction", filters.sortDirection);
      params.append("limit", "100"); // Limit to 100 recent logs

      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setAuditLogs(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (medicationId) params.append("medicine_id", medicationId);

      const response = await fetch(`/api/audit/stats/summary?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit statistics");
      }

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleExport = async (format = "json") => {
    try {
      const params = new URLSearchParams();
      if (medicationId) params.append("medicine_id", medicationId);
      if (filters.action) params.append("action", filters.action);
      if (filters.startDate) params.append("start_date", filters.startDate);
      if (filters.endDate) params.append("end_date", filters.endDate);
      params.append("format", format);

      const response = await fetch(`/api/audit/export/logs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to export audit logs");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  const clearFilters = () => {
    setFilters({
      action: "",
      startDate: "",
      endDate: "",
      quantityFilter: "",
      sortBy: "created_at",
      sortDirection: "desc",
    });
  };

  const formatActionLabel = (action) => {
    const actionMap = {
      DOSE_GIVEN: "Dose Given",
      INVENTORY_UPDATED: "Inventory Updated",
      CREATED: "Created",
      UPDATED: "Updated",
      DELETED: "Deleted",
    };
    return actionMap[action] || action;
  };

  const formatQuantityChange = (change) => {
    if (!change) return "";
    const value = parseFloat(change);
    if (value > 0) return `+${value}`;
    if (value < 0) return `${value}`;
    return "0";
  };

  const getActionColor = (action) => {
    const colorMap = {
      DOSE_GIVEN: "text-blue-600 bg-blue-50",
      INVENTORY_UPDATED: "text-green-600 bg-green-50",
      CREATED: "text-purple-600 bg-purple-50",
      UPDATED: "text-yellow-600 bg-yellow-50",
      DELETED: "text-red-600 bg-red-50",
    };
    return colorMap[action] || "text-gray-600 bg-gray-50";
  };

  const getQuantityChangeColor = (change) => {
    if (!change) return "text-gray-500";
    const value = parseFloat(change);
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-500";
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {medicationId ? "Medication Audit Log" : "System Audit Log"}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              {showStats ? "Hide Stats" : "Show Stats"}
            </button>
            <button
              onClick={() => handleExport("json")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Export CSV
            </button>
          </div>
        </div>

        {showStats && stats && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Logs:</span>
                <span className="ml-1 font-medium">{stats.total_logs}</span>
              </div>
              <div>
                <span className="text-gray-600">Doses Given:</span>
                <span className="ml-1 font-medium">
                  {stats.dose_given_count}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Inventory Updates:</span>
                <span className="ml-1 font-medium">
                  {stats.inventory_updated_count}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Consumed:</span>
                <span className="ml-1 font-medium text-red-600">
                  {stats.total_quantity_consumed}
                </span>
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {actionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.quantityFilter}
                onChange={(e) =>
                  handleFilterChange("quantityFilter", e.target.value)
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {quantityFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>

              <select
                value={`${filters.sortBy}_${filters.sortDirection}`}
                onChange={(e) => {
                  const [sortBy, sortDirection] = e.target.value.split("_");
                  handleFilterChange("sortBy", sortBy);
                  handleFilterChange("sortDirection", sortDirection);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="action_asc">Action A-Z</option>
                <option value="action_desc">Action Z-A</option>
                <option value="quantity_change_desc">
                  Highest Change First
                </option>
                <option value="quantity_change_asc">Lowest Change First</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                placeholder="Start Date"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                placeholder="End Date"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-auto" style={{ maxHeight }}>
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit logs found matching the current filters.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(
                          log.action
                        )}`}
                      >
                        {formatActionLabel(log.action)}
                      </span>
                      {log.medication_name && (
                        <span className="text-sm text-gray-600">
                          {log.medication_name}
                        </span>
                      )}
                      {log.quantity_change && (
                        <span
                          className={`text-sm font-medium ${getQuantityChangeColor(
                            log.quantity_change
                          )}`}
                        >
                          {formatQuantityChange(log.quantity_change)} tablets
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      {new Date(log.created_at).toLocaleString()}
                    </div>

                    {(log.old_values || log.new_values) && (
                      <div className="text-xs text-gray-500 space-y-1">
                        {log.old_values && (
                          <div>
                            <span className="font-medium">Before:</span>
                            <span className="ml-1">
                              {JSON.stringify(log.old_values)}
                            </span>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <span className="font-medium">After:</span>
                            <span className="ml-1">
                              {JSON.stringify(log.new_values)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {auditLogs.length > 0 && (
        <div className="p-3 border-t border-gray-200 text-center text-sm text-gray-500">
          Showing {auditLogs.length} audit log entries
        </div>
      )}
    </div>
  );
};

export default AuditLog;
