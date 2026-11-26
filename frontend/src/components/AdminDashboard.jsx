import ServicesManagement from './ServicesManagement'
import AvailabilityManagement from './AvailabilityManagement'
import SettingsManagement from './SettingsManagement'
import AnalyticsManagement from './AnalyticsManagement'
import ToastNotification from './ToastNotification'
import { useState, useEffect } from 'react'
import {
  PawPrint,
  CalendarDays,
  Clock,
  CheckCircle,
  ClipboardCheck,
  XCircle,
  Ban,
  Search,
  LogOut,
  RefreshCw,
  Trash2,
  Eye,
  X
} from 'lucide-react'

const API = '/api'

function AdminDashboard({ session, onLogout }) {
    const [activeTab, setActiveTab] = useState('Dashboard')
  const [appointments, setAppointments] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
const [reviewing, setReviewing] = useState(false)
const [cancelDecision, setCancelDecision] = useState(null)
const [appointmentAction, setAppointmentAction] =
  useState(null)

const [processingAction, setProcessingAction] =
  useState(false)
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.token}`
  }

  async function loadAppointments() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API}/appointments`,
        { headers }
      )

      if (!response.ok) {
        throw new Error('Unable to load appointments.')
      }

      const data = await response.json()
      setAppointments(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  function updateStatus(id, status) {
  const appointment = appointments.find(
    item => item.id === id
  )

  setAppointmentAction({
    id,
    status,
    referenceNumber: appointment?.referenceNumber
  })
}

function deleteAppointment(id) {
  const appointment = appointments.find(
    item => item.id === id
  )

  setAppointmentAction({
    id,
    status: 'Delete',
    referenceNumber: appointment?.referenceNumber
  })
}

async function confirmAppointmentAction() {
  if (!appointmentAction || processingAction) return

  const { id, status } = appointmentAction
  const isDelete = status === 'Delete'

  setProcessingAction(true)
  setError('')
  setSuccess('')

  try {
    const response = await fetch(
      `${API}/appointments/${id}`,
      {
        method: isDelete ? 'DELETE' : 'PATCH',
        headers,
        ...(isDelete
          ? {}
          : {
              body: JSON.stringify({ status })
            })
      }
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.message || 'Unable to process appointment.'
      )
    }

    setAppointmentAction(null)
    setSelected(null)

    await loadAppointments()

    setSuccess(
      isDelete
        ? 'Appointment deleted successfully!'
        : `Appointment ${status.toLowerCase()} successfully!`
    )

  } catch (err) {
    setError(
      err.message || 'Unable to connect to the server.'
    )

    setAppointmentAction(null)

  } finally {
    setProcessingAction(false)
  }
}
async function reviewCancellation() {
  if (!cancelDecision || reviewing) return

  const { id, decision } = cancelDecision

  setReviewing(true)
  setError('')
  setSuccess('')

  try {
    const response = await fetch(
      `${API}/appointments/${id}/cancellation-request`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ decision })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      setError(data.message || 'Unable to review cancellation.')
      setCancelDecision(null)
      return
    }

    setCancelDecision(null)
    setSelected(null)

    await loadAppointments()

    setSuccess(data.message)

  } catch {
    setError('Unable to connect to the server.')
    setCancelDecision(null)
  } finally {
    setReviewing(false)
  }
}
  const countStatus = (status) =>
    appointments.filter(
      (item) => item.status === status
    ).length
const cancellationRequests = appointments.filter(
  item => item.cancellationRequest?.status === 'Pending'
)
  const stats = [
    {
      name: 'Total Appointments',
      count: appointments.length,
      icon: CalendarDays,
      color: 'text-teal-600 bg-teal-50'
    },
    {
      name: 'Pending',
      count: countStatus('Pending'),
      icon: Clock,
      color: 'text-amber-600 bg-amber-50'
    },
    {
      name: 'Confirmed',
      count: countStatus('Confirmed'),
      icon: CheckCircle,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      name: 'Completed',
      count: countStatus('Completed'),
      icon: ClipboardCheck,
      color: 'text-green-600 bg-green-50'
    },
    {
      name: 'Cancelled',
      count: countStatus('Cancelled'),
      icon: XCircle,
      color: 'text-red-600 bg-red-50'
    },
    {
      name: 'Rejected',
      count: countStatus('Rejected'),
      icon: Ban,
      color: 'text-slate-600 bg-slate-100'
    }
  ]

  const statusColors = {
    Pending: 'bg-amber-100 text-amber-700',
    Confirmed: 'bg-blue-100 text-blue-700',
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
    Rejected: 'bg-slate-200 text-slate-700'
  }

  const filteredAppointments = appointments.filter(
    (item) => {
      const matchesSearch = [
        item.referenceNumber,
        item.ownerName,
        item.petName,
        item.service
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search.toLowerCase())
      )

      const matchesFilter =
        filter === 'All' || item.status === filter

      return matchesSearch && matchesFilter
    }
  )

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navigation */}
      <nav className="bg-teal-700 text-white px-6 py-4 shadow">

        <div className="max-w-7xl mx-auto flex items-center justify-between">

          <div className="flex items-center gap-3">
            <PawPrint size={32} />

            <div>
              <h1 className="text-2xl font-bold">
                SmartVet
              </h1>

              <p className="text-teal-100 text-sm">
                Administration Portal
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>
      </nav>
<div className="bg-white border-b border-slate-200">
  <div className="max-w-7xl mx-auto px-6 flex gap-6">

    {['Dashboard', 'Services', 'Availability', 'Settings', 'Analytics'].map(tab => (
      <button
        key={tab}
        onClick={() => {
          setSelected(null)
          setCancelDecision(null)
          setActiveTab(tab)
        }}
        className={`py-4 font-medium border-b-2 ${
          activeTab === tab
            ? 'border-teal-600 text-teal-700'
            : 'border-transparent text-slate-500'
        }`}
      >
        {tab}
      </button>
    ))}

  </div>
</div>
      <main className="max-w-7xl mx-auto px-6 py-8">
{activeTab === 'Services' ? (
  <ServicesManagement session={session} />
) : activeTab === 'Availability' ? (
  <AvailabilityManagement session={session} />
) : activeTab === 'Settings' ? (
  <SettingsManagement
    session={session}
    onLogout={onLogout}
  />
) : activeTab === 'Analytics' ? (
  <AnalyticsManagement session={session} />
) : (
  <>
        {/* Dashboard Heading */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">

          <div>
            <h2 className="text-3xl font-bold text-slate-800">
              Dashboard Overview
            </h2>

            <p className="text-slate-500 mt-2">
              Manage veterinary appointments and records.
            </p>
          </div>

          <button
            onClick={loadAppointments}
            className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">

          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
            >

              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>

              <h3 className="text-3xl font-bold mt-4">
                {stat.count}
              </h3>

              <p className="text-sm text-slate-500 mt-1">
                {stat.name}
              </p>

            </div>
          ))}

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
{/* Cancellation Requests */}
<section className="bg-white border border-slate-200 rounded-xl shadow-sm mb-8">

  <div className="p-6 border-b border-slate-200">

    <div className="flex flex-wrap items-center justify-between gap-3">

      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck size={24} className="text-amber-600" />
          Cancellation Requests
        </h2>

        <p className="text-sm text-slate-500 mt-2">
          Review late appointment cancellation requests.
        </p>
      </div>

      <span className="bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold">
        {cancellationRequests.length} Pending
      </span>

    </div>

  </div>

  <div className="p-6">

    {cancellationRequests.length === 0 ? (

      <div className="text-center py-8">

        <CheckCircle
          size={40}
          className="mx-auto text-slate-300 mb-3"
        />

        <p className="font-medium text-slate-600">
          No pending cancellation requests
        </p>

        <p className="text-sm text-slate-400 mt-1">
          New cancellation requests will appear here.
        </p>

      </div>

    ) : (

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {cancellationRequests.map(item => (

          <div
            key={item.id}
            className="border border-amber-200 rounded-xl p-5 bg-amber-50/30"
          >

            <div className="flex justify-between items-center gap-2 mb-4">

              <h3 className="font-bold text-teal-700">
                {item.referenceNumber}
              </h3>

              <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                Awaiting Review
              </span>

            </div>

            <div className="space-y-3 text-sm">

              {[
                ['Owner', item.ownerName],
                ['Pet', item.petName],
                ['Contact Number', item.contactNumber],
                ['Service', item.service],
                ['Date', item.date],
                ['Time', item.time]
              ].map(([label, value]) => (

                <div
                  key={label}
                  className="flex justify-between gap-3"
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

            <div className="bg-white border border-slate-200 rounded-lg p-4 mt-5">

              <h4 className="font-semibold text-slate-700 mb-2">
                Cancellation Reason
              </h4>

              <p className="text-sm text-slate-600 break-words whitespace-pre-wrap">
                {item.cancellationRequest.reason}
              </p>

            </div>

            <p className="text-xs text-slate-500 mt-3">
              Requested on:{' '}
              {new Date(
                item.cancellationRequest.requestedAt
              ).toLocaleString('en-PH', {
                timeZone: 'Asia/Manila'
              })}
            </p>

            <div className="flex gap-3 mt-5">

              <button
                type="button"
                disabled={reviewing || loading}
                onClick={() => setCancelDecision({
                  id: item.id,
                  referenceNumber: item.referenceNumber,
                  decision: 'Approved'
                })}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                Approve Request
              </button>

              <button
                type="button"
                disabled={reviewing || loading}
                onClick={() => setCancelDecision({
                  id: item.id,
                  referenceNumber: item.referenceNumber,
                  decision: 'Rejected'
                })}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
              >
                Reject Request
              </button>

            </div>

          </div>

        ))}

      </div>

    )}

  </div>

</section>
        {/* Appointment Management */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          <div className="p-6 border-b border-slate-200">

            <h2 className="text-xl font-bold text-slate-800">
              Appointment Management
            </h2>

            <div className="flex flex-col md:flex-row gap-4 mt-5">

              <div className="relative flex-1">

                <Search
                  size={20}
                  className="absolute left-3 top-3 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search reference, owner, pet or service..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-3 outline-none focus:border-teal-500"
                />

              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-4 py-3"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>

            </div>
          </div>

          {loading ? (
            <p className="p-10 text-center text-slate-500">
              Loading appointments...
            </p>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full text-sm text-left">

                <thead className="bg-slate-50 text-slate-600">

                  <tr>
                    {[
                      'Reference',
                      'Owner',
                      'Pet',
                      'Service',
                      'Schedule',
                      'Status',
                      'Actions'
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>

                </thead>

                <tbody>

                  {filteredAppointments.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >

                      <td className="px-5 py-4 font-semibold text-teal-700 whitespace-nowrap">
                        {item.referenceNumber}
                      </td>

                      <td className="px-5 py-4">
                        {item.ownerName}
                      </td>

                      <td className="px-5 py-4">
                        {item.petName}
                      </td>

                      <td className="px-5 py-4">
                        {item.service}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.date}
                        <p className="text-slate-500 mt-1">
                          {item.time}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-slate-100'}`}>
                         {item.status}
</span>

{item.cancellationRequest?.status === 'Pending' && (
  <p className="text-xs text-amber-600 font-medium mt-2">
    Cancellation Requested
  </p>
)}

</td>

                      <td className="px-5 py-4">

                        <div className="flex flex-wrap gap-2">

                          <button
                            onClick={() => setSelected(item)}
                            title="View Details"
                            className="p-2 bg-teal-50 text-teal-700 rounded-lg"
                          >
                            <Eye size={18} />
                          </button>

                          {item.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(item.id, 'Confirmed')}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() => updateStatus(item.id, 'Rejected')}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {item.status === 'Confirmed' &&
  item.cancellationRequest?.status !== 'Pending' && (
                            <>
                              <button
                                onClick={() => updateStatus(item.id, 'Completed')}
                                className="px-3 py-2 bg-teal-600 text-white rounded-lg"
                              >
                                Complete
                              </button>

                              <button
                                onClick={() => updateStatus(item.id, 'Cancelled')}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          <button
  onClick={() => deleteAppointment(item.id)}
  disabled={item.cancellationRequest?.status === 'Pending'}
  title={
    item.cancellationRequest?.status === 'Pending'
      ? 'Review cancellation request first'
      : 'Delete Appointment'
  }
  className="p-2 bg-red-50 text-red-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
>
  <Trash2 size={18} />
</button>

                        </div>

                      </td>
                    </tr>
                  ))}

                  {filteredAppointments.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center p-10 text-slate-500"
                      >
                        No appointments found.
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>

            </div>
          )}
        </section>
</>
)}
</main>
{/* Appointment Action Confirmation Modal */}

{appointmentAction && (
  <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appointment-action-title"
      className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6"
    >

      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
        ['Rejected', 'Cancelled', 'Delete'].includes(
          appointmentAction.status
        )
          ? 'bg-red-100 text-red-600'
          : 'bg-green-100 text-green-600'
      }`}>

        {appointmentAction.status === 'Delete' ? (
          <Trash2 size={32} />
        ) : ['Rejected', 'Cancelled'].includes(
          appointmentAction.status
        ) ? (
          <XCircle size={32} />
        ) : appointmentAction.status === 'Completed' ? (
          <ClipboardCheck size={32} />
        ) : (
          <CheckCircle size={32} />
        )}

      </div>

      <h2
        id="appointment-action-title"
        className="text-xl font-bold text-slate-800 text-center"
      >

        {{
          Confirmed: 'Approve Appointment?',
          Rejected: 'Reject Appointment?',
          Completed: 'Complete Appointment?',
          Cancelled: 'Cancel Appointment?',
          Delete: 'Delete Appointment?'
        }[appointmentAction.status]}

      </h2>

      <p className="text-sm text-teal-700 font-semibold text-center mt-2">
        {appointmentAction.referenceNumber}
      </p>

      <p className="text-sm text-slate-500 text-center mt-4 mb-6">

        {{
          Confirmed:
            'Are you sure you want to approve this appointment?',

          Rejected:
            'This appointment will be rejected and its reserved time slot will be released.',

          Completed:
            'Are you sure you want to mark this appointment as completed?',

          Cancelled:
            'This appointment will be cancelled and its reserved time slot will be released.',

          Delete:
            'This appointment will be permanently deleted. This action cannot be undone.'
        }[appointmentAction.status]}

      </p>

      <div className="flex gap-3">

        <button
          type="button"
          disabled={processingAction}
          onClick={() => setAppointmentAction(null)}
          className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          Go Back
        </button>

        <button
          type="button"
          disabled={processingAction}
          onClick={confirmAppointmentAction}
          className={`flex-1 text-white py-3 rounded-lg font-medium disabled:opacity-50 ${
            ['Rejected', 'Cancelled', 'Delete'].includes(
              appointmentAction.status
            )
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-teal-600 hover:bg-teal-700'
          }`}
        >

          {processingAction
            ? 'Processing...'
            : {
                Confirmed: 'Yes, Approve',
                Rejected: 'Yes, Reject',
                Completed: 'Yes, Complete',
                Cancelled: 'Yes, Cancel',
                Delete: 'Yes, Delete'
              }[appointmentAction.status]}

        </button>

      </div>

    </div>

  </div>
)}
{/* Cancellation Decision Modal */}
{cancelDecision && (
  <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">

    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">

      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
        cancelDecision.decision === 'Approved'
          ? 'bg-green-100 text-green-600'
          : 'bg-red-100 text-red-600'
      }`}>

        {cancelDecision.decision === 'Approved'
          ? <CheckCircle size={32} />
          : <XCircle size={32} />}

      </div>

      <h2 className="text-xl font-bold text-slate-800 text-center">

        {cancelDecision.decision === 'Approved'
          ? 'Approve Cancellation?'
          : 'Reject Cancellation?'}

      </h2>

      <p className="text-sm text-teal-700 font-semibold text-center mt-2">
        {cancelDecision.referenceNumber}
      </p>

      <p className="text-sm text-slate-500 text-center mt-4 mb-6">

        {cancelDecision.decision === 'Approved'
          ? 'The appointment will be cancelled and its reserved time slot will become available for other customers.'
          : 'The cancellation request will be rejected. The appointment will remain confirmed and its time slot will stay reserved.'}

      </p>

      <div className="flex gap-3">

        <button
          type="button"
          disabled={reviewing}
          onClick={() => setCancelDecision(null)}
          className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          Go Back
        </button>

        <button
          type="button"
          disabled={reviewing}
          onClick={reviewCancellation}
          className={`flex-1 text-white py-3 rounded-lg font-medium disabled:opacity-50 ${
            cancelDecision.decision === 'Approved'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >

          {reviewing
            ? 'Processing...'
            : cancelDecision.decision === 'Approved'
              ? 'Yes, Approve'
              : 'Yes, Reject'}

        </button>

      </div>

    </div>

  </div>
)}
      {/* Appointment Details Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden">

            <div className="bg-teal-600 text-white p-5 flex justify-between items-center">

              <h2 className="text-xl font-bold">
                Appointment Details
              </h2>

              <button onClick={() => setSelected(null)}>
                <X size={24} />
              </button>

            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">

              {[
                ['Reference Number', selected.referenceNumber],
                ['Owner Name', selected.ownerName],
                ['Contact Number', selected.contactNumber],
                ['Pet Name', selected.petName],
                ['Species', selected.species],
                ['Breed', selected.breed],
                ['Age', selected.age],
                ['Service', selected.service],
                ['Date', selected.date],
                ['Time', selected.time],
                ['Status', selected.status],
                ['Notes', selected.notes || 'None']
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 py-3 border-b border-slate-100"
                >
                  <span className="text-slate-500">
                    {label}
                  </span>

                  <span className="font-medium text-right break-words min-w-0">
                    {value}
                  </span>
                </div>
              ))}

            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default AdminDashboard