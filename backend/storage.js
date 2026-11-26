const fs = require('fs')

function writeJSON(filePath, data) {
  const temporaryPath = `${filePath}.tmp`

  try {
    fs.writeFileSync(
      temporaryPath,
      JSON.stringify(data, null, 2),
      'utf8'
    )

    fs.renameSync(temporaryPath, filePath)

  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath)
    }

    throw error
  }
}

module.exports = {
  writeJSON
}