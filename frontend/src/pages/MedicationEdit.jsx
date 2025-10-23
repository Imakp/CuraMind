import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MedicationForm from "../components/MedicationForm";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { HeroIcon } from "../components/ui/Icon";
import {
  PencilIcon,
  ArrowLeftIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

const MedicationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [medication, setMedication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch medication data
  useEffect(() => {
    const fetchMedication = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/medications/${id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error?.message || "Failed to fetch medication"
          );
        }

        setMedication(result.data);
      } catch (err) {
        console.error("Error fetching medication:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMedication();
    }
  }, [id]);

  const handleSubmit = async (medicationData) => {
    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(`/api/medications/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(medicationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to update medication");
      }

      // Navigate back to manage page on success
      navigate("/manage");
    } catch (err) {
      console.error("Error updating medication:", err);
      setError(err.message);
      throw err; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/manage");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !medication) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="layout-container py-8">
          <ErrorMessage
            title="Failed to Load Medication"
            message={error}
            onRetry={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Enhanced Header */}
      <header className="bg-gradient-to-r from-white to-neutral-50 dark:from-neutral-800 dark:to-neutral-900 shadow-sm border-b border-neutral-200 dark:border-neutral-700">
        <div className="layout-container py-8">
          <div className="flex items-center gap-6">
            <button
              onClick={handleCancel}
              className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-400 rounded-lg flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <HeroIcon icon={ArrowLeftIcon} size="lg" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                <HeroIcon icon={PencilIcon} size="lg" color="primary" />
              </div>
              <div>
                <h1 className="text-heading-2 text-neutral-900 dark:text-neutral-100">
                  Edit Medication
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-400">
                  {medication?.name
                    ? `Editing ${medication.name}`
                    : "Update medication details and schedule"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="layout-container py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError("")} />
          </div>
        )}

        {medication && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-8">
            <MedicationForm
              medication={medication}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default MedicationEdit;
