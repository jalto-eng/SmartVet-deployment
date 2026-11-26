const fs = require('fs')
const path = require('path')
const dir = process.env.DATA_DIR || path.join(__dirname, 'data')
fs.mkdirSync(dir, { recursive: true })
for (const name of ['appointments.json', 'settings.json', 'services.json', 'availability.json']) {
  const target = path.join(dir, name)
  if (!fs.existsSync(target)) fs.copyFileSync(path.join(__dirname, 'seed', name), target, fs.constants.COPYFILE_EXCL)
}
require('./server')
