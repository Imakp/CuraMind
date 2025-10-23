import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MedicationForm from "../components/MedicationForm";
import ErrorMessage from "../components/ErrorMessage";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <button
              onClick={handleCancel}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
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

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Add New Medication
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Create a new medication with dosing schedule and inventory
                tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={() => setError("")} />
          </div>
        )}

        <MedicationForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
};

export default MedicationNew;
