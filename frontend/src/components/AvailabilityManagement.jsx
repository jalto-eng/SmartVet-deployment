import { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  CalendarOff,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

const API = '/api'

const days = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' }
]

const timeOptions = Array.from(
  { length: 48 },
  (_, index) => {
    const hour = Math.floor(index / 2)
    const minute = index % 2 === 0 ? '00' : '30'

    return `${String(hour).padStart(2, '0')}:${minute}`
  }
)

function displayTime(time) {
  const [hour, minute] = time.split(':').map(Number)

  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

function AvailabilityManagement({ session }) {
  const [settings, setSettings] = useState(null)
  const [blockedDate, setBlockedDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [conflicts, setConflicts] = useState([])

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`
  }

  const inputStyle =
    'w-full border border-slate-300 rounded-lg px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-teal-500'

  async function loadAvailability() {
    setLoading(true)
    setError('')
    setSuccess('')
    setConflicts([])

    try {
      const response = await fetch(
        `${API}/admin/availability`,
        { headers }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setSettings(data)

    } catch (err) {
      setError(
        err.message || 'Unable to load availability.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAvailability()
  }, [])

  function updateSetting(name, value) {
    setSettings(previous => ({
      ...previous,
      [name]: value
    }))

    setSuccess('')
    setError('')
    setConflicts([])
  }

  function toggleDay(day) {
    const selected =
      settings.workingDays.includes(day)

    const updatedDays = selected
      ? settings.workingDays.filter(
          item => item !== day
        )
      : [...settings.workingDays, day]

    updateSetting('workingDays', updatedDays)
  }

  function addBlockedDate() {
    setError('')
    setSuccess('')

    if (!blockedDate || !reason.trim()) {
      setError(
        'Please enter a date and reason.'
      )
      return
    }

    if (blockedDate < today) {
      setError('Please select a current or future date.')
      return
    }

    if (
      settings.blockedDates.some(
        item => item.date === blockedDate
      )
    ) {
      setError('This date is already blocked.')
      return
    }

    updateSetting('blockedDates', [
      ...settings.blockedDates,
      {
        date: blockedDate,
        reason: reason.trim()
      }
    ])

    setBlockedDate('')
    setReason('')
  }

  function removeBlockedDate(date) {
    updateSetting(
      'blockedDates',
      settings.blockedDates.filter(
        item => item.date !== date
      )
    )
  }

  async function saveSettings() {
    setSaving(true)
    setError('')
    setSuccess('')
    setConflicts([])

    try {
      const response = await fetch(
        `${API}/admin/availability`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(settings)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setConflicts(data.conflicts || [])
        throw new Error(data.message)
      }

      setSettings(data.availability)
      setSuccess(data.message)

    } catch (err) {
      setError(
        err.message || 'Unable to save availability.'
      )
    } finally {
      setSaving(false)
    }
  }

  function renderTimeSelect(label, name) {
    return (
      <label className="block font-medium text-slate-700">
        {label}

        <select
          value={settings[name]}
          onChange={event =>
            updateSetting(name, event.target.value)
          }
          className={inputStyle}
        >
          {timeOptions.map(time => (
            <option key={time} value={time}>
              {displayTime(time)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading clinic availability...
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-white rounded-xl border p-8">
        <p className="text-red-600">
          {error}
        </p>

        <button
          onClick={loadAvailability}
          className="mt-4 bg-teal-600 text-white px-5 py-3 rounded-lg"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            Clinic Availability
          </h2>

          <p className="text-slate-500 mt-2">
            Manage clinic schedules, operating hours,
            and unavailable dates.
          </p>
        </div>

        <button
          onClick={loadAvailability}
          disabled={saving}
          className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100"
        >
          <RefreshCw size={18} />
          Refresh
        </button>

      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">

          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>

          {conflicts.length > 0 && (
            <div className="mt-4 space-y-2">

              <p className="font-semibold">
                Conflicting Appointments
              </p>

              {conflicts.map(item => (
                <div
                  key={item.referenceNumber}
                  className="bg-white border border-red-200 p-3 rounded-lg text-sm"
                >
                  <p className="font-bold">
                    {item.referenceNumber}
                  </p>

                  <p>
                    {item.service}
                  </p>

                  <p>
                    {item.date} — {item.time}
                  </p>

                  <p>
                    Status: {item.status}
                  </p>
                </div>
              ))}

              <p className="text-sm">
                Resolve these appointments before
                changing the clinic schedule.
              </p>

            </div>
          )}

        </div>
      )}

      {/* Working Days */}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarDays className="text-teal-600" />
          Working Days
        </h3>

        <p className="text-sm text-slate-500 mt-2">
          Select the days when the clinic accepts appointments.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">

          {days.map(day => {
            const active =
              settings.workingDays.includes(day.id)

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleDay(day.id)}
                disabled={saving}
                className={`border rounded-xl p-4 text-center transition ${
                  active
                    ? 'bg-teal-50 border-teal-500 text-teal-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <p className="font-semibold">
                  {day.name}
                </p>

                <p className="text-xs mt-2">
                  {active ? 'Open' : 'Closed'}
                </p>
              </button>
            )
          })}

        </div>

      </section>

      {/* Operating Hours */}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="text-teal-600" />
          Operating Hours
        </h3>

        <p className="text-sm text-slate-500 mt-2">
          Set the daily opening and closing hours.
          All appointment slots use 30-minute intervals.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mt-6">

          {renderTimeSelect(
            'Opening Time',
            'openingTime'
          )}

          {renderTimeSelect(
            'Closing Time',
            'closingTime'
          )}

        </div>

      </section>

      {/* Lunch Break */}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <div className="flex items-center justify-between gap-4">

          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-teal-600" />
              Lunch Break
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Prevent bookings during clinic break hours.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={settings.breakEnabled}
            onClick={() =>
              updateSetting(
                'breakEnabled',
                !settings.breakEnabled
              )
            }
            className={`px-5 py-2 rounded-full font-medium ${
              settings.breakEnabled
                ? 'bg-teal-100 text-teal-700'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {settings.breakEnabled
              ? 'Enabled'
              : 'Disabled'}
          </button>

        </div>

        {settings.breakEnabled && (
          <div className="grid md:grid-cols-2 gap-5 mt-6">

            {renderTimeSelect(
              'Break Start',
              'breakStart'
            )}

            {renderTimeSelect(
              'Break End',
              'breakEnd'
            )}

          </div>
        )}

      </section>

      {/* Blocked Dates */}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarOff className="text-teal-600" />
          Blocked Dates
        </h3>

        <p className="text-sm text-slate-500 mt-2">
          Block holidays, clinic maintenance,
          or other unavailable dates.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-6 items-end">

          <label className="font-medium">
            Date

            <input
              type="date"
              min={today}
              value={blockedDate}
              onChange={event =>
                setBlockedDate(event.target.value)
              }
              className={inputStyle}
            />
          </label>

          <label className="font-medium">
            Reason

            <input
              type="text"
              value={reason}
              maxLength={150}
              onChange={event =>
                setReason(event.target.value)
              }
              placeholder="Example: Christmas Day"
              className={inputStyle}
            />
          </label>

          <button
            type="button"
            onClick={addBlockedDate}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-5 py-3 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Add Blocked Date
          </button>

        </div>

        <div className="mt-6 space-y-3">

          {settings.blockedDates.length === 0 && (
            <div className="text-center bg-slate-50 rounded-xl p-8 text-slate-500">
              No blocked dates.
            </div>
          )}

          {settings.blockedDates.map(item => (
            <div
              key={item.date}
              className="flex items-center justify-between gap-4 border border-slate-200 rounded-xl p-4"
            >

              <div>
                <p className="font-bold text-slate-800">
                  {item.date}
                </p>

                <p className="text-sm text-slate-500 mt-1 break-words">
                  {item.reason}
                </p>
              </div>

              <button
                type="button"
                aria-label={`Remove blocked date ${item.date}`}
                onClick={() =>
                  removeBlockedDate(item.date)
                }
                disabled={saving}
                className="text-red-600 hover:bg-red-50 p-3 rounded-lg"
              >
                <Trash2 size={20} />
              </button>

            </div>
          ))}

        </div>

      </section>

      {/* Save Settings */}

      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">

        <p className="text-sm text-slate-500">
          Changes will only take effect after saving.
        </p>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={20} />

          {saving
            ? 'Saving...'
            : 'Save Availability'}
        </button>

      </div>

    </div>
  )
}

export default AvailabilityManagement