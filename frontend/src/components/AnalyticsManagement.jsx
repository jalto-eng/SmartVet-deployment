import { useState, useEffect } from 'react'

import {
  CalendarDays,
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  TrendingUp,
  Download,
  RefreshCw,
  BarChart3,
  AlertCircle
} from 'lucide-react'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'

const API = '/api'

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Confirmed: '#3b82f6',
  Completed: '#0d9488',
  Cancelled: '#ef4444',
  Rejected: '#94a3b8'
}

function AnalyticsManagement({ session }) {
  const [range, setRange] = useState('30')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadAnalytics() {
      setLoading(true)
      setError('')
      setAnalytics(null)

      try {
        const response = await fetch(
          `${API}/admin/analytics?range=${range}`,
          {
            headers: {
              Authorization: `Bearer ${session.token}`
            },
            signal: controller.signal
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            data.message || 'Unable to load analytics.'
          )
        }

        if (!controller.signal.aborted) {
          setAnalytics(data)
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => controller.abort()

  }, [range, refreshKey, session.token])

  // EXPORT CSV REPORT

  function exportCSV() {
    if (!analytics?.records.length) return

    const headers = [
      'Reference Number',
      'Service',
      'Species',
      'Date',
      'Time',
      'Status'
    ]

    function escapeCSV(value) {
      let text = String(value ?? '')

      // Prevent spreadsheet formula injection
      if (/^[\s]*[=+\-@]/.test(text)) {
        text = "'" + text
      }

      return `"${text.replace(/"/g, '""')}"`
    }

    const rows = analytics.records.map(item => [
      item.referenceNumber,
      item.service,
      item.species,
      item.date,
      item.time,
      item.status
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(escapeCSV).join(','))
      .join('\r\n')

    const blob = new Blob(
      ['\uFEFF', csv],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')

    link.href = url
    link.download = `SmartVet-Report-${
      range === 'all' ? 'All-Time' : range + '-Days'
    }.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
  }

  function formatDate(date) {
    return new Date(
      `${date}T00:00:00Z`
    ).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    })
  }

  const summary = analytics?.summary

  const stats = summary ? [
    {
      name: 'Total Appointments',
      value: summary.total,
      icon: CalendarDays,
      color: 'bg-teal-50 text-teal-600'
    },
    {
      name: 'Pending',
      value: summary.pending,
      icon: Clock,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      name: 'Confirmed',
      value: summary.confirmed,
      icon: CheckCircle,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      name: 'Completed',
      value: summary.completed,
      icon: ClipboardCheck,
      color: 'bg-green-50 text-green-600'
    },
    {
      name: 'Cancelled',
      value: summary.cancelled,
      icon: XCircle,
      color: 'bg-red-50 text-red-600'
    },
    {
      name: 'Rejected',
      value: summary.rejected,
      icon: Ban,
      color: 'bg-slate-100 text-slate-600'
    }
  ] : []

  const panelStyle =
    'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm'

  return (
    <div className="space-y-6">

      {/* PAGE HEADING */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h2 className="text-3xl font-bold text-slate-800">
            Analytics & Reports
          </h2>

          <p className="text-slate-500 mt-2">
            Monitor clinic appointments and service
            performance.
          </p>

        </div>

        <div className="flex flex-wrap gap-3">

          <select
            value={range}
            onChange={event => setRange(event.target.value)}
            className="bg-white border border-slate-300 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            type="button"
            onClick={() => setRefreshKey(value => value + 1)}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-slate-300 px-4 py-3 rounded-lg hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            Refresh
          </button>

          <button
            type="button"
            onClick={exportCSV}
            disabled={
              loading || !analytics?.records.length
            }
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            <Download size={18} />
            Export CSV
          </button>

        </div>

      </div>

      {/* DATE RANGE INFORMATION */}

      <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-xl p-4 text-sm">

        Reports are based on scheduled appointment dates.

        {range === 'all'
          ? ' All existing appointment records are included.'
          : ' The selected period includes today and previous dates.'}

      </div>

      {/* ERROR MESSAGE */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {loading ? (

        <div className="text-center py-20 text-slate-500">
          Loading analytics...
        </div>

      ) : analytics && (

        <>

          {/* STATISTICS CARDS */}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

            {stats.map(stat => (

              <div
                key={stat.name}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
              >

                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={24} />
                </div>

                <h3 className="text-3xl font-bold mt-4">
                  {stat.value}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {stat.name}
                </p>

              </div>

            ))}

          </div>

          {/* PERFORMANCE RATES */}

          <div className="grid md:grid-cols-2 gap-6">

            <div className={panelStyle}>

              <div className="flex items-center gap-3">

                <div className="bg-green-100 text-green-600 p-3 rounded-xl">
                  <TrendingUp size={26} />
                </div>

                <div>

                  <p className="text-slate-500 text-sm">
                    Completion Rate
                  </p>

                  <h3 className="text-3xl font-bold text-green-600">
                    {summary.completionRate}%
                  </h3>

                </div>

              </div>

              <div className="bg-slate-100 h-3 rounded-full mt-5 overflow-hidden">

                <div
                  className="bg-green-500 h-full rounded-full"
                  style={{
                    width: `${summary.completionRate}%`
                  }}
                />

              </div>

              <p className="text-xs text-slate-500 mt-3">
                {summary.completed} completed out of{' '}
                {summary.total} appointments.
              </p>

            </div>

            <div className={panelStyle}>

              <div className="flex items-center gap-3">

                <div className="bg-red-100 text-red-600 p-3 rounded-xl">
                  <XCircle size={26} />
                </div>

                <div>

                  <p className="text-slate-500 text-sm">
                    Cancellation Rate
                  </p>

                  <h3 className="text-3xl font-bold text-red-600">
                    {summary.cancellationRate}%
                  </h3>

                </div>

              </div>

              <div className="bg-slate-100 h-3 rounded-full mt-5 overflow-hidden">

                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{
                    width: `${summary.cancellationRate}%`
                  }}
                />

              </div>

              <p className="text-xs text-slate-500 mt-3">
                {summary.cancelled} cancelled out of{' '}
                {summary.total} appointments.
              </p>

            </div>

          </div>

          {summary.total === 0 ? (

            <div className={`${panelStyle} text-center py-16`}>

              <BarChart3
                size={48}
                className="mx-auto text-slate-300 mb-4"
              />

              <h3 className="font-bold text-slate-700">
                No Appointment Data
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Try selecting a different date range
                or All Time.
              </p>

            </div>

          ) : (

            <>

              {/* APPOINTMENT TRENDS */}

              <section className={panelStyle}>

                <h3 className="text-xl font-bold text-slate-800">
                  Appointment Trends
                </h3>

                <p className="text-sm text-slate-500 mt-1 mb-6">
                  Number of appointments per scheduled date.
                </p>

                <div className="w-full h-72">

                  <ResponsiveContainer width="100%" height="100%">

                    <LineChart data={analytics.trends}>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 11 }}
                        minTickGap={20}
                      />

                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />

                      <Tooltip
                        labelFormatter={formatDate}
                      />

                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Appointments"
                        stroke="#0d9488"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />

                    </LineChart>

                  </ResponsiveContainer>

                </div>

              </section>

              <div className="grid xl:grid-cols-2 gap-6">

                {/* STATUS DISTRIBUTION */}

                <section className={panelStyle}>

                  <h3 className="text-xl font-bold text-slate-800">
                    Appointment Status Distribution
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Breakdown of appointment statuses.
                  </p>

                  <div className="w-full h-64">

                    <ResponsiveContainer width="100%" height="100%">

                      <PieChart>

                        <Pie
                          data={analytics.statusDistribution.filter(
                            item => item.value > 0
                          )}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={2}
                        >

                          {analytics.statusDistribution
                            .filter(item => item.value > 0)
                            .map(item => (

                              <Cell
                                key={item.name}
                                fill={STATUS_COLORS[item.name]}
                              />

                            ))}

                        </Pie>

                        <Tooltip />

                      </PieChart>

                    </ResponsiveContainer>

                  </div>

                  <div className="space-y-3">

                    {analytics.statusDistribution.map(item => (

                      <div
                        key={item.name}
                        className="flex items-center justify-between text-sm"
                      >

                        <div className="flex items-center gap-2">

                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                STATUS_COLORS[item.name]
                            }}
                          />

                          {item.name}

                        </div>

                        <span className="font-semibold">
                          {item.value}
                        </span>

                      </div>

                    ))}

                  </div>

                </section>

                {/* MOST BOOKED SERVICES */}

                <section className={panelStyle}>

                  <h3 className="text-xl font-bold text-slate-800">
                    Most Booked Services
                  </h3>

                  <p className="text-sm text-slate-500 mt-1 mb-6">
                    Veterinary services ranked by booking count.
                  </p>

                  <div className="space-y-5">

                    {analytics.popularServices
                      .slice(0, 8)
                      .map((item, index) => (

                        <div key={item.name}>

                          <div className="flex justify-between gap-3 text-sm mb-2">

                            <span className="font-medium text-slate-700">
                              {index + 1}. {item.name}
                            </span>

                            <span className="font-bold text-teal-700">
                              {item.count}
                            </span>

                          </div>

                          <div className="bg-slate-100 h-3 rounded-full overflow-hidden">

                            <div
                              className="bg-teal-500 h-full rounded-full"
                              style={{
                                width: `${
                                  item.count /
                                  analytics.popularServices[0].count *
                                  100
                                }%`
                              }}
                            />

                          </div>

                        </div>

                      ))}

                  </div>

                </section>

              </div>

              {/* BUSIEST DAYS */}

              <section className={panelStyle}>

                <h3 className="text-xl font-bold text-slate-800">
                  Busiest Days of the Week
                </h3>

                <p className="text-sm text-slate-500 mt-1 mb-6">
                  Appointment volume grouped by weekday.
                </p>

                <div className="w-full h-72">

                  <ResponsiveContainer width="100%" height="100%">

                    <BarChart data={analytics.busiestDays}>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />

                      <XAxis dataKey="day" />

                      <YAxis allowDecimals={false} />

                      <Tooltip />

                      <Bar
                        dataKey="count"
                        name="Appointments"
                        fill="#0d9488"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={65}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </section>

              {/* REPORT TABLE */}

              <section className={panelStyle}>

                <div className="flex flex-wrap justify-between items-center gap-3 mb-6">

                  <div>

                    <h3 className="text-xl font-bold text-slate-800">
                      Appointment Report
                    </h3>

                    <p className="text-sm text-slate-500 mt-1">
                      {analytics.records.length} records
                      in the selected period.
                    </p>

                  </div>

                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 text-teal-700 border border-teal-200 px-4 py-2 rounded-lg hover:bg-teal-50"
                  >
                    <Download size={18} />
                    Download Full Report
                  </button>

                </div>

                <div className="overflow-x-auto">

                  <table className="w-full text-sm text-left">

                    <thead className="bg-slate-50 text-slate-600">

                      <tr>

                        {[
                          'Reference',
                          'Service',
                          'Species',
                          'Date',
                          'Time',
                          'Status'
                        ].map(heading => (

                          <th
                            key={heading}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            {heading}
                          </th>

                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {analytics.records
                        .slice(0, 10)
                        .map((item, index) => (

                          <tr
                            key={`${item.referenceNumber}-${index}`}
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >

                            <td className="px-4 py-4 font-semibold text-teal-700 whitespace-nowrap">
                              {item.referenceNumber}
                            </td>

                            <td className="px-4 py-4">
                              {item.service}
                            </td>

                            <td className="px-4 py-4">
                              {item.species}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              {item.date}
                            </td>

                            <td className="px-4 py-4 whitespace-nowrap">
                              {item.time}
                            </td>

                            <td className="px-4 py-4">

                              <span
                                className="px-3 py-1 rounded-full text-xs font-semibold"
                                style={{
                                  color: STATUS_COLORS[item.status],
                                  backgroundColor:
                                    (STATUS_COLORS[item.status] ||
                                      '#64748b') + '15'
                                }}
                              >
                                {item.status}
                              </span>

                            </td>

                          </tr>

                        ))}

                    </tbody>

                  </table>

                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Showing up to 10 records. Export the CSV
                  file to view the complete report.
                </p>

              </section>

            </>

          )}

        </>

      )}

    </div>
  )
}

export default AnalyticsManagement