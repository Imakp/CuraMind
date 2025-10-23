import { useState, useEffect } from "react";
import SearchFilter from "../components/SearchFilter";
import MedicationCard from "../components/MedicationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

const Manage = () => {
  const [medications, setMedications] = useState([]);
  const [filteredMedications, setFilteredMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({});
  const [selectedSort, setSelectedSort] = useState("");
  const [routes, setRoutes] = useState([]);
  const [frequencies, setFrequencies] = useState([]);

  // Fetch medications
  const fetchMedications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/medications");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to fetch medications");
      }

      setMedications(result.data || []);
    } catch (err) {
      console.error("Error fetching medications:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch master data for filters
  const fetchMasterData = async () => {
    try {
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
    }
  };

  // Filter and sort medications
  const applyFiltersAndSort = () => {
    let filtered = [...medications];

    // Apply search filter
    if (searchValue.trim()) {
      const searchTerm = searchValue.toLowerCase().trim();
      filtered = filtered.filter(
        (med) =>
          med.name.toLowerCase().includes(searchTerm) ||
          (med.strength && med.strength.toLowerCase().includes(searchTerm)) ||
          (med.notes && med.notes.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (selectedFilters.active_status) {
      const today = new Date().toISOString().split("T")[0];
      if (selectedFilters.active_status === "active") {
        filtered = filtered.filter(
          (med) => !med.end_date || med.end_date >= today
        );
      } else if (selectedFilters.active_status === "inactive") {
        filtered = filtered.filter(
          (med) => med.end_date && med.end_date < today
        );
      }
    }

    if (selectedFilters.route) {
      filtered = filtered.filter(
        (med) => med.route_id == selectedFilters.route
      );
    }

    if (selectedFilters.low_inventory === "true") {
      filtered = filtered.filter((med) => {
        // Calculate if medication has low inventory (less than 24 hours worth)
        const dailyConsumption =
          med.doses?.reduce(
            (sum, dose) => sum + parseFloat(dose.dose_amount || 0),
            0
          ) || 0;
        return med.total_tablets <= dailyConsumption;
      });
    }

    // Apply sorting
    if (selectedSort) {
      filtered.sort((a, b) => {
        switch (selectedSort) {
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "name_desc":
            return b.name.localeCompare(a.name);
          case "start_date_asc":
            return new Date(a.start_date) - new Date(b.start_date);
          case "start_date_desc":
            return new Date(b.start_date) - new Date(a.start_date);
          case "end_date_asc":
            return (a.end_date || "9999-12-31").localeCompare(
              b.end_date || "9999-12-31"
            );
          case "end_date_desc":
            return (b.end_date || "9999-12-31").localeCompare(
              a.end_date || "9999-12-31"
            );
          case "inventory_asc":
            return parseFloat(a.total_tablets) - parseFloat(b.total_tablets);
          case "inventory_desc":
            return parseFloat(b.total_tablets) - parseFloat(a.total_tablets);
          default:
            return 0;
        }
      });
    }

    setFilteredMedications(filtered);
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchValue(value);
  };

  // Handle filter changes
  const handleFilter = (filters) => {
    setSelectedFilters(filters);
  };

  // Handle sort changes
  const handleSort = (sortValue) => {
    setSelectedSort(sortValue);
  };

  // Handle medication deletion
  const handleDeleteMedication = async (medicationId) => {
    if (!confirm("Are you sure you want to delete this medication?")) {
      return;
    }

    try {
      const response = await fetch(`/api/medications/${medicationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Failed to delete medication");
      }

      // Refresh medications list
      await fetchMedications();
    } catch (err) {
      console.error("Error deleting medication:", err);
      setError(err.message);
    }
  };

  // Handle inventory update
  const handleUpdateInventory = async (medicationId) => {
    const newAmount = prompt("Enter new tablet count:");
    if (newAmount && !isNaN(newAmount) && parseFloat(newAmount) >= 0) {
      try {
        const response = await fetch(
          `/api/medications/${medicationId}/update-inventory`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              total_tablets: parseFloat(newAmount),
              reason: "Manual update from manage page",
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message || "Failed to update inventory"
          );
        }

        // Refresh medications list
        await fetchMedications();
      } catch (err) {
        console.error("Error updating inventory:", err);
        setError(err.message);
      }
    }
  };

  // Calculate if medication is low on inventory
  const isLowInventory = (medication) => {
    const dailyConsumption =
      medication.doses?.reduce(
        (sum, dose) => sum + parseFloat(dose.dose_amount || 0),
        0
      ) || 0;
    return medication.total_tablets <= dailyConsumption;
  };

  // Calculate medication status
  const getMedicationStatus = (medication) => {
    const today = new Date().toISOString().split("T")[0];
    if (medication.end_date && medication.end_date < today) {
      return "inactive";
    }
    return "active";
  };

  // Load data when component mounts
  useEffect(() => {
    fetchMedications();
    fetchMasterData();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    applyFiltersAndSort();
  }, [medications, searchValue, selectedFilters, selectedSort]);

  // Define filter options
  const filterOptions = [
    {
      key: "active_status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "route",
      label: "Route",
      type: "select",
      options: routes.map((route) => ({
        value: route.id,
        label: route.name,
      })),
    },
    {
      key: "low_inventory",
      label: "Low Inventory",
      type: "select",
      options: [{ value: "true", label: "Low Inventory Only" }],
    },
  ];

  // Define sort options
  const sortOptions = [
    { value: "name_asc", label: "Name (A-Z)" },
    { value: "name_desc", label: "Name (Z-A)" },
    { value: "start_date_asc", label: "Start Date (Oldest)" },
    { value: "start_date_desc", label: "Start Date (Newest)" },
    { value: "end_date_asc", label: "End Date (Earliest)" },
    { value: "end_date_desc", label: "End Date (Latest)" },
    { value: "inventory_asc", label: "Inventory (Low to High)" },
    { value: "inventory_desc", label: "Inventory (High to Low)" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Manage Medications
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {filteredMedications.length} of {medications.length} medications
              </p>
            </div>

            <div className="mt-4 sm:mt-0 sm:ml-4">
              <button
                onClick={() => (window.location.href = "/manage/new")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
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
                Add Medication
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <SearchFilter
            onSearch={handleSearch}
            onFilter={handleFilter}
            onSort={handleSort}
            placeholder="Search by name, strength, or notes..."
            searchValue={searchValue}
            filters={filterOptions}
            sortOptions={sortOptions}
            selectedFilters={selectedFilters}
            selectedSort={selectedSort}
          />
        </div>

        {/* Medications List */}
        {filteredMedications.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredMedications.map((medication) => (
              <div key={medication.id} className="relative">
                <MedicationCard
                  medication={{
                    ...medication,
                    dailyConsumption:
                      medication.doses?.reduce(
                        (sum, dose) => sum + parseFloat(dose.dose_amount || 0),
                        0
                      ) || 0,
                  }}
                  showActions={true}
                  onEdit={() =>
                    (window.location.href = `/manage/${medication.id}`)
                  }
                  onDelete={() => handleDeleteMedication(medication.id)}
                  onUpdateInventory={() => handleUpdateInventory(medication.id)}
                />

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {getMedicationStatus(medication) === "inactive" ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  ) : isLowInventory(medication) ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchValue || Object.keys(selectedFilters).length > 0
                ? "No medications found"
                : "No medications yet"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchValue || Object.keys(selectedFilters).length > 0
                ? "Try adjusting your search or filters."
                : "Get started by adding your first medication."}
            </p>
            {!searchValue && Object.keys(selectedFilters).length === 0 && (
              <div className="mt-6">
                <button
                  onClick={() => (window.location.href = "/manage/new")}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Add Your First Medication
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {medications.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {medications.length}
                </div>
                <div className="text-sm text-gray-600">Total Medications</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {
                    medications.filter(
                      (med) => getMedicationStatus(med) === "active"
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Active</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {medications.filter((med) => isLowInventory(med)).length}
                </div>
                <div className="text-sm text-gray-600">Low Inventory</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {
                    medications.filter(
                      (med) => getMedicationStatus(med) === "inactive"
                    ).length
                  }
                </div>
                <div className="text-sm text-gray-600">Inactive</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Back to Dashboard Button */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-full p-3 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Manage;
