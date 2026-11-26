const fs = require('fs')
const { writeJSON } = require('./storage')
const path = require('path')

const {
  randomBytes,
  scryptSync,
  timingSafeEqual
} = require('crypto')

const settingsPath = path.join(
  process.env.DATA_DIR || path.join(__dirname, 'data'),
  'settings.json'
)

function readSettings() {
  return JSON.parse(
    fs.readFileSync(settingsPath, 'utf8')
  )
}

function saveSettings(settings) {
  writeJSON(settingsPath, settings)
}

// PASSWORD SECURITY

function hashPassword(password, salt) {
  return scryptSync(
    password,
    salt,
    64
  ).toString('hex')
}

function verifyPassword(password) {
  const settings = readSettings()

  if (
    typeof password !== 'string' ||
    password.length > 128
  ) {
    return false
  }

  if (
    !settings.admin.passwordHash &&
    !settings.admin.salt
  ) {
    return (
      !!process.env.ADMIN_PASSWORD &&
      password === process.env.ADMIN_PASSWORD
    )
  }

  if (
    !settings.admin.passwordHash ||
    !settings.admin.salt
  ) {
    return false
  }

  const storedHash = Buffer.from(
    settings.admin.passwordHash,
    'hex'
  )

  const enteredHash = Buffer.from(
    hashPassword(
      password,
      settings.admin.salt
    ),
    'hex'
  )

  if (
    storedHash.length !== enteredHash.length
  ) {
    return false
  }

  return timingSafeEqual(
    storedHash,
    enteredHash
  )
}

function verifyAdmin(username, password) {
  const settings = readSettings()

  return (
    username === settings.admin.username &&
    verifyPassword(password)
  )
}

// PUBLIC CLINIC INFORMATION

function publicSettings(settings) {
  return {
    clinicName: settings.clinicName,
    contactNumber: settings.contactNumber,
    email: settings.email,
    address: settings.address,
    cancellationCutoffHours:
      settings.cancellationCutoffHours,
    reschedulingCutoffHours:
      settings.reschedulingCutoffHours
  }
}

// SETTINGS ROUTES

function registerSettingsRoutes(
  app,
  adminSessions
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

  // GET PUBLIC SETTINGS

  app.get('/api/settings', (req, res) => {
    res.json(
      publicSettings(readSettings())
    )
  })

  // GET ADMIN SETTINGS

  app.get(
    '/api/admin/settings',
    requireAdmin,
    (req, res) => {
      const settings = readSettings()

      res.json({
        ...publicSettings(settings),
        username: settings.admin.username
      })
    }
  )

  // UPDATE CLINIC INFORMATION AND POLICIES

  app.put(
    '/api/admin/settings',
    requireAdmin,
    (req, res) => {
      const {
        clinicName,
        contactNumber,
        email,
        address,
        cancellationCutoffHours,
        reschedulingCutoffHours
      } = req.body || {}

      if (
        typeof clinicName !== 'string' ||
        !clinicName.trim() ||
        clinicName.length > 100
      ) {
        return res.status(400).json({
          message: 'Enter a valid clinic name.'
        })
      }

      if (
        typeof contactNumber !== 'string' ||
        contactNumber.length > 30 ||
        (
          contactNumber.trim() &&
          !/^[0-9+() -]{7,30}$/.test(
            contactNumber.trim()
          )
        )
      ) {
        return res.status(400).json({
          message: 'Enter a valid contact number.'
        })
      }

      if (
        typeof email !== 'string' ||
        email.length > 150 ||
        (
          email.trim() &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email.trim()
          )
        )
      ) {
        return res.status(400).json({
          message: 'Enter a valid email address.'
        })
      }

      if (
        typeof address !== 'string' ||
        address.length > 300
      ) {
        return res.status(400).json({
          message: 'Enter a valid clinic address.'
        })
      }

      if (
        !Number.isInteger(
          cancellationCutoffHours
        ) ||
        cancellationCutoffHours < 1 ||
        cancellationCutoffHours > 72 ||
        !Number.isInteger(
          reschedulingCutoffHours
        ) ||
        reschedulingCutoffHours <
          cancellationCutoffHours ||
        reschedulingCutoffHours > 72
      ) {
        return res.status(400).json({
          message:
            'Cutoffs must be between 1 and 72 hours. Rescheduling cutoff cannot be shorter than cancellation cutoff.'
        })
      }

      const settings = readSettings()

      const updatedSettings = {
        ...settings,
        clinicName: clinicName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        cancellationCutoffHours,
        reschedulingCutoffHours
      }

      saveSettings(updatedSettings)

      res.json({
        message: 'System settings updated successfully!',
        settings: {
          ...publicSettings(updatedSettings),
          username: updatedSettings.admin.username
        }
      })
    }
  )

  // UPDATE ADMIN CREDENTIALS

  app.patch(
    '/api/admin/settings/credentials',
    requireAdmin,
    (req, res) => {
      const {
        username,
        currentPassword,
        newPassword,
        confirmPassword
      } = req.body || {}

      if (!verifyPassword(currentPassword)) {
        return res.status(400).json({
          message: 'Current password is incorrect.'
        })
      }

      if (
        typeof username !== 'string' ||
        !/^[a-zA-Z0-9_.-]{3,30}$/.test(
          username.trim()
        )
      ) {
        return res.status(400).json({
          message:
            'Username must contain 3–30 valid characters.'
        })
      }

      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 8 ||
        newPassword.length > 128
      ) {
        return res.status(400).json({
          message:
            'New password must contain 8–128 characters.'
        })
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          message: 'Passwords do not match.'
        })
      }

      const settings = readSettings()

      const salt = randomBytes(16).toString('hex')

      settings.admin = {
        username: username.trim(),
        salt,
        passwordHash: hashPassword(
          newPassword,
          salt
        )
      }

      saveSettings(settings)

      // INVALIDATE EXISTING ADMIN SESSIONS

      adminSessions.clear()

      res.json({
        message:
          'Credentials updated successfully. Please log in again.'
      })
    }
  )
}

module.exports = {
  readSettings,
  verifyAdmin,
  registerSettingsRoutes
}