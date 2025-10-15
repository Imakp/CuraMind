import { useState, useEffect } from 'react'

const DoseForm = ({ 
  dose = null, 
  onSave, 
  onCancel, 
  availableRoutes = [],
  defaultRoute = null 
}) => {
  const [formData, setFormData] = useState({
    dose_amount: '',
    time_of_day: '',
    route_override: '',
    instructions: ''
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (dose) {
      setFormData({
        dose_amount: dose.dose_amount || '',
        time_of_day: dose.time_of_day || '',
        route_override: dose.route_override || '',
        instructions: dose.instructions || ''
      })
    }
  }, [dose])

  const validateForm = () => {
    const newErrors = {}

    if (!formData.dose_amount || parseFloat(formData.dose_amount) <= 0) {
      newErrors.dose_amount = 'Dose amount must be greater than 0'
    }

    if (!formData.time_of_day) {
      newErrors.time_of_day = 'Time is required'
    } else {
      // Validate time format (HH:MM) - HTML time input provides this format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(formData.time_of_day)) {
        newErrors.time_of_day = 'Time must be in HH:MM format'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const doseData = {
        ...formData,
        dose_amount: parseFloat(formData.dose_amount),
        route_override: formData.route_override || null
      }
      
      await onSave(doseData)
    } catch (error) {
      console.error('Error saving dose:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const formatTimeForInput = (timeString) => {
    if (!timeString) return ''
    // Convert from HH:MM:SS or HH:MM format to HH:MM for input
    return timeString.substring(0, 5)
  }

  const getCurrentTime = () => {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {dose ? 'Edit Dose' : 'Add New Dose'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dose Amount */}
        <div>
          <label htmlFor="dose_amount" className="block text-sm font-medium text-gray-700 mb-1">
            Dose Amount (tablets) *
          </label>
          <input
            type="number"
            id="dose_amount"
            step="0.5"
            min="0.5"
            value={formData.dose_amount}
            onChange={(e) => handleChange('dose_amount', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.dose_amount ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., 1, 0.5, 2"
          />
          {errors.dose_amount && (
            <p className="mt-1 text-sm text-red-600">{errors.dose_amount}</p>
          )}
        </div>

        {/* Time of Day */}
        <div>
          <label htmlFor="time_of_day" className="block text-sm font-medium text-gray-700 mb-1">
            Time of Day *
          </label>
          <div className="flex gap-2">
            <input
              type="time"
              id="time_of_day"
              value={formatTimeForInput(formData.time_of_day)}
              onChange={(e) => handleChange('time_of_day', e.target.value)}
              className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.time_of_day ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => handleChange('time_of_day', getCurrentTime())}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Now
            </button>
          </div>
          {errors.time_of_day && (
            <p className="mt-1 text-sm text-red-600">{errors.time_of_day}</p>
          )}
        </div>

        {/* Route Override */}
        {availableRoutes.length > 0 && (
          <div>
            <label htmlFor="route_override" className="block text-sm font-medium text-gray-700 mb-1">
              Route Override
            </label>
            <select
              id="route_override"
              value={formData.route_override}
              onChange={(e) => handleChange('route_override', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">
                {defaultRoute ? `Use default (${defaultRoute})` : 'No override'}
              </option>
              {availableRoutes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to use the medication's default route
            </p>
          </div>
        )}

        {/* Instructions */}
        <div>
          <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
            Special Instructions
          </label>
          <textarea
            id="instructions"
            rows={3}
            value={formData.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Take with food, Before meals, etc."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isSubmitting ? 'Saving...' : (dose ? 'Update Dose' : 'Add Dose')}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

export default DoseForm