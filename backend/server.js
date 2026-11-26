const express = require('express')
const { rateLimit } = require('express-rate-limit')
const cors = require('cors')
const fs = require('fs')
const { writeJSON } = require('./storage')
const path = require('path')
const { randomUUID, randomBytes } = require('crypto')
const {
  getActiveService,
  registerServiceRoutes
} = require('./services')
const {
  readAvailability,
  validDate,
  scheduledTimestamp,
  fitsHours,
  generateTimeSlots,
  registerAvailabilityRoutes
} = require('./availability')
const {
  readSettings,
  verifyAdmin,
  registerSettingsRoutes
} = require('./settings')
const {
  registerAnalyticsRoutes
} = require('./analytics')
const app = express()
const PORT = process.env.PORT || 5000
const production = process.env.NODE_ENV === 'production'
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
}))

app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, message: { message: 'Too many requests. Please try again later.' } })
app.use('/api/appointments/track', publicLimiter)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    message:
      'Too many login attempts. Please try again in 15 minutes.'
  }
})

const filePath = path.join(
  process.env.DATA_DIR || path.join(__dirname, 'data'),
  'appointments.json'
)

const adminSessions = new Map()
function getCancellationCutoff() {
  return readSettings().cancellationCutoffHours
}

function getReschedulingCutoff() {
  return readSettings().reschedulingCutoffHours
}

registerServiceRoutes(app, adminSessions)

registerAvailabilityRoutes(
  app,
  adminSessions,
  readAppointments
)
registerSettingsRoutes(
  app,
  adminSessions
)
registerAnalyticsRoutes(
  app,
  adminSessions,
  readAppointments
)
// JSON STORAGE

function readAppointments() {
  return JSON.parse(
    fs.readFileSync(filePath, 'utf8')
  )
}

function saveAppointments(appointments) {
  writeJSON(filePath, appointments)
}

// APPOINTMENT TIME SLOTS

const allowedStatuses = [
  'Pending',
  'Confirmed',
  'Completed',
  'Cancelled',
  'Rejected'
]

// PREVENT OVERLAPPING APPOINTMENTS

function overlaps(
  appointments,
  date,
  time,
  duration,
  excludeId
) {
  const start = scheduledTimestamp(date, time)
  const end = start + duration * 60000

  return appointments.some(item => {
    if (
      item.id === excludeId ||
      item.date !== date ||
      ['Cancelled', 'Rejected'].includes(item.status)
    ) {
      return false
    }

    const otherStart = scheduledTimestamp(
      item.date,
      item.time
    )

    const otherEnd =
      otherStart + (item.serviceDuration || 30) * 60000

    return start < otherEnd && otherStart < end
  })
}

// CANCELLATION POLICY

function cancellationMode(appointment) {
  if (
    !['Pending', 'Confirmed'].includes(appointment.status)
  ) {
    return 'unavailable'
  }

  if (appointment.cancellationRequest?.status === 'Pending') {
    return 'requested'
  }

  const remaining =
    scheduledTimestamp(
      appointment.date,
      appointment.time
    ) - Date.now()

  if (!Number.isFinite(remaining) || remaining <= 0) {
    return 'unavailable'
  }

  if (
    appointment.status === 'Confirmed' &&
    remaining <= getCancellationCutoff() * 3600000
  ) {
    return 'request'
  }

  return 'direct'
}
// RESCHEDULING POLICY

function modificationAllowed(appointment) {
  if (
    !['Pending', 'Confirmed'].includes(
      appointment.status
    )
  ) {
    return false
  }

  if (
    appointment.cancellationRequest?.status ===
    'Pending'
  ) {
    return false
  }

  const remaining =
    scheduledTimestamp(
      appointment.date,
      appointment.time
    ) - Date.now()

  if (
    !Number.isFinite(remaining) ||
    remaining <= 0
  ) {
    return false
  }

  if (
    appointment.status === 'Confirmed' &&
    remaining <=
      getReschedulingCutoff() * 3600000
  ) {
    return false
  }

  return true
}
// ADMIN AUTHENTICATION

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

// CUSTOMER APPOINTMENT DETAILS

function publicAppointment(appointment) {
  return {
    referenceNumber: appointment.referenceNumber,
    petName: appointment.petName,
    service: appointment.service,
    serviceDuration:
      appointment.serviceDuration || 30,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,

    cancellationMode:
      cancellationMode(appointment),

    cancellationRequestStatus:
      appointment.cancellationRequest?.status || null,

    cancellationCutoffHours:
      getCancellationCutoff(),

    modificationAllowed:
      modificationAllowed(appointment),

    reschedulingCutoffHours:
      getReschedulingCutoff()
  }
}
// TEST BACKEND

app.get('/api/health', (req, res) => {
  res.json({
    system: 'SmartVet',
    message: 'SmartVet backend is running!',
    status: 'success'
  })
})

// ADMIN LOGIN

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {}

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    !verifyAdmin(username.trim(), password)
  ) {
    return res.status(401).json({
      message: 'Invalid username or password.'
    })
  }

  const token = randomBytes(32).toString('hex')

  adminSessions.set(
    token,
    Date.now() + 3600000
  )

  res.json({
    message: 'Login successful!',
    username: username.trim(),
    token
  })
})
// ADMIN LOGOUT

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]

  adminSessions.delete(token)

  res.json({
    message: 'Logged out successfully.'
  })
})
// GET AVAILABLE TIME SLOTS

app.get('/api/appointments/availability', (req, res) => {
  return availabilityHandler(req, res, { date: req.query.date, service: req.query.service })
})
app.post('/api/appointments/availability', publicLimiter, (req, res) => availabilityHandler(req, res, req.body || {}))
function availabilityHandler(req, res, input) {
  const {
    date,
    service,
    referenceNumber,
    contactNumber
  } = input

  if (!validDate(date)) {
    return res.status(400).json({
      message: 'A valid date is required.'
    })
  }

  const selectedService = service
    ? getActiveService(service)
    : { duration: 30 }

  if (!selectedService) {
    return res.status(400).json({
      message: 'Please select an active service.'
    })
  }

  const settings = readAvailability()
  const appointments = readAppointments()
  const times = generateTimeSlots(settings)

  const day = new Date(
    `${date}T00:00:00Z`
  ).getUTCDay()

  const blockedDate = settings.blockedDates.find(
    item => item.date === date
  )

  const isWorkingDay =
    settings.workingDays.includes(day)

  const ownAppointment = appointments.find(item =>
    referenceNumber &&
    contactNumber &&
    item.referenceNumber === referenceNumber &&
    String(item.contactNumber) === contactNumber
  )

  let message = ''

  if (blockedDate) {
    message = 'The clinic is closed on this date.'
  } else if (!isWorkingDay) {
    message = 'The clinic is closed on this day.'
  }

  const availableTimes = times.filter(time =>
    scheduledTimestamp(date, time) > Date.now() &&
    fitsHours(
      date,
      time,
      selectedService.duration,
      settings
    ) &&
    !overlaps(
      appointments,
      date,
      time,
      selectedService.duration,
      ownAppointment?.id
    )
  )

  const bookedTimes = times.filter(
    time => !availableTimes.includes(time)
  )

  if (!message && availableTimes.length === 0) {
    message = 'No available time slots for this date.'
  }

  res.json({
    date,
    times,
    bookedTimes,
    availableTimes,
    closed: !!blockedDate || !isWorkingDay,
    message
  })
}
// GET ALL APPOINTMENTS - ADMIN

app.get('/api/appointments', requireAdmin, (req, res) => {
  res.json(readAppointments())
})

// TRACK APPOINTMENT

app.get(
  '/api/appointments/track/:referenceNumber',
  (req, res) => {
    const referenceNumber =
      req.params.referenceNumber.trim().toUpperCase()

    const appointment = readAppointments().find(
      item => item.referenceNumber === referenceNumber
    )

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found.'
      })
    }

    res.json(publicAppointment(appointment))
  }
)

// CREATE APPOINTMENT

app.post('/api/appointments', (req, res) => {
  const {
    ownerName,
    contactNumber,
    petName,
    species,
    breed,
    age,
    service,
    date,
    time,
    notes
  } = req.body || {}

  const required = [
    ownerName,
    contactNumber,
    petName,
    species,
    breed,
    service,
    date,
    time
  ]

  if (
    required.some(value =>
      typeof value !== 'string' || !value.trim()
    ) ||
    age === undefined ||
    age === null ||
    age === '' ||
    !Number.isFinite(Number(age)) ||
    Number(age) < 0
  ) {
    return res.status(400).json({
      message: 'Please complete all required fields.'
    })
  }
// ADDITIONAL INPUT VALIDATION

if (
  ownerName.trim().length > 100 ||
  petName.trim().length > 50 ||
  breed.trim().length > 100
) {
  return res.status(400).json({
    message: 'Name or breed exceeds the allowed length.'
  })
}

if (
  !['string', 'number'].includes(typeof age) ||
  String(age).trim() === '' ||
  Number(age) > 100
) {
  return res.status(400).json({
    message: 'Please enter a valid pet age.'
  })
}

if (
  notes !== undefined &&
  (
    typeof notes !== 'string' ||
    notes.length > 500
  )
) {
  return res.status(400).json({
    message: 'Notes must not exceed 500 characters.'
  })
}
  if (!/^09[0-9]{9}$/.test(contactNumber)) {
    return res.status(400).json({
      message: 'Invalid contact number.'
    })
  }

  if (!['Dog', 'Cat', 'Bird', 'Other'].includes(species)) {
    return res.status(400).json({
      message: 'Invalid pet species.'
    })
  }

  const selectedService = getActiveService(service)

  if (!selectedService) {
    return res.status(400).json({
      message: 'Invalid or inactive veterinary service.'
    })
  }

  const scheduledAt = scheduledTimestamp(date, time)

  if (
    !Number.isFinite(scheduledAt) ||
    scheduledAt <= Date.now()
  ) {
    return res.status(400).json({
      message: 'Please select a valid future schedule.'
    })
  }

  if (!fitsHours(date, time, selectedService.duration)) {
    return res.status(400).json({
      message: 'This service does not fit the selected time.'
    })
  }

  const appointments = readAppointments()

  if (
    overlaps(
      appointments,
      date,
      time,
      selectedService.duration
    )
  ) {
    return res.status(409).json({
      message: 'This time slot is unavailable.'
    })
  }

  const id = randomUUID()

  const appointment = {
    id,
    referenceNumber:
      'SV-' + id.slice(0, 8).toUpperCase(),
    ownerName: ownerName.trim(),
contactNumber: contactNumber.trim(),
petName: petName.trim(),
species,
breed: breed.trim(),
age: Number(age),
    service: selectedService.name,
    serviceId: selectedService.id,
    serviceDuration: selectedService.duration,
    servicePrice: selectedService.price,
    date,
    time,
    notes: (notes || '').trim(),
    status: 'Pending',
    cancellationRequest: null,
    createdAt: new Date().toISOString()
  }

  appointments.push(appointment)
  saveAppointments(appointments)

  res.status(201).json({
    message: 'Appointment booked successfully!',
    appointment
  })
})

// ADMIN UPDATE APPOINTMENT STATUS

app.patch(
  '/api/appointments/:id',
  requireAdmin,
  (req, res) => {
    const { status } = req.body || {}

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid appointment status.'
      })
    }

    const appointments = readAppointments()

    const appointment = appointments.find(
      item => item.id === req.params.id
    )

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found.'
      })
    }

    if (
      appointment.cancellationRequest?.status === 'Pending'
    ) {
      return res.status(409).json({
        message: 'Review the pending cancellation request first.'
      })
    }

    if (
      !['Cancelled', 'Rejected'].includes(status) &&
      overlaps(
        appointments,
        appointment.date,
        appointment.time,
        appointment.serviceDuration || 30,
        appointment.id
      )
    ) {
      return res.status(409).json({
        message: 'This time slot is unavailable.'
      })
    }
if (
  ['Pending', 'Confirmed'].includes(status) &&
  !['Pending', 'Confirmed'].includes(appointment.status) &&
  (
    scheduledTimestamp(
      appointment.date,
      appointment.time
    ) <= Date.now() ||
    !fitsHours(
      appointment.date,
      appointment.time,
      appointment.serviceDuration || 30
    )
  )
) {
  return res.status(409).json({
    message: 'This appointment cannot be reopened because its schedule is unavailable.'
  })
}
    const transitions = { Pending: ['Confirmed', 'Rejected', 'Cancelled'], Confirmed: ['Completed', 'Cancelled'], Completed: [], Cancelled: [], Rejected: [] }
    if (!transitions[appointment.status]?.includes(status)) {
      return res.status(409).json({ message: 'This status change is not allowed.' })
    }
    appointment.status = status
    appointment.updatedAt = new Date().toISOString()

    saveAppointments(appointments)

    res.json({
      message: 'Appointment updated successfully!',
      appointment
    })
  }
)

// ADMIN DELETE APPOINTMENT

app.delete(
  '/api/appointments/:id',
  requireAdmin,
  (req, res) => {
    const appointments = readAppointments()

    const index = appointments.findIndex(
      item => item.id === req.params.id
    )

    if (index === -1) {
      return res.status(404).json({
        message: 'Appointment not found.'
      })
    }

    if (
      appointments[index].cancellationRequest?.status ===
      'Pending'
    ) {
      return res.status(409).json({
        message: 'Review the pending cancellation request first.'
      })
    }

    appointments.splice(index, 1)
    saveAppointments(appointments)

    res.json({
      message: 'Appointment deleted successfully!'
    })
  }
)

// CUSTOMER CANCEL APPOINTMENT

app.patch(
  '/api/appointments/track/:referenceNumber/cancel',
  (req, res) => {
    const referenceNumber =
      req.params.referenceNumber.trim().toUpperCase()

    const { contactNumber, reason } = req.body || {}

    if (
      typeof contactNumber !== 'string' ||
      !/^09[0-9]{9}$/.test(contactNumber.trim())
    ) {
      return res.status(400).json({
        message: 'Valid contact number is required.'
      })
    }

    const appointments = readAppointments()

    const appointment = appointments.find(
      item => item.referenceNumber === referenceNumber
    )

    if (
      !appointment ||
      String(appointment.contactNumber).trim() !==
        contactNumber.trim()
    ) {
      return res.status(403).json({
        message: 'Invalid reference number or contact number.'
      })
    }

    const mode = cancellationMode(appointment)

    if (mode === 'requested') {
      return res.status(409).json({
        message: 'A cancellation request is already pending.'
      })
    }

    if (mode === 'unavailable') {
      return res.status(400).json({
        message: 'This appointment cannot be cancelled online.'
      })
    }

    if (mode === 'request') {
      if (
        typeof reason !== 'string' ||
        !reason.trim() ||
        reason.trim().length > 500
      ) {
        return res.status(400).json({
          code: 'CANCELLATION_REASON_REQUIRED',
          message: 'Please provide a cancellation reason.'
        })
      }

      appointment.cancellationRequest = {
        status: 'Pending',
        reason: reason.trim(),
        requestedAt: new Date().toISOString()
      }
    } else {
      appointment.status = 'Cancelled'
      appointment.cancelledAt = new Date().toISOString()
    }

    appointment.updatedAt = new Date().toISOString()

    saveAppointments(appointments)

    res.json({
      message:
        mode === 'request'
          ? 'Cancellation request submitted. Please wait for admin approval.'
          : 'Appointment cancelled successfully!',
      status: appointment.status,
      cancellationMode: cancellationMode(appointment),
      cancellationRequestStatus:
        appointment.cancellationRequest?.status || null
    })
  }
)

// ADMIN REVIEW CANCELLATION REQUEST

app.patch(
  '/api/appointments/:id/cancellation-request',
  requireAdmin,
  (req, res) => {
    const { decision } = req.body || {}

    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({
        message: 'Invalid cancellation decision.'
      })
    }

    const appointments = readAppointments()

    const appointment = appointments.find(
      item => item.id === req.params.id
    )

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found.'
      })
    }

    if (
      appointment.status !== 'Confirmed' ||
      appointment.cancellationRequest?.status !== 'Pending'
    ) {
      return res.status(409).json({
        message: 'No pending cancellation request.'
      })
    }

    appointment.cancellationRequest.status = decision

    appointment.cancellationRequest.reviewedAt =
      new Date().toISOString()

    if (decision === 'Approved') {
      appointment.status = 'Cancelled'
      appointment.cancelledAt = new Date().toISOString()
    }

    appointment.updatedAt = new Date().toISOString()

    saveAppointments(appointments)

    res.json({
      message:
        `Cancellation request ${decision.toLowerCase()}.`,
      appointment
    })
  }
)

// CUSTOMER MODIFY APPOINTMENT

app.patch(
  '/api/appointments/track/:referenceNumber/modify',
  (req, res) => {
    const referenceNumber =
      req.params.referenceNumber.trim().toUpperCase()

    const {
      contactNumber,
      service,
      date,
      time
    } = req.body || {}

    if (
      typeof contactNumber !== 'string' ||
      !/^09[0-9]{9}$/.test(contactNumber.trim())
    ) {
      return res.status(400).json({
        message: 'Valid contact number is required.'
      })
    }

    const appointments = readAppointments()

    const appointment = appointments.find(
      item => item.referenceNumber === referenceNumber
    )

    if (
      !appointment ||
      String(appointment.contactNumber).trim() !==
        contactNumber.trim()
    ) {
      return res.status(403).json({
        message: 'Invalid reference number or contact number.'
      })
    }

    if (!['Pending', 'Confirmed'].includes(appointment.status)) {
      return res.status(400).json({
        message: 'This appointment cannot be modified.'
      })
    }

    if (
      appointment.cancellationRequest?.status === 'Pending'
    ) {
      return res.status(409).json({
        message: 'A cancellation request is currently pending.'
      })
    }

    const originalSchedule = scheduledTimestamp(
      appointment.date,
      appointment.time
    )

    if (
      !Number.isFinite(originalSchedule) ||
      originalSchedule <= Date.now()
    ) {
      return res.status(400).json({
        message: 'Past appointments cannot be modified.'
      })
    }

    const selectedService = getActiveService(service)

    if (!selectedService) {
      return res.status(400).json({
        message: 'Please select an active veterinary service.'
      })
    }

    const scheduledAt = scheduledTimestamp(date, time)

    if (
      !Number.isFinite(scheduledAt) ||
      scheduledAt <= Date.now()
    ) {
      return res.status(400).json({
        message: 'Please select a valid future schedule.'
      })
    }

    if (
      !fitsHours(date, time, selectedService.duration) ||
      overlaps(
        appointments,
        date,
        time,
        selectedService.duration,
        appointment.id
      )
    ) {
      return res.status(409).json({
        message: 'This time slot is unavailable.'
      })
    }
if (!modificationAllowed(appointment)) {
  return res.status(409).json({
    message:
      `This appointment cannot be modified online. Confirmed appointments cannot be rescheduled within ${getReschedulingCutoff()} hour(s) of their scheduled time.`
  })
}

if (
  appointment.status === 'Confirmed' &&
  scheduledTimestamp(date, time) - Date.now() <=
    getReschedulingCutoff() * 3600000
) {
  return res.status(409).json({
    message:
      'Please select a new schedule outside the rescheduling cutoff.'
  })
}
    appointment.service = selectedService.name
    appointment.serviceId = selectedService.id
    appointment.serviceDuration = selectedService.duration
    appointment.servicePrice = selectedService.price
    appointment.date = date
    appointment.time = time
    appointment.status = 'Pending'
    appointment.cancellationRequest = null
    appointment.updatedAt = new Date().toISOString()

    saveAppointments(appointments)

    res.json({
      message: 'Appointment modified successfully!',
      appointment: publicAppointment(appointment)
    })
  }
)

// START BACKEND

if (production) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
}
app.listen(PORT, production ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(
    `SmartVet backend running at http://localhost:${PORT}`
  )
})