const fs = require('fs')
const { writeJSON } = require('./storage')
const path = require('path')

const availabilityPath = path.join(
  process.env.DATA_DIR || path.join(__dirname, 'data'),
  'availability.json'
)

function readAvailability() {
  return JSON.parse(
    fs.readFileSync(availabilityPath, 'utf8')
  )
}

function saveAvailability(settings) {
  writeJSON(availabilityPath, settings)
}

function validDate(date) {
  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return false
  }

  const day = new Date(`${date}T00:00:00Z`)

  return (
    Number.isFinite(day.getTime()) &&
    day.toISOString().slice(0, 10) === date
  )
}

function timeToMinutes(time) {
  if (
    typeof time !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) {
    return NaN
  }

  const [hour, minute] = time.split(':').map(Number)

  return hour * 60 + minute
}

function appointmentTimeToMinutes(time) {
  if (
    typeof time !== 'string' ||
    !/^(0[1-9]|1[0-2]):[0-5]\d (AM|PM)$/.test(time)
  ) {
    return NaN
  }

  const [clock, period] = time.split(' ')
  const [hour, minute] = clock.split(':').map(Number)

  return (
    ((hour % 12) + (period === 'PM' ? 12 : 0)) * 60 +
    minute
  )
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60

  return (
    String(hour % 12 || 12).padStart(2, '0') +
    ':' +
    String(minute).padStart(2, '0') +
    (hour >= 12 ? ' PM' : ' AM')
  )
}

function scheduledTimestamp(date, time) {
  if (!validDate(date)) return NaN

  const minutes = appointmentTimeToMinutes(time)

  if (!Number.isFinite(minutes)) return NaN

  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60

  return Date.parse(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
  )
}

function fitsHours(
  date,
  time,
  duration,
  settings = readAvailability()
) {
  if (!validDate(date)) return false

  const day = new Date(
    `${date}T00:00:00Z`
  ).getUTCDay()

  if (!settings.workingDays.includes(day)) {
    return false
  }

  if (
    settings.blockedDates.some(
      item => item.date === date
    )
  ) {
    return false
  }

  const start = appointmentTimeToMinutes(time)
  const end = start + duration

  const opening = timeToMinutes(
    settings.openingTime
  )

  const closing = timeToMinutes(
    settings.closingTime
  )

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    start % 30 !== 0 ||
    start < opening ||
    end > closing
  ) {
    return false
  }

  if (settings.breakEnabled) {
    const breakStart = timeToMinutes(
      settings.breakStart
    )

    const breakEnd = timeToMinutes(
      settings.breakEnd
    )

    if (
      start < breakEnd &&
      end > breakStart
    ) {
      return false
    }
  }

  return true
}

function generateTimeSlots(
  settings = readAvailability()
) {
  const opening = timeToMinutes(
    settings.openingTime
  )

  const closing = timeToMinutes(
    settings.closingTime
  )

  const times = []

  for (
    let minute = opening;
    minute < closing;
    minute += 30
  ) {
    times.push(formatTime(minute))
  }

  return times
}

function validateAvailability(settings) {
  if (
    !Array.isArray(settings.workingDays) ||
    settings.workingDays.length === 0 ||
    settings.workingDays.some(
      day =>
        !Number.isInteger(day) ||
        day < 0 ||
        day > 6
    )
  ) {
    return 'Select at least one valid working day.'
  }

  const opening = timeToMinutes(
    settings.openingTime
  )

  const closing = timeToMinutes(
    settings.closingTime
  )

  if (
    !Number.isFinite(opening) ||
    !Number.isFinite(closing) ||
    closing <= opening ||
    closing - opening < 30 ||
    opening % 30 !== 0 ||
    closing % 30 !== 0
  ) {
    return 'Operating hours must use valid 30-minute intervals.'
  }

  if (typeof settings.breakEnabled !== 'boolean') {
    return 'Invalid lunch break setting.'
  }

  if (settings.breakEnabled) {
    const start = timeToMinutes(
      settings.breakStart
    )

    const end = timeToMinutes(
      settings.breakEnd
    )

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start <= opening ||
      end >= closing ||
      end <= start ||
      start % 30 !== 0 ||
      end % 30 !== 0
    ) {
      return 'Lunch break must be within operating hours.'
    }
  }

  if (!Array.isArray(settings.blockedDates)) {
    return 'Invalid blocked dates.'
  }

  const dates = new Set()

  for (const item of settings.blockedDates) {
    if (
      !item ||
      !validDate(item.date) ||
      typeof item.reason !== 'string' ||
      !item.reason.trim() ||
      item.reason.length > 150
    ) {
      return 'Each blocked date requires a valid date and reason.'
    }

    if (dates.has(item.date)) {
      return 'Duplicate blocked dates are not allowed.'
    }

    dates.add(item.date)
  }

  return null
}

function registerAvailabilityRoutes(
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

  app.get('/api/availability', (req, res) => {
    res.json(readAvailability())
  })

  app.get(
    '/api/admin/availability',
    requireAdmin,
    (req, res) => {
      res.json(readAvailability())
    }
  )

  app.put(
    '/api/admin/availability',
    requireAdmin,
    (req, res) => {
      const settings = req.body || {}

      const error = validateAvailability(settings)

      if (error) {
        return res.status(400).json({
          message: error
        })
      }

      const updatedSettings = {
        workingDays: [
          ...new Set(settings.workingDays)
        ].sort((a, b) => a - b),

        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        breakEnabled: settings.breakEnabled,
        breakStart: settings.breakStart,
        breakEnd: settings.breakEnd,

        blockedDates: settings.blockedDates
          .map(item => ({
            date: item.date,
            reason: item.reason.trim()
          }))
          .sort((a, b) =>
            a.date.localeCompare(b.date)
          )
      }

      const conflicts = readAppointments().filter(
        item =>
          ['Pending', 'Confirmed'].includes(
            item.status
          ) &&
          scheduledTimestamp(
            item.date,
            item.time
          ) > Date.now() &&
          !fitsHours(
            item.date,
            item.time,
            item.serviceDuration || 30,
            updatedSettings
          )
      )

      if (conflicts.length > 0) {
        return res.status(409).json({
          message:
            'Schedule cannot be saved because it conflicts with existing appointments.',

          conflicts: conflicts.map(item => ({
            referenceNumber: item.referenceNumber,
            date: item.date,
            time: item.time,
            service: item.service,
            status: item.status
          }))
        })
      }

      saveAvailability(updatedSettings)

      res.json({
        message: 'Clinic availability updated successfully!',
        availability: updatedSettings
      })
    }
  )
}

module.exports = {
  readAvailability,
  validDate,
  scheduledTimestamp,
  fitsHours,
  generateTimeSlots,
  registerAvailabilityRoutes
}