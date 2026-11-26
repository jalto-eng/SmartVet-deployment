import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Stethoscope,
  Clock,
  X,
  RefreshCw
} from 'lucide-react'

const API = '/api'

const emptyForm = {
  name: '',
  description: '',
  duration: 30,
  price: '',
  active: true
}

function ServicesManagement({ session }) {
  const [services, setServices] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`
  }

  async function loadServices() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API}/admin/services`,
        { headers }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setServices(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function openEdit(service) {
    setEditing(service.id)
    setForm({
      name: service.name,
      description: service.description,
      duration: service.duration,
      price: service.price ?? '',
      active: service.active
    })

    setError('')
    setSuccess('')
    setShowForm(true)
  }

  async function saveService(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        editing
          ? `${API}/admin/services/${editing}`
          : `${API}/admin/services`,
        {
          method: editing ? 'PATCH' : 'POST',
          headers,
          body: JSON.stringify({
            ...form,
            duration: Number(form.duration),
            price:
              form.price === ''
                ? null
                : Number(form.price)
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      setShowForm(false)
      await loadServices()
      setSuccess(data.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleService(service) {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(
        `${API}/admin/services/${service.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            active: !service.active
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message)
      }

      await loadServices()

      setSuccess(
        service.active
          ? 'Service deactivated successfully!'
          : 'Service activated successfully!'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle =
    'w-full border border-slate-300 rounded-lg p-3 mt-2 focus:outline-none focus:ring-2 focus:ring-teal-500'

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">
            Veterinary Services
          </h2>

          <p className="text-slate-500 mt-2">
            Manage the services offered by your clinic.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadServices}
            disabled={saving}
            className="border bg-white rounded-lg p-3"
          >
            <RefreshCw size={20} />
          </button>

          <button
            onClick={openAdd}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-3 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Add Service
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-5">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-5">
          {success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ['Total Services', services.length],
          ['Active Services', services.filter(s => s.active).length],
          ['Inactive Services', services.filter(s => !s.active).length]
        ].map(([label, count]) => (
          <div
            key={label}
            className="bg-white border rounded-xl p-5"
          >
            <h3 className="text-3xl font-bold text-teal-700">
              {count}
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              {label}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-10">
          Loading services...
        </p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {services.map(service => (
            <div
              key={service.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="bg-teal-50 text-teal-600 p-3 rounded-xl">
                  <Stethoscope size={25} />
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  service.active
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {service.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-xl font-bold mt-5">
                {service.name}
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                {service.description}
              </p>

              <div className="flex items-center gap-2 text-teal-700 mt-4">
                <Clock size={17} />
                {service.duration} minutes
              </div>

              <p className="text-sm mt-3 text-slate-600">
                {service.price === null
                  ? 'Price: Contact clinic'
                  : `Estimated price: ₱${service.price.toLocaleString()}`}
              </p>

              <div className="flex gap-3 mt-5 border-t pt-4">
                <button
                  onClick={() => openEdit(service)}
                  disabled={saving}
                  className="flex-1 border rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <Pencil size={16} />
                  Edit
                </button>

                <button
                  disabled={saving}
                  onClick={() => toggleService(service)}
                  className={`flex-1 rounded-lg py-2 font-medium ${
                    service.active
                      ? 'bg-red-50 text-red-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {service.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-teal-700">
                {editing ? 'Edit Service' : 'Add Service'}
              </h2>

              <button
                disabled={saving}
                onClick={() => setShowForm(false)}
              >
                <X size={24} />
              </button>
            </div>

            {error && (
              <p className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
                {error}
              </p>
            )}

            <form onSubmit={saveService} className="space-y-4">
              <label className="block">
                Service Name

                <input
                  className={inputStyle}
                  value={form.name}
                  onChange={e => setForm({
                    ...form,
                    name: e.target.value
                  })}
                  required
                />
              </label>

              <label className="block">
                Description

                <textarea
                  className={inputStyle}
                  rows={3}
                  value={form.description}
                  onChange={e => setForm({
                    ...form,
                    description: e.target.value
                  })}
                />
              </label>

              <label className="block">
                Duration (Minutes)

                <select
                  className={inputStyle}
                  value={form.duration}
                  onChange={e => setForm({
                    ...form,
                    duration: Number(e.target.value)
                  })}
                >
                  {[30, 60, 90, 120, 150, 180, 210, 240].map(
                    duration => (
                      <option key={duration} value={duration}>
                        {duration} minutes
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                Estimated Price (Optional)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputStyle}
                  placeholder="Leave blank if not specified"
                  value={form.price}
                  onChange={e => setForm({
                    ...form,
                    price: e.target.value
                  })}
                />
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({
                    ...form,
                    active: e.target.checked
                  })}
                />

                Active Service
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Service'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ServicesManagement