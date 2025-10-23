import { useState, useEffect } from "react";
import SearchFilter from "../components/SearchFilter";
import MedicationCard from "../components/MedicationCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import SummaryCard from "../components/ui/SummaryCard";
import { HeroIcon } from "../components/ui/Icon";
import { ManageSkeleton } from "../components/LoadingSkeleton";
import {
  SummaryCardStagger,
  MedicationCardStagger,
} from "../components/StaggerContainer";
import {
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlusIcon,
  ArrowLeftIcon,
  FunnelIcon,
  Bars3BottomLeftIcon,
} from "@heroicons/react/24/outline";

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
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
          <div className="layout-container py-8">
            <ManageSkeleton />
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="layout-container py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-heading-2 text-neutral-900 dark:text-neutral-100 mb-2">
                Manage Medications
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-400">
                {filteredMedications.length} of {medications.length} medications
                {searchValue && ` matching "${searchValue}"`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => (window.location.href = "/")}
                className="btn-base btn-ghost btn-md lg:hidden"
              >
                <HeroIcon icon={ArrowLeftIcon} size="sm" />
                Dashboard
              </button>

              <button
                onClick={() => (window.location.href = "/manage/new")}
                className="btn-base btn-primary btn-md"
              >
                <HeroIcon icon={PlusIcon} size="sm" />
                Add Medication
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Enhanced Quick Stats with Stagger Animation */}
        {medications.length > 0 && (
          <section className="mb-8">
            <SummaryCardStagger>
              <SummaryCard
                title="Total"
                value={medications.length}
                icon={<HeroIcon icon={BeakerIcon} size="lg" />}
                color="primary"
                variant="filled"
              />
              <SummaryCard
                title="Active"
                value={
                  medications.filter(
                    (med) => getMedicationStatus(med) === "active"
                  ).length
                }
                icon={<HeroIcon icon={CheckCircleIcon} size="lg" />}
                color="success"
                variant="filled"
              />
              <SummaryCard
                title="Low Stock"
                value={medications.filter((med) => isLowInventory(med)).length}
                icon={<HeroIcon icon={ExclamationTriangleIcon} size="lg" />}
                color="warning"
                variant="filled"
              />
              <SummaryCard
                title="Inactive"
                value={
                  medications.filter(
                    (med) => getMedicationStatus(med) === "inactive"
                  ).length
                }
                icon={<HeroIcon icon={XCircleIcon} size="lg" />}
                color="neutral"
                variant="filled"
              />
            </SummaryCardStagger>
          </section>
        )}

        {/* Enhanced Search and Filters */}
        <section className="mb-8">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <HeroIcon icon={FunnelIcon} size="lg" color="primary" />
              </div>
              <div>
                <h2 className="text-heading-4 text-neutral-900 dark:text-neutral-100">
                  Search & Filter
                </h2>
                <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                  Find and organize your medications
                </p>
              </div>
            </div>

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
        </section>

        {/* Enhanced Medications List */}
        <section>
          {filteredMedications.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <HeroIcon
                    icon={Bars3BottomLeftIcon}
                    size="lg"
                    color="primary"
                  />
                  <div>
                    <h2 className="text-heading-4 text-neutral-900 dark:text-neutral-100">
                      Medications
                    </h2>
                    <p className="text-body-small text-neutral-600 dark:text-neutral-400">
                      {filteredMedications.length} result
                      {filteredMedications.length !== 1 ? "s" : ""}
                      {selectedSort &&
                        ` • Sorted by ${
                          sortOptions.find((opt) => opt.value === selectedSort)
                            ?.label
                        }`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Grid Layout with Stagger Animation */}
              <MedicationCardStagger>
                {filteredMedications.map((medication) => (
                  <div key={medication.id} className="relative">
                    <MedicationCard
                      medication={{
                        ...medication,
                        dailyConsumption:
                          medication.doses?.reduce(
                            (sum, dose) =>
                              sum + parseFloat(dose.dose_amount || 0),
                            0
                          ) || 0,
                      }}
                      showActions={true}
                      onEdit={() =>
                        (window.location.href = `/manage/edit/${medication.id}`)
                      }
                      onDelete={() => handleDeleteMedication(medication.id)}
                      onUpdateInventory={() =>
                        handleUpdateInventory(medication.id)
                      }
                    />

                    {/* Enhanced Status Badge */}
                    <div className="absolute top-3 right-3">
                      {getMedicationStatus(medication) === "inactive" ? (
                        <span className="badge-base badge-neutral badge-filled badge-sm">
                          Inactive
                        </span>
                      ) : isLowInventory(medication) ? (
                        <span className="badge-base badge-warning badge-filled badge-sm">
                          Low Stock
                        </span>
                      ) : (
                        <span className="badge-base badge-success badge-filled badge-sm">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </MedicationCardStagger>
            </>
          ) : (
            /* Enhanced Empty State */
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <HeroIcon icon={BeakerIcon} size="2xl" color="muted" />
              </div>
              <h3 className="text-heading-4 text-neutral-900 dark:text-neutral-100 mb-2">
                {searchValue || Object.keys(selectedFilters).length > 0
                  ? "No medications found"
                  : "No medications yet"}
              </h3>
              <p className="text-body text-neutral-600 dark:text-neutral-400 mb-6 max-w-md mx-auto">
                {searchValue || Object.keys(selectedFilters).length > 0
                  ? "Try adjusting your search terms or filters to find what you're looking for."
                  : "Get started by adding your first medication to begin tracking your health."}
              </p>
              {!searchValue && Object.keys(selectedFilters).length === 0 && (
                <button
                  onClick={() => (window.location.href = "/manage/new")}
                  className="btn-base btn-primary btn-md"
                >
                  <HeroIcon icon={PlusIcon} size="sm" />
                  Add Your First Medication
                </button>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Enhanced Back to Dashboard Button */}
      <div className="fixed bottom-6 left-6 hidden lg:block">
        <button
          onClick={() => (window.location.href = "/")}
          className="w-12 h-12 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex items-center justify-center"
        >
          <HeroIcon icon={ArrowLeftIcon} size="lg" />
        </button>
      </div>
    </div>
  );
};

export default Manage;
