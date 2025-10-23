import React, { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  ChartBarIcon,
  EyeSlashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  CubeIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { HeroIcon } from "./ui/Icon";
import Button from "./ui/Button";
import StatusBadge from "./ui/StatusBadge";
import LoadingSpinner from "./ui/LoadingSpinner";
import ErrorMessage from "./ui/ErrorMessage";

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <LoadingSpinner size="lg" color="primary" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Loading audit logs...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        variant="error"
        dismissible
        onDismiss={() => setError(null)}
      >
        {error}
      </ErrorMessage>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-all duration-200 card-parallax">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 rounded-t-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <HeroIcon
                icon={DocumentTextIcon}
                size="md"
                className="text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {medicationId ? "Medication Audit Log" : "System Audit Log"}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Track all system activities and changes
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <HeroIcon
                icon={showStats ? EyeSlashIcon : EyeIcon}
                size="sm"
                className="mr-2"
              />
              {showStats ? "Hide Stats" : "Show Stats"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              className="border-info-300 text-info-700 hover:bg-info-50 dark:border-info-700 dark:text-info-300 dark:hover:bg-info-900/30"
            >
              <HeroIcon icon={ArrowDownTrayIcon} size="sm" className="mr-2" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="border-success-300 text-success-700 hover:bg-success-50 dark:border-success-700 dark:text-success-300 dark:hover:bg-success-900/30"
            >
              <HeroIcon icon={ArrowDownTrayIcon} size="sm" className="mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {showStats && stats && (
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600 animate-slide-down">
            <div className="flex items-center space-x-2 mb-4">
              <HeroIcon
                icon={ChartBarIcon}
                size="sm"
                className="text-neutral-600 dark:text-neutral-400"
              />
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Statistics Overview
              </h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Total Logs
                </p>
                <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {stats.total_logs}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Doses Given
                </p>
                <p className="text-lg font-bold text-info-600 dark:text-info-400">
                  {stats.dose_given_count}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Inventory Updates
                </p>
                <p className="text-lg font-bold text-success-600 dark:text-success-400">
                  {stats.inventory_updated_count}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
                  Total Consumed
                </p>
                <p className="text-lg font-bold text-error-600 dark:text-error-400">
                  {stats.total_quantity_consumed}
                </p>
              </div>
            </div>
          </div>
        )}

        {showFilters && (
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600 space-y-4 animate-slide-down">
            <div className="flex items-center space-x-2 mb-4">
              <HeroIcon
                icon={FunnelIcon}
                size="sm"
                className="text-neutral-600 dark:text-neutral-400"
              />
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Filters
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-field">
                <label className="form-label">Action Type</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange("action", e.target.value)}
                  className="form-input-base form-input-animated form-input-md w-full"
                >
                  {actionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Quantity Filter</label>
                <select
                  value={filters.quantityFilter}
                  onChange={(e) =>
                    handleFilterChange("quantityFilter", e.target.value)
                  }
                  className="form-input-base form-input-animated form-input-md w-full"
                >
                  {quantityFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">Sort By</label>
                <select
                  value={`${filters.sortBy}_${filters.sortDirection}`}
                  onChange={(e) => {
                    const [sortBy, sortDirection] = e.target.value.split("_");
                    handleFilterChange("sortBy", sortBy);
                    handleFilterChange("sortDirection", sortDirection);
                  }}
                  className="form-input-base form-input-animated form-input-md w-full"
                >
                  <option value="created_at_desc">Newest First</option>
                  <option value="created_at_asc">Oldest First</option>
                  <option value="action_asc">Action A-Z</option>
                  <option value="action_desc">Action Z-A</option>
                  <option value="quantity_change_desc">
                    Highest Change First
                  </option>
                  <option value="quantity_change_asc">
                    Lowest Change First
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-field">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                  className="form-input-base form-input-animated form-input-md w-full"
                />
              </div>
              <div className="form-field">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                  className="form-input-base form-input-animated form-input-md w-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <HeroIcon icon={XMarkIcon} size="sm" className="mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      <div
        className="overflow-auto bg-neutral-50 dark:bg-neutral-900"
        style={{ maxHeight }}
      >
        {auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
              <HeroIcon
                icon={DocumentTextIcon}
                size="xl"
                className="text-neutral-400 dark:text-neutral-500"
              />
            </div>
            <div className="text-center">
              <h4 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                No Audit Logs Found
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No audit logs found matching the current filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3 stagger-container">
            {auditLogs.map((log, index) => (
              <div
                key={log.id}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 hover:shadow-md transition-all duration-200 interactive-enhanced stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                      <HeroIcon
                        icon={
                          log.action === "DOSE_GIVEN"
                            ? ClockIcon
                            : log.action === "INVENTORY_UPDATED"
                            ? CubeIcon
                            : UserIcon
                        }
                        size="md"
                        className="text-neutral-600 dark:text-neutral-400"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <StatusBadge
                        status={
                          log.action === "DOSE_GIVEN"
                            ? "info"
                            : log.action === "INVENTORY_UPDATED"
                            ? "success"
                            : log.action === "CREATED"
                            ? "success"
                            : log.action === "UPDATED"
                            ? "warning"
                            : log.action === "DELETED"
                            ? "error"
                            : "neutral"
                        }
                        size="sm"
                        variant="soft"
                      >
                        {formatActionLabel(log.action)}
                      </StatusBadge>

                      {log.medication_name && (
                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-lg">
                          {log.medication_name}
                        </span>
                      )}

                      {log.quantity_change && (
                        <span
                          className={`text-sm font-semibold px-2 py-1 rounded-lg ${
                            parseFloat(log.quantity_change) > 0
                              ? "text-success-700 bg-success-100 dark:text-success-300 dark:bg-success-900/30"
                              : parseFloat(log.quantity_change) < 0
                              ? "text-error-700 bg-error-100 dark:text-error-300 dark:bg-error-900/30"
                              : "text-neutral-700 bg-neutral-100 dark:text-neutral-300 dark:bg-neutral-700"
                          }`}
                        >
                          {formatQuantityChange(log.quantity_change)} tablets
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400 mb-3">
                      <HeroIcon icon={ClockIcon} size="sm" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>

                    {(log.old_values || log.new_values) && (
                      <div className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-3 space-y-2">
                        {log.old_values && (
                          <div className="text-xs">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                              Before:
                            </span>
                            <pre className="mt-1 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-2 rounded overflow-auto">
                              {JSON.stringify(log.old_values, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div className="text-xs">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                              After:
                            </span>
                            <pre className="mt-1 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-2 rounded overflow-auto">
                              {JSON.stringify(log.new_values, null, 2)}
                            </pre>
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
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Showing{" "}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {auditLogs.length}
            </span>{" "}
            audit log entries
          </p>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
