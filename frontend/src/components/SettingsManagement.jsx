import { useState, useEffect } from 'react'
import ToastNotification from './ToastNotification'
import {
  Building2,
  ShieldCheck,
  Clock,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react'

const API = '/api'

function SettingsManagement({
  session,
  onLogout
}) {
  const [settings, setSettings] = useState(null)

  const [credentials, setCredentials] = useState({
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
const passwordsMismatch =
  credentials.confirmPassword.length > 0 &&
  credentials.newPassword !== credentials.confirmPassword
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showPasswords, setShowPasswords] =
    useState(false)

  const [credentialsUpdated, setCredentialsUpdated] =
    useState(false)

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`
  }

  const inputStyle =
    'w-full border border-slate-300 rounded-lg px-4 py-3 mt-2 outline-none focus:ring-2 focus:ring-teal-500'

  async function loadSettings() {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${API}/admin/settings`,
        { headers }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setSettings(data)

      setCredentials({
        username: data.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

    } catch (err) {
      setError(
        err.message || 'Unable to load settings.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  function updateSetting(name, value) {
    setSettings(previous => ({
      ...previous,
      [name]: value
    }))

    setError('')
    setSuccess('')
  }

  function updateCredential(event) {
    const { name, value } = event.target

    setCredentials(previous => ({
      ...previous,
      [name]: value
    }))

    setError('')
    setSuccess('')
  }

  // SAVE GENERAL SETTINGS

  async function saveSettings(event) {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${API}/admin/settings`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(settings)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setSettings(data.settings)
      setSuccess(data.message)

    } catch (err) {
      setError(
        err.message || 'Unable to save settings.'
      )
    } finally {
      setSaving(false)
    }
  }

  // UPDATE ADMIN CREDENTIALS

  async function updateCredentials(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (
      credentials.newPassword !==
      credentials.confirmPassword
    ) {
      setError('Passwords do not match.')
      return
    }

    setUpdating(true)

    try {
      const response = await fetch(
        `${API}/admin/settings/credentials`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify(credentials)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setCredentials({
        username: credentials.username,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      setCredentialsUpdated(true)

    } catch (err) {
      setError(
        err.message || 'Unable to update credentials.'
      )
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16 text-slate-500">
        Loading system settings...
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-white border rounded-xl p-8">

        <p className="text-red-600">
          {error}
        </p>

        <button
          onClick={loadSettings}
          className="mt-4 bg-teal-600 text-white px-5 py-3 rounded-lg"
        >
          Try Again
        </button>

      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Credentials Success Modal */}

      {credentialsUpdated && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">

          <div
            role="dialog"
            aria-modal="true"
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center"
          >

            <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={42} />
            </div>

            <h2 className="text-2xl font-bold text-slate-800">
              Credentials Updated!
            </h2>

            <p className="text-slate-500 mt-3">
              Your administrator credentials have been
              updated successfully. Please log in again
              using your new credentials.
            </p>

            <button
              onClick={onLogout}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 font-semibold mt-6"
            >
              Return to Login
            </button>

          </div>

        </div>
      )}

      {/* Heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            System Settings
          </h2>

          <p className="text-slate-500 mt-2">
            Manage clinic information, administrator
            security, and appointment policies.
          </p>
        </div>

        <button
          onClick={loadSettings}
          disabled={saving || updating}
          className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100"
        >
          <RefreshCw size={18} />
          Refresh
        </button>

      </div>

      {/* Floating Notification */}

<ToastNotification
  message={error || success}
  type={error ? 'error' : 'success'}
  onClose={() => {
    setError('')
    setSuccess('')
  }}
/>

      <form
        onSubmit={saveSettings}
        className="space-y-6"
      >

        <fieldset
          disabled={saving || updating}
          className="space-y-6"
        >

          {/* Clinic Information */}

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-teal-600" />
              Clinic Information
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Update the clinic's general information.
            </p>

            <div className="grid md:grid-cols-2 gap-5 mt-6">

              <label className="font-medium">
                Clinic Name

                <input
                  type="text"
                  value={settings.clinicName}
                  onChange={event =>
                    updateSetting(
                      'clinicName',
                      event.target.value
                    )
                  }
                  maxLength={100}
                  className={inputStyle}
                  required
                />
              </label>

              <label className="font-medium">
                Contact Number

                <input
                  type="tel"
                  value={settings.contactNumber}
                  onChange={event =>
                    updateSetting(
                      'contactNumber',
                      event.target.value
                    )
                  }
                  maxLength={30}
                  placeholder="Enter clinic contact number"
                  className={inputStyle}
                />
              </label>

              <label className="font-medium md:col-span-2">
                Email Address

                <input
                  type="email"
                  value={settings.email}
                  onChange={event =>
                    updateSetting(
                      'email',
                      event.target.value
                    )
                  }
                  maxLength={150}
                  placeholder="Enter clinic email"
                  className={inputStyle}
                />
              </label>

              <label className="font-medium md:col-span-2">
                Clinic Address

                <textarea
                  value={settings.address}
                  onChange={event =>
                    updateSetting(
                      'address',
                      event.target.value
                    )
                  }
                  maxLength={300}
                  placeholder="Enter clinic address"
                  rows={3}
                  className={inputStyle}
                />
              </label>

            </div>

          </section>

          {/* Appointment Policies */}

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-teal-600" />
              Appointment Policies
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Configure cancellation and rescheduling
              restrictions.
            </p>

            <div className="grid md:grid-cols-2 gap-5 mt-6">

              <label className="font-medium">
                Cancellation Cutoff (Hours)

                <input
                  type="number"
                  min={1}
                  max={72}
                  step={1}
                  value={settings.cancellationCutoffHours}
                  onChange={event =>
                    updateSetting(
                      'cancellationCutoffHours',
                      Number(event.target.value)
                    )
                  }
                  className={inputStyle}
                  required
                />

                <p className="text-xs text-slate-500 mt-2">
                  Confirmed appointments within this
                  period require cancellation approval.
                </p>

              </label>

              <label className="font-medium">
                Rescheduling Cutoff (Hours)

                <input
                  type="number"
                  min={settings.cancellationCutoffHours}
                  max={72}
                  step={1}
                  value={settings.reschedulingCutoffHours}
                  onChange={event =>
                    updateSetting(
                      'reschedulingCutoffHours',
                      Number(event.target.value)
                    )
                  }
                  className={inputStyle}
                  required
                />

                <p className="text-xs text-slate-500 mt-2">
                  Confirmed appointments within this
                  period cannot be modified online.
                </p>

              </label>

            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 mt-6 text-sm">

              <p className="font-semibold mb-2">
                Appointment Policy
              </p>

              <p>
                Pending appointments can still be
                cancelled or modified before their
                scheduled time.
              </p>

              <p className="mt-2">
                Confirmed appointments follow the
                configured cutoff periods.
              </p>

              <p className="mt-2">
                The rescheduling cutoff cannot be shorter
                than the cancellation cutoff.
              </p>

            </div>

          </section>

          <div className="flex justify-end">

            <button
              type="submit"
              disabled={saving || updating}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />

              {saving
                ? 'Saving...'
                : 'Save Settings'}
            </button>

          </div>

        </fieldset>

      </form>

      {/* Administrator Account */}

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">

        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="text-teal-600" />
          Administrator Account
        </h3>

        <p className="text-sm text-slate-500 mt-2">
          Update your administrator username and password.
        </p>

        <form
          onSubmit={updateCredentials}
          className="mt-6"
        >

          <fieldset
            disabled={saving || updating}
          >

            <div className="grid md:grid-cols-2 gap-5">

              <label className="font-medium">
                Username

                <input
                  type="text"
                  name="username"
                  value={credentials.username}
                  onChange={updateCredential}
                  minLength={3}
                  maxLength={30}
                  autoComplete="username"
                  className={inputStyle}
                  required
                />
              </label>

              <label className="font-medium">
                Current Password

                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="currentPassword"
                  value={credentials.currentPassword}
                  onChange={updateCredential}
                  autoComplete="current-password"
                  maxLength={128}
                  className={inputStyle}
                  required
                />
              </label>

              <label className="font-medium">
                New Password

                <input
                  type={showPasswords ? 'text' : 'password'}
                  name="newPassword"
                  value={credentials.newPassword}
                  onChange={updateCredential}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className={inputStyle}
                  required
                />
              </label>

              <label className="font-medium">
  Confirm New Password

  <input
    type={showPasswords ? 'text' : 'password'}
    name="confirmPassword"
    value={credentials.confirmPassword}
    onChange={updateCredential}
    autoComplete="new-password"
    maxLength={128}
    aria-invalid={passwordsMismatch}
    className={`${inputStyle} ${
      passwordsMismatch
        ? 'border-red-500 focus:ring-red-500'
        : ''
    }`}
    required
  />

  {passwordsMismatch && (
    <p className="text-red-600 text-sm mt-2 flex items-center gap-2">
      <AlertCircle size={16} />
      Passwords do not match.
    </p>
  )}
</label>

            </div>

            <button
              type="button"
              onClick={() =>
                setShowPasswords(previous => !previous)
              }
              className="flex items-center gap-2 text-sm text-teal-700 mt-4"
            >

              {showPasswords
                ? <EyeOff size={18} />
                : <Eye size={18} />}

              {showPasswords
                ? 'Hide Passwords'
                : 'Show Passwords'}

            </button>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-6 text-sm text-slate-600">

              For security, updating your credentials
              will end all existing administrator sessions.
              You will need to log in again.

            </div>

            <div className="flex justify-end mt-6">

              <button
                type="submit"
                disabled={
  saving ||
  updating ||
  passwordsMismatch ||
  !credentials.newPassword ||
  !credentials.confirmPassword
}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck size={20} />

                {updating
                  ? 'Updating...'
                  : 'Update Credentials'}
              </button>

            </div>

          </fieldset>

        </form>

      </section>

    </div>
  )
}

export default SettingsManagement