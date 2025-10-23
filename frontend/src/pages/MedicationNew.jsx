import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MedicationForm from "../components/MedicationForm";
import ErrorMessage from "../components/ErrorMessage";
import { HeroIcon } from "../components/ui/Icon";
import {
  PlusIcon,
  ArrowLeftIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

const MedicationNew = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (medicationData) => {
    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch("/api/medications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(medicationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to create medication");
      }

      // Navigate back to manage page on success
      navigate("/manage");
    } catch (err) {
      console.error("Error creating medication:", err);
      setError(err.message);
      throw err; // Re-throw to let form handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/manage");
  };

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
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-xl flex items-center justify-center">
                <HeroIcon icon={PlusIcon} size="lg" color="success" />
              </div>
              <div>
                <h1 className="text-heading-2 text-neutral-900 dark:text-neutral-100">
                  Add New Medication
                </h1>
                <p className="text-lg text-neutral-600 dark:text-neutral-400">
                  Create a new medication with dosing schedule and inventory
                  tracking
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

        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-8">
          <MedicationForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      </main>
    </div>
  );
};

export default MedicationNew;
