const STATUSES = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'Rejected'
]

function getToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function subtractDays(date, days) {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() - days)
  return result.toISOString().slice(0, 10)
}

function registerAnalyticsRoutes(
  app,
  adminSessions,
  readAppointments
) {
  function requireAdmin(req, res, next) {
  const token =
    req.headers.authorization?.split(' ')[1]

  const expiry = adminSessions.get(token)

  if (!expiry || expiry <= Date.now()) {
    return res.status(401).json({
      message: 'Unauthorized. Please log in again.'
    })
  }

  next()
}

  app.get(
    '/api/admin/analytics',
    requireAdmin,
    (req, res) => {
      try {
        const range = req.query.range || '30'

        if (!['7', '30', '90', 'all'].includes(range)) {
          return res.status(400).json({
            message: 'Invalid date range.'
          })
        }

        const today = getToday()

        const startDate =
          range === 'all'
            ? null
            : subtractDays(today, Number(range) - 1)

        const allAppointments = readAppointments()

        const appointments = allAppointments.filter(
          item => {
            if (!startDate) return true

            return (
              item.date >= startDate &&
              item.date <= today
            )
          }
        )

        // APPOINTMENT STATISTICS

        const total = appointments.length

        const counts = Object.fromEntries(
          STATUSES.map(status => [
            status,
            appointments.filter(
              item => item.status === status
            ).length
          ])
        )

        const percentage = count =>
          total === 0
            ? 0
            : Number(
                ((count / total) * 100).toFixed(1)
              )

        const summary = {
          total,
          pending: counts.Pending,
          confirmed: counts.Confirmed,
          completed: counts.Completed,
          cancelled: counts.Cancelled,
          rejected: counts.Rejected,
          completionRate: percentage(counts.Completed),
          cancellationRate: percentage(counts.Cancelled)
        }

        // STATUS DISTRIBUTION

        const statusDistribution = STATUSES.map(
          status => ({
            name: status,
            value: counts[status]
          })
        )

        // APPOINTMENT TRENDS

        const trendMap = new Map()

        if (startDate) {
          for (
            let date = startDate;
            date <= today;
            date = subtractDays(date, -1)
          ) {
            trendMap.set(date, 0)
          }
        }

        appointments.forEach(item => {
          if (!item.date) return

          trendMap.set(
            item.date,
            (trendMap.get(item.date) || 0) + 1
          )
        })

        const trends = Array.from(
          trendMap.entries()
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({
            date,
            count
          }))

        // MOST BOOKED SERVICES

        const serviceMap = new Map()

        appointments.forEach(item => {
          const service = item.service || 'Unknown'

          serviceMap.set(
            service,
            (serviceMap.get(service) || 0) + 1
          )
        })

        const popularServices = Array.from(
          serviceMap.entries()
        )
          .map(([name, count]) => ({
            name,
            count
          }))
          .sort((a, b) => b.count - a.count)

        // BUSIEST DAYS

        const dayNames = [
          'Mon',
          'Tue',
          'Wed',
          'Thu',
          'Fri',
          'Sat',
          'Sun'
        ]

        const busiestDays = dayNames.map(day => ({
          day,
          count: 0
        }))

        appointments.forEach(item => {
          if (!item.date) return

          const date = new Date(
            `${item.date}T00:00:00Z`
          )

          if (Number.isNaN(date.getTime())) return

          const index =
            (date.getUTCDay() + 6) % 7

          busiestDays[index].count += 1
        })

        // REPORT RECORDS

        const records = appointments
          .map(item => ({
            referenceNumber: item.referenceNumber,
            service: item.service,
            species: item.species,
            date: item.date,
            time: item.time,
            status: item.status
          }))
          .sort((a, b) =>
            String(b.date).localeCompare(
              String(a.date)
            )
          )

        res.json({
          range,
          startDate,
          endDate: range === 'all' ? null : today,
          summary,
          statusDistribution,
          trends,
          popularServices,
          busiestDays,
          records
        })

      } catch (error) {
        console.error('Analytics error:', error)

        res.status(500).json({
          message: 'Unable to generate analytics.'
        })
      }
    }
  )
}

module.exports = {
  registerAnalyticsRoutes
}