import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MedicationForm from "../components/MedicationForm";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !medication) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                Edit Medication
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {medication?.name && `Editing ${medication.name}`}
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

        {medication && (
          <MedicationForm
            medication={medication}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
};

export default MedicationEdit;
