
import { useState, useEffect } from 'react'
import { CalendarDays, X, PawPrint } from 'lucide-react'

function BookingForm({ onClose, initialService = '' }) {
  const [services, setServices] = useState([])
const [servicesError, setServicesError] = useState('')

useEffect(() => {
  fetch('/api/services')
    .then(response => {
      if (!response.ok) {
        throw new Error('Unable to load services.')
      }

      return response.json()
    })
    .then(setServices)
    .catch(error => setServicesError(error.message))
}, [])
  const [bookingSuccess, setBookingSuccess] = useState(null)
const [copied, setCopied] = useState(false)
const [errors, setErrors] = useState({})
const [submitError, setSubmitError] = useState('')
const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    ownerName: '',
    contactNumber: '',
    petName: '',
    species: '',
    otherSpecies: '',
    breed: '',
    age: '',
    ageUnit: 'Years',
    service: initialService,
    date: '',
    time: '',
    notes: ''
  })
const [bookedTimes, setBookedTimes] = useState([])
const [loadingTimes, setLoadingTimes] = useState(false)
const [availabilityError, setAvailabilityError] = useState('')
  const [times, setTimes] = useState([])
const [scheduleMessage, setScheduleMessage] = useState('')

  const now = new Date()
  const today = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`

  const inputStyle =
    'w-full border border-slate-300 rounded-lg px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-teal-500'
function getInputStyle(name) {
  return `${inputStyle} ${
    errors[name]
      ? 'border-red-500 focus:ring-red-500'
      : ''
  }`
}

function renderError(name) {
  return errors[name] ? (
    <p role="alert" className="text-red-600 text-sm mt-1">
      {errors[name]}
    </p>
  ) : null
}
  function handleChange(e) {
  const { name, value } = e.target

  setForm(prev => ({
    ...prev,
    [name]: name === 'contactNumber' ? value.replace(/\D/g, '').slice(0, 11) : value,
    ...(name === 'species' && value !== 'Other' ? { otherSpecies: '' } : {})
  }))

  setErrors(prev => ({
    ...prev,
    [name]: '',
    ...(['date', 'service'].includes(name)
      ? { time: '' }
      : {})
  }))

  setSubmitError('')
}

 useEffect(() => {
  setTimes([])
  setBookedTimes([])
  setAvailabilityError('')
  setScheduleMessage('')

  setForm(prev => ({
    ...prev,
    time: ''
  }))

  if (!form.date || !form.service) {
    setLoadingTimes(false)
    return
  }

  const controller = new AbortController()

  async function fetchAvailability() {
    setLoadingTimes(true)

    try {
      const params = new URLSearchParams({
        date: form.date,
        service: form.service
      })

      const response = await fetch(
        `/api/appointments/availability?${params}`,
        { signal: controller.signal }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setTimes(data.times || [])
      setBookedTimes(data.bookedTimes || [])
      setScheduleMessage(data.message || '')

    } catch (error) {
      if (error.name !== 'AbortError') {
        setAvailabilityError(
          'Unable to check available time slots.'
        )
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoadingTimes(false)
      }
    }
  }

  fetchAvailability()

  return () => controller.abort()

}, [form.date, form.service])
async function handleSubmit(e) {
  e.preventDefault()

  if (submitting) return

  setSubmitError('')

  const newErrors = {}

  if (!form.ownerName.trim()) {
    newErrors.ownerName = 'Full name is required.'
  } else if (form.ownerName.trim().length > 100) {
    newErrors.ownerName = 'Maximum of 100 characters.'
  }

  if (!/^09[0-9]{9}$/.test(form.contactNumber)) {
    newErrors.contactNumber =
      'Enter a valid 11-digit mobile number.'
  }

  if (!form.petName.trim()) {
    newErrors.petName = 'Pet name is required.'
  } else if (form.petName.trim().length > 50) {
    newErrors.petName = 'Maximum of 50 characters.'
  }

  if (!form.species) {
    newErrors.species = 'Please select a species.'
  }

  if (form.species === 'Other' && (!form.otherSpecies.trim() || form.otherSpecies.trim().length > 50)) {
    newErrors.otherSpecies = 'Specify the species (1–50 characters).'
  }

  if (!form.breed.trim()) {
    newErrors.breed = 'Breed is required.'
  } else if (form.breed.trim().length > 100) {
    newErrors.breed = 'Maximum of 100 characters.'
  }

  if (
    form.age.trim() === '' ||
    !Number.isFinite(Number(form.age)) ||
    Number(form.age) < 0 ||
    Number(form.age) > (form.ageUnit === 'Months' ? 1200 : 100)
  ) {
    newErrors.age =
      `Pet age must be between 0 and ${form.ageUnit === 'Months' ? 1200 : 100} ${form.ageUnit.toLowerCase()}.`
  }

  if (!form.service) {
    newErrors.service = 'Please select a service.'
  }

  if (!form.date) {
    newErrors.date = 'Please select a date.'
  } else if (form.date < today) {
    newErrors.date = 'Past dates are not allowed.'
  }

  if (
    !form.time ||
    loadingTimes ||
    availabilityError ||
    scheduleMessage ||
    !times.includes(form.time) ||
    bookedTimes.includes(form.time)
  ) {
    newErrors.time =
      'Please select an available time slot.'
  }

  if (form.notes.length > 500) {
    newErrors.notes =
      'Notes must not exceed 500 characters.'
  }

  setErrors(newErrors)

  if (Object.keys(newErrors).length > 0) {
    return
  }

  setSubmitting(true)

  try {
    const response = await fetch(
      '/api/appointments',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      setSubmitError(
        data.message || 'Unable to book appointment.'
      )
      return
    }

    setBookingSuccess(data.appointment)
    setCopied(false)

  } catch (error) {
    console.error(error)

    setSubmitError(
      'Unable to connect to the server. Please try again.'
    )
  } finally {
    setSubmitting(false)
  }
}
if (bookingSuccess) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
        className="bg-white rounded-2xl w-full max-w-md p-8 shadow-xl text-center max-h-[90vh] overflow-y-auto"
      >

        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">✓</span>
        </div>

        <h2 id="success-title" className="text-2xl font-bold text-slate-800">
          Appointment Booked!
        </h2>

        <p className="text-slate-500 mt-3">
          Your appointment has been submitted successfully.
          Please wait for admin confirmation.
        </p>

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mt-6">

          <p className="text-sm text-teal-700">
            Your Reference Number
          </p>

          <h3 className="text-2xl font-bold text-teal-700 mt-2">
            {bookingSuccess.referenceNumber}
          </h3>

          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  bookingSuccess.referenceNumber
                )
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
            className="w-full mt-4 border border-teal-600 text-teal-700 rounded-lg py-2 hover:bg-teal-100 transition"
          >
            {copied ? 'Copied!' : 'Copy Reference Number'}
          </button>

        </div>

        <div className="mt-5">
          <span className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium">
            Pending Approval
          </span>
        </div>

        <p className="text-sm text-slate-500 mt-5">
          Keep your reference number to track, modify,
          or cancel your appointment.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg py-3 mt-6 transition"
        >
          Done
        </button>

      </div>

    </div>
  )
}
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >

        {/* Header */}
        <div className="bg-teal-600 text-white p-6 flex items-center justify-between rounded-t-2xl">

          <div className="flex items-center gap-3">
            <CalendarDays size={30} />

            <div>
              <h2 id="booking-title" className="text-2xl font-bold">
                Book Appointment
              </h2>

              <p className="text-teal-100 text-sm">
                Schedule a veterinary visit for your pet.
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close booking form"
            onClick={onClose}
            className="hover:bg-teal-700 p-2 rounded-lg"
          >
            <X size={24} />
          </button>

        </div>

        <form
  noValidate
  onSubmit={handleSubmit}
  className="p-6 space-y-6"
>

          <div role="note" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
            <strong>Pet emergency?</strong> If your pet has urgent or life-threatening symptoms, contact or visit the nearest veterinary clinic immediately. Do not wait for an online appointment.
          </div>
          {/* Owner Information */}
          <div>
            <h3 className="text-lg font-bold text-teal-700 border-b pb-3">
              1. Pet Owner Information
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mt-4">

              <label>
                Full Name
                <input
  type="text"
  name="ownerName"
  value={form.ownerName}
  onChange={handleChange}
  placeholder="Enter full name"
  className={getInputStyle('ownerName')}
  aria-invalid={!!errors.ownerName}
  required
/>
{renderError('ownerName')}
              </label>

              <label>
                Contact Number
                <input
  type="tel"
  inputMode="numeric"
  name="contactNumber"
  value={form.contactNumber}
  onChange={handleChange}
  placeholder="09XXXXXXXXX"
  pattern="09[0-9]{9}"
  maxLength={11}
  className={getInputStyle('contactNumber')}
  aria-invalid={!!errors.contactNumber}
  required
/>
{renderError('contactNumber')}
              </label>

            </div>
          </div>

          {/* Pet Information */}
          <div>
            <h3 className="text-lg font-bold text-teal-700 border-b pb-3 flex items-center gap-2">
              <PawPrint size={20} />
              2. Pet Information
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mt-4">

              <label>
                Pet Name
                <input
                  type="text"
                  name="petName"
                  value={form.petName}
                  onChange={handleChange}
                  placeholder="Enter pet name"
                  className={inputStyle}
                  required
                />
              </label>

              <label>
                Species
                <select
                  name="species"
                  value={form.species}
                  onChange={handleChange}
                  className={inputStyle}
                  required
                >
                  <option value="">Select species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>                 <option value="Bird">Bird</option>
                  <option value="Other">Others</option>
                </select>
              </label>

              {form.species === 'Other' && <label>Specify Species
                <input name="otherSpecies" value={form.otherSpecies} onChange={handleChange} maxLength={50} className={getInputStyle('otherSpecies')} required />
                {renderError('otherSpecies')}
              </label>}
              <label>
                Breed
                <input
                  type="text"
                  name="breed"
                  value={form.breed}
                  onChange={handleChange}
                  placeholder="Enter breed"
                  className={inputStyle}
                  required
                />
              </label>

              <label>
                Pet Age
                <input
  type="number"
  name="age"
  min="0"
  max={form.ageUnit === 'Months' ? 1200 : 100}
  step="any"
  value={form.age}
  onChange={handleChange}
  placeholder="Enter pet age"
  className={getInputStyle('age')}
  aria-invalid={!!errors.age}
  required
/>
{renderError('age')}
              </label>
              <label>Age Unit<select name="ageUnit" value={form.ageUnit} onChange={handleChange} className={inputStyle}><option>Years</option><option>Months</option></select></label>

            </div>
          </div>

          {/* Appointment Information */}
          <div>
            <h3 className="text-lg font-bold text-teal-700 border-b pb-3">
              3. Appointment Details
            </h3>

            <div className="space-y-4 mt-4">

              <label className="block">
  Veterinary Service

  <select
    name="service"
    value={form.service}
    onChange={handleChange}
    className={inputStyle}
    required
  >
    <option value="">Select a service</option>

    {services.map(service => (
      <option
        key={service.id}
        value={service.name}
      >
        {service.name} — {service.duration} minutes
      </option>
    ))}
  </select>

  {servicesError && (
    <p className="text-red-600 text-sm mt-2">
      {servicesError}
    </p>
  )}
</label>

              <div className="grid md:grid-cols-2 gap-4">

                <label>
                  Preferred Date
                  <input
                    type="date"
                    name="date"
                    min={today}
                    value={form.date}
                    onChange={handleChange}
                    className={inputStyle}
                    required
                  />
                </label>

                <label>
                  Preferred Time
                  <select
  name="time"
  value={form.time}
  onChange={handleChange}
  className={inputStyle}
  disabled={
  !form.date ||
  !form.service ||
  loadingTimes ||
  !!availabilityError ||
  !!scheduleMessage ||
  times.length === 0
}
  required
>
  <option value="">
    {!form.date
      ? 'Select a date first'
      : loadingTimes
      ? 'Checking availability...'
      : availabilityError
      ? 'Availability unavailable'
      : 'Select a time'}
  </option>

  {times.filter(time => !bookedTimes.includes(time)).map(time => (
    <option
      key={time}
      value={time}
    >
      {time}
    </option>
  ))}
</select>
{scheduleMessage && (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mt-2">
    {scheduleMessage}
  </div>
)}
{availabilityError && (
  <p className="text-red-600 text-sm mt-2">
    {availabilityError}
  </p>
)}
                </label>

              </div>

              <label className="block">
                Additional Notes (Optional)
                <textarea
  name="notes"
  value={form.notes}
  onChange={handleChange}
  placeholder="Describe your pet's concerns..."
  rows={3}
  className={getInputStyle('notes')}
  aria-invalid={!!errors.notes}
/>

<p className={`text-xs text-right mt-1 ${
  form.notes.length > 500
    ? 'text-red-600'
    : 'text-slate-500'
}`}>
  {form.notes.length} / 500 characters
</p>

{renderError('notes')}
              </label>

            </div>
          </div>
{submitError && (
  <div
    role="alert"
    className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm"
  >
    {submitError}
  </div>
)}
          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t pt-5">

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
  type="submit"
  disabled={submitting}
  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
>
  {submitting
    ? 'Booking Appointment...'
    : 'Confirm Appointment'}
</button>
          </div>

        </form>

      </div>

    </div>
  )
}

export default BookingForm
