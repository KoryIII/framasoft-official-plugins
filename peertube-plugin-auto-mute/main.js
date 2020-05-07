const simpleGet = require('simple-get')

const store = {
  urls: [],
  checkIntervalSeconds: null,
  alreadyAdded: new Set(),
  alreadyRemoved: new Set(),
  serverAccountId: null
}

async function register ({
  settingsManager,
  peertubeHelpers,
  registerSetting
}) {
  const { logger } = peertubeHelpers

  registerSetting({
    name: 'blocklist-urls',
    label: 'Blocklist URLs (one per line)',
    type: 'input-textarea',
    private: true
  })

  registerSetting({
    name: 'check-seconds-interval',
    label: 'Blocklist check frequency (seconds)',
    type: 'input',
    private: true,
    default: 3600 // 1 Hour
  })

  const serverActor = await peertubeHelpers.server.getServerActor()
  store.serverAccountId = serverActor.Account.id

  const settings = await settingsManager.getSettings([ 'check-seconds-interval', 'blocklist-urls' ])

  await load(peertubeHelpers, settings['blocklist-urls'], settings['check-seconds-interval'])

  settingsManager.onSettingsChange(settings => {
    load(peertubeHelpers, settings['blocklist-urls'], settings['check-seconds-interval'])
      .catch(err => logger.error('Cannot load auto mute plugin.', { err }))
  })

  runCheckForever(peertubeHelpers)
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

// ############################################################################

async function load (peertubeHelpers, blocklistUrls, checkIntervalSeconds) {
  const { logger } = peertubeHelpers

  store.checkIntervalSeconds = checkIntervalSeconds

  store.urls = (blocklistUrls || '').split('\n')
                                    .filter(url => !!url)

  if (store.urls.length === 0) {
    logger.info('Do not load auto mute plugin because of empty blocklist URLs.')
    return
  }

  logger.info('Loaded %d blocklist URLs for auto mute plugin.', store.urls.length, { urls: store.urls })
}

async function runCheckForever (peertubeHelpers) {
  const { logger } = peertubeHelpers

  if (store.urls.length === 0) return runLater()

  for (const url of store.urls) {
    try {
      const { data } = await get(url)

      if (Array.isArray(data.data) === false) {
        throw new Error('JSON response is not valid.')
      }

      for (const entity of data.data) {
        if (!entity.value) throw new Error('JSON entity is not valid.')

        if (entity.action === 'remove') await removeEntity(peertubeHelpers, entity.value)
        else await addEntity(peertubeHelpers, entity.value)
      }
    } catch (err) {
      logger.warn('Cannot get mute blocklist from %s.', url, { err })
    }
  }

  runLater()
}

function runLater () {
  setTimeout(runCheckForever, store.checkIntervalSeconds * 1000)
}

function get (url) {
  return new Promise((resolve, reject) => {
    simpleGet.concat({ url, method: 'GET', json: true }, function (err, res, data) {
      if (err) return reject(err)

      return resolve({ res, data })
    })
  })
}

function addEntity (peertubeHelpers, value) {
  const { moderation, logger } = peertubeHelpers

  if (store.alreadyAdded.has(value)) return

  store.alreadyRemoved.delete(value)
  store.alreadyAdded.add(value)

  logger.info('Auto mute %s from blocklist.', value)

  // Account
  if (value.includes('@')) {
    return moderation.blockAccount({ byAccountId: store.serverAccountId, handleToBlock: value })
  }

  // Server
  return moderation.blockServer({ byAccountId: store.serverAccountId, hostToBlock: value })
}

function removeEntity (peertubeHelpers, value) {
  const { moderation, logger } = peertubeHelpers

  if (store.alreadyRemoved.has(value)) return

  store.alreadyAdded.delete(value)
  store.alreadyRemoved.add(value)

  logger.info('Auto removing mute %s from blocklist.', value)

  // Account
  if (value.includes('@')) {
    return moderation.blockAccount({ byAccountId: store.serverAccountId, handleToUnblock: value })
  }

  // Server
  return moderation.blockAccount({ byAccountId: store.serverAccountId, hostToUnblock: value })
}
