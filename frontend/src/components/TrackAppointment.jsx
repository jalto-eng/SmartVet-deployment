import TimePicker from './TimePicker'
import SmartCalendar from './SmartCalendar'
import SecondService from './SecondService'
import { useState, useEffect } from 'react'
import { Search, X, CalendarDays } from 'lucide-react'

function TrackAppointment({ onClose }) {
  const [referenceNumber, setReferenceNumber] = useState('')
  const [appointment, setAppointment] = useState(null)
  const [error, setError] = useState('')
  const [showModify, setShowModify] = useState(false)
const [bookedTimes, setBookedTimes] = useState([])
const [loadingTimes, setLoadingTimes] = useState(false)
const [availabilityError, setAvailabilityError] = useState('')
const [modifyForm, setModifyForm] = useState({
  contactNumber: '',
  service: '',
  secondService: '',
  date: '',
  time: ''
})
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
const [times, setTimes] = useState([])
const [scheduleMessage, setScheduleMessage] = useState('')
const [modifying, setModifying] = useState(false)
  const [loading, setLoading] = useState(false)
const [contactNumber, setContactNumber] = useState('')
const [cancelling, setCancelling] = useState(false)
const [success, setSuccess] = useState('')
const [cancelReason, setCancelReason] = useState('')
const [showCancelConfirm, setShowCancelConfirm] = useState(false)
function openCancelConfirmation() {
  setError('')
  setSuccess('')

  if (!appointment || cancelling || loading || modifying) {
    return
  }

  if (!/^09[0-9]{9}$/.test(contactNumber.trim())) {
    setError('Please enter your valid registered contact number.')
    return
  }

  if (
    appointment.cancellationMode === 'request' &&
    !cancelReason.trim()
  ) {
    setError('Please provide a cancellation reason.')
    return
  }

  setShowCancelConfirm(true)
}

async function handleCancel() {
  setError('')
  setSuccess('')

  if (!appointment || cancelling || loading || modifying) {
    return
  }

  setShowCancelConfirm(false)
  setCancelling(true)

  try {
    const response = await fetch(
      `/api/appointments/track/${encodeURIComponent(appointment.referenceNumber)}/cancel`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contactNumber: contactNumber.trim(),
          reason: cancelReason.trim()
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      if (data.code === 'CANCELLATION_REASON_REQUIRED') {
        setAppointment(previous => ({
          ...previous,
          cancellationMode: 'request'
        }))
      }

      setError(data.message || 'Cancellation failed.')
      return
    }

    setAppointment(previous => ({
      ...previous,
      status: data.status,
      cancellationMode: data.cancellationMode,
      cancellationRequestStatus: data.cancellationRequestStatus
    }))

    setSuccess(data.message)
    setContactNumber('')
    setCancelReason('')
    setShowModify(false)

  } catch {
    setError('Unable to process cancellation.')
  } finally {
    setCancelling(false)
  }
}
function openModifyForm() {
    if (!appointment?.modificationAllowed) {
  setError(
    'This appointment cannot be modified online.'
  )
  return
}
  setModifyForm({
    contactNumber: '',
    service: appointment.services?.[0]?.name || appointment.service,
    secondService: appointment.services?.[1]?.name || '',
    date: appointment.date,
    time: appointment.time
  })

  setError('')
  setShowModify(true)
}

function handleModifyChange(e) {
  const { name, value } = e.target

  setModifyForm(prev => ({
    ...prev,
    ...(name === 'service' ? { secondService: '', date: '', time: '' } : name === 'secondService' ? { date: '', time: '' } : name === 'date' ? { time: '' } : {}),
    [name]: name === 'contactNumber' ? value.replace(/\D/g, '').slice(0, 11) : value
  }))
}
useEffect(() => {
  setTimes([])
  setBookedTimes([])
  setAvailabilityError('')
  setScheduleMessage('')

  if (
    !showModify ||
    !modifyForm.date ||
    !modifyForm.service ||
    !appointment
  ) {
    setLoadingTimes(false)
    return
  }

  const controller = new AbortController()

  async function fetchAvailability() {
    setLoadingTimes(true)

    try {
      const params = new URLSearchParams({
        date: modifyForm.date,
        service: modifyForm.service,
        secondService: modifyForm.secondService || '',
        referenceNumber: appointment.referenceNumber,
        contactNumber: modifyForm.contactNumber
      })

      const response = await fetch(
        '/api/appointments/availability',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(params)), signal: controller.signal }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setTimes(data.times || [])
      setBookedTimes(data.bookedTimes || [])
      setScheduleMessage(data.message || '')

      setModifyForm(prev => ({
        ...prev,
        time: data.availableTimes.includes(prev.time)
          ? prev.time
          : ''
      }))

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

}, [
  showModify,
  modifyForm.date,
  modifyForm.service,
  modifyForm.secondService,
  modifyForm.contactNumber,
  appointment
])
async function handleModify(e) {
  e.preventDefault()

  setError('')
  setModifying(true)

  try {
    const response = await fetch(
      `/api/appointments/track/${encodeURIComponent(appointment.referenceNumber)}/modify`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modifyForm)
      }
    )

    const data = await response.json()

    if (!response.ok) {
      setError(data.message || 'Modification failed.')
      return
    }

    setAppointment(data.appointment)
    setShowModify(false)

    setSuccess('Appointment modified successfully!')

  } catch {
    setError('Unable to modify appointment.')
  } finally {
    setModifying(false)
  }
}
  async function handleSearch(e) {
    e.preventDefault()

    setError('')
setSuccess('')
setContactNumber('')
setCancelReason('')
setShowCancelConfirm(false)
setAppointment(null)
setShowModify(false)
setLoading(true)

    try {
      const response = await fetch(
        `/api/appointments/track/${encodeURIComponent(referenceNumber.trim())}`
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Appointment not found.')
        return
      }

      setAppointment(data)
    } catch (err) {
      setError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  const statusColors = {
    Pending: 'bg-yellow-100 text-yellow-700',
    Confirmed: 'bg-green-100 text-green-700',
    Completed: 'bg-blue-100 text-blue-700',
    Cancelled: 'bg-red-100 text-red-700'
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
{/* Custom Cancellation Confirmation */}
{showCancelConfirm && appointment && (

  <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-confirm-title"
      className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
    >

      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <X size={28} className="text-red-600" />
      </div>

      <h3
        id="cancel-confirm-title"
        className="text-xl font-bold text-slate-800 text-center"
      >
        {appointment.cancellationMode === 'request'
          ? 'Request Cancellation?'
          : 'Cancel Appointment?'}
      </h3>

      <p className="text-sm text-slate-500 text-center mt-3 mb-6">
        {appointment.cancellationMode === 'request'
          ? 'Your request will be reviewed by the clinic administrator. Your appointment remains confirmed until approved.'
          : 'Are you sure you want to cancel this appointment? This action cannot be undone.'}
      </p>

      <div className="flex gap-3">

        <button
          type="button"
          onClick={() => setShowCancelConfirm(false)}
          className="flex-1 border border-slate-300 rounded-lg py-3 font-medium text-slate-700 hover:bg-slate-100"
        >
          Go Back
        </button>

        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-medium disabled:opacity-50"
        >
          {appointment.cancellationMode === 'request'
            ? 'Submit Request'
            : 'Yes, Cancel'}
        </button>

      </div>

    </div>

  </div>

)}
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-teal-600 text-white p-6 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <Search size={28} />

            <div>
              <h2 className="text-2xl font-bold">
                Track Appointment
              </h2>

              <p className="text-sm text-teal-100">
                Check your appointment status.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="hover:bg-teal-700 p-2 rounded-lg"
          >
            <X size={24} />
          </button>

        </div>

        {/* Search Form */}
        <div className="p-6">

          <form onSubmit={handleSearch}>

            <label className="block font-medium mb-2">
              Reference Number
            </label>

            <input
              type="text"
              value={referenceNumber}
              onChange={(e) =>
                setReferenceNumber(e.target.value.toUpperCase())
              }
              placeholder="Enter reference number"
              className="w-full border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />

            <button
              type="submit"
              disabled={loading || cancelling || modifying || showCancelConfirm}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg p-3 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search size={18} />

              {loading
                ? 'Searching...'
                : 'Search Appointment'}
            </button>

          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mt-4">
              {error}
            </div>
          )}
{success && (
  <div className="bg-green-50 text-green-700 p-4 rounded-lg mt-4">
    {success}
  </div>
)}
          {/* Appointment Result */}
          {appointment && (
            <div className="border border-slate-200 rounded-xl p-5 mt-6">

              <div className="flex items-center justify-between mb-5 gap-2">

                <h3 className="font-bold text-teal-700 flex items-center gap-2">
                  <CalendarDays size={20} />
                  Appointment Details
                </h3>

                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[appointment.status] ||
                  'bg-slate-100 text-slate-700'
                }`}>
                  {appointment.status}
                </span>

              </div>

              <div className="space-y-3 text-sm">

                {[
                  ['Reference Number', appointment.referenceNumber],
                  ['Pet Name', appointment.petName],
                  ['Service', appointment.service],
                ['Total duration', `${appointment.serviceDuration || 30} minutes`],
                  ['Date', appointment.date],
                  ['Time', appointment.time]
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-3 border-b border-slate-100 pb-3"
                  >
                    <span className="text-slate-500">
                      {label}
                    </span>

                    <span className="font-medium text-right">
                      {value}
                    </span>
                  </div>
                ))}

              </div>
              {['direct', 'request'].includes(appointment.cancellationMode) && (
  <div className="mt-5">

    {!showModify && appointment.modificationAllowed && (
  <button
    type="button"
    onClick={openModifyForm}
    disabled={cancelling || loading || modifying}
    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 rounded-lg disabled:opacity-50"
  >
    Modify Appointment
  </button>
)}
{!appointment.modificationAllowed &&
  appointment.status === 'Confirmed' && (
    <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 text-sm mb-4">

      <p className="font-semibold">
        Rescheduling Unavailable
      </p>

      <p className="mt-2">
        Confirmed appointments cannot be modified
        within {appointment.reschedulingCutoffHours}
        {' '}hour(s) of their scheduled time.
      </p>

    </div>
)}
    {showModify && (
      <form
        onSubmit={handleModify}
        className="space-y-4 border-t pt-5"
      >
        <h3 className="font-bold text-teal-700">
          Modify Appointment
        </h3>

        <label className="block">
          Veterinary Service

          <select
            name="service"
            value={modifyForm.service}
            onChange={handleModifyChange}
            className="w-full border border-slate-300 rounded-lg p-3 mt-1"
            required
          >
            <option value="">Select a service</option>

{services.map(service => (
  <option key={service.id} value={service.name}>
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
<SecondService services={services} first={modifyForm.service} value={modifyForm.secondService} onChange={value => handleModifyChange({target: {name: "secondService", value}})} />


        <label className="block">
          Preferred Date

          <SmartCalendar service={modifyForm.service} secondService={modifyForm.secondService} value={modifyForm.date} onChange={value => handleModifyChange({target: {name: "date", value}})} referenceNumber={appointment.referenceNumber} contactNumber={modifyForm.contactNumber} />
        </label>

        <label className="block">
  Preferred Time

  <TimePicker value={modifyForm.time} onChange={value => handleModifyChange({target: {name: 'time', value}})} times={times} bookedTimes={bookedTimes} disabled={!modifyForm.date || !modifyForm.service || loadingTimes || !!availabilityError || !!scheduleMessage || times.length === 0} placeholder={!modifyForm.date ? 'Select a date first' : loadingTimes ? 'Checking availability...' : availabilityError ? 'Availability unavailable' : 'Select a time'} />

  {loadingTimes && (
    <p className="text-sm text-slate-500 mt-2">
      Checking available time slots...
    </p>
  )}
{scheduleMessage && (
  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mt-2">
    {scheduleMessage}
  </div>
)}
  {availabilityError && (
    <p className="text-sm text-red-600 mt-2">
      {availabilityError}
    </p>
  )}
</label>

        <label className="block">
          Verify Contact Number

          <input
            type="tel" inputMode="numeric"
            name="contactNumber"
            value={modifyForm.contactNumber}
            onChange={handleModifyChange}
            placeholder="09XXXXXXXXX"
            pattern="09[0-9]{9}"
            maxLength={11}
            className="w-full border border-slate-300 rounded-lg p-3 mt-1"
            required
          />
        </label>

        <p className="bg-amber-50 text-amber-700 text-sm p-3 rounded-lg">
          Your appointment will return to Pending
          after modification.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowModify(false)}
            disabled={modifying}
            className="flex-1 border rounded-lg py-3"
          >
            Back
          </button>

          <button
  type="submit"
  disabled={
    modifying ||
    cancelling ||
    loading ||
    loadingTimes ||
    !!availabilityError
  }
  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 disabled:opacity-50"
>
  {modifying ? 'Saving...' : 'Save Changes'}
</button>
        </div>
      </form>
    )}

  </div>
)}
{/* Cancellation Request Status */}
{appointment.cancellationRequestStatus === 'Pending' && (
  <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
    <h4 className="font-semibold text-amber-800">
      Cancellation Request Pending
    </h4>

    <p className="text-sm text-amber-700 mt-2">
      Your cancellation request has been submitted.
      Please wait for admin approval.
      Your appointment remains confirmed until approved.
    </p>
  </div>
)}

{appointment.cancellationRequestStatus === 'Approved' && (
  <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-4">
    <h4 className="font-semibold text-green-800">
      Cancellation Request Approved
    </h4>

    <p className="text-sm text-green-700 mt-2">
      Your appointment has been successfully cancelled.
    </p>
  </div>
)}

{appointment.cancellationRequestStatus === 'Rejected' && (
  <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4">
    <h4 className="font-semibold text-red-800">
      Cancellation Request Rejected
    </h4>

    <p className="text-sm text-red-700 mt-2">
      Your cancellation request was rejected.
      Please check your appointment status or contact the clinic.
    </p>
  </div>
)}

{/* Cancellation Form */}
{['direct', 'request'].includes(
  appointment.cancellationMode
) && !showModify && (

  <div className="mt-6 pt-5 border-t border-slate-200">

    <h4 className="font-semibold text-slate-800 mb-2">
      {appointment.cancellationMode === 'request'
        ? 'Request Cancellation'
        : 'Cancel Appointment'}
    </h4>

    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">

      <p className="text-sm font-semibold text-amber-800">
        Cancellation Policy
      </p>

      <p className="text-sm text-amber-700 mt-1">
        Confirmed appointments cancelled within{' '}
        {appointment.cancellationCutoffHours || 2}{' '}
        hours require admin approval.
      </p>

    </div>

    <p className="text-sm text-slate-500 mb-3">
      Enter your registered contact number to verify
      your appointment.
    </p>

    <input
      type="tel" inputMode="numeric"
      value={contactNumber}
      onChange={e => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
      placeholder="09XXXXXXXXX"
      maxLength={11}
      disabled={cancelling || loading || modifying}
      className="w-full border border-slate-300 rounded-lg px-3 py-3 mb-3 outline-none focus:border-teal-500"
    />

    {appointment.cancellationMode === 'request' && (
      <div className="mb-4">

        <label className="block text-sm font-medium text-slate-700 mb-2">
          Cancellation Reason
        </label>

        <textarea
          value={cancelReason}
          onChange={e => setCancelReason(e.target.value)}
          placeholder="Please explain why you need to cancel..."
          rows={4}
          maxLength={500}
          disabled={cancelling}
          className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-teal-500 resize-none"
        />

        <p className="text-xs text-slate-400 text-right">
          {cancelReason.length}/500
        </p>

      </div>
    )}

    <button
      type="button"
      onClick={openCancelConfirmation}
      disabled={cancelling || loading || modifying}
      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
    >
      {cancelling
        ? 'Processing...'
        : appointment.cancellationMode === 'request'
          ? 'Submit Cancellation Request'
          : 'Cancel Appointment'}
    </button>

  </div>
)}

{/* Unavailable Cancellation */}
{appointment.cancellationMode === 'unavailable' &&
  ['Pending', 'Confirmed'].includes(appointment.status) && (

  <div className="mt-5 bg-slate-100 rounded-lg p-4 text-sm text-slate-600">
    This appointment can no longer be cancelled or modified
    online. Please contact the clinic for assistance.
  </div>

)}
            </div>
          )}

        </div>

      </div>

    </div>
  )
}

export default TrackAppointment