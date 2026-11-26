
const fs = require('fs')
const { writeJSON } = require('./storage')
const path = require('path')
const { randomUUID } = require('crypto')

const servicesPath = path.join(
  process.env.DATA_DIR || path.join(__dirname, 'data'),
  'services.json'
)

function readServices() {
  return JSON.parse(
    fs.readFileSync(servicesPath, 'utf8')
  )
}

function saveServices(services) {
  writeJSON(servicesPath, services)
}
function getActiveService(name) {
  return readServices().find(
    service => service.name === name && service.active
  )
}

function registerServiceRoutes(app, adminSessions) {
  function requireAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1]
    const expiry = adminSessions.get(token)

    if (!expiry || expiry <= Date.now()) {
      return res.status(401).json({
        message: 'Unauthorized. Please log in again.'
      })
    }

    next()
  }

  function validateService(body, services, id) {
    const { name, description, duration, price, active } = body

   if (
  typeof name !== 'string' ||
  !name.trim() ||
  name.trim().length > 100
) {
  return 'Service name must contain 1–100 characters.'
}

if (
  typeof description !== 'string' ||
  description.length > 500
) {
  return 'Service description must not exceed 500 characters.'
}

    if (
      !Number.isInteger(duration) ||
      duration < 30 ||
      duration > 240 ||
      duration % 30 !== 0
    ) {
      return 'Duration must be between 30 and 240 minutes, in 30-minute increments.'
    }

    if (
      price !== null &&
      (typeof price !== 'number' ||
        !Number.isFinite(price) ||
        price < 0)
    ) {
      return 'Invalid estimated price.'
    }

    if (typeof active !== 'boolean') {
      return 'Invalid service status.'
    }

    if (
      services.some(service =>
        service.id !== id &&
        service.name.toLowerCase() ===
          name.trim().toLowerCase()
      )
    ) {
      return 'A service with this name already exists.'
    }

    return null
  }

  app.get('/api/services', (req, res) => {
    res.json(
      readServices().filter(service => service.active)
    )
  })

  app.get('/api/admin/services', requireAdmin, (req, res) => {
    res.json(readServices())
  })

  app.post('/api/admin/services', requireAdmin, (req, res) => {
    const services = readServices()
    const body = req.body || {}
    const error = validateService(body, services)

    if (error) {
      return res.status(400).json({ message: error })
    }

    const service = {
      id: randomUUID(),
      name: body.name.trim(),
      description: body.description.trim(),
      duration: body.duration,
      price: body.price,
      active: body.active
    }

    services.push(service)
    saveServices(services)

    res.status(201).json({
      message: 'Service added successfully!',
      service
    })
  })

  app.patch(
    '/api/admin/services/:id',
    requireAdmin,
    (req, res) => {
      const services = readServices()

      const index = services.findIndex(
        service => service.id === req.params.id
      )

      if (index === -1) {
        return res.status(404).json({
          message: 'Service not found.'
        })
      }

      const updated = {
        ...services[index],
        ...req.body,
        id: services[index].id
      }

      const error = validateService(
        updated,
        services,
        updated.id
      )

      if (error) {
        return res.status(400).json({ message: error })
      }

      services[index] = {
        id: updated.id,
        name: updated.name.trim(),
        description: updated.description.trim(),
        duration: updated.duration,
        price: updated.price,
        active: updated.active
      }

      saveServices(services)

      res.json({
        message: 'Service updated successfully!',
        service: services[index]
      })
    }
  )
}

module.exports = {
  readServices,
  getActiveService,
  registerServiceRoutes
}