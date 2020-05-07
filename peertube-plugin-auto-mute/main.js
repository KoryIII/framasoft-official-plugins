const simpleGet = require('simple-get')

const store = {
  urls: [],
  checkIntervalSeconds: null,
  alreadyAdded: new Set(),
  alreadyRemoved: new Set(),
  serverAccountId: null,
  timeout: null
}

async function register ({
  settingsManager,
  storageManager,
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

  await load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])

  settingsManager.onSettingsChange(settings => {
    load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])
      .catch(err => logger.error('Cannot load auto mute plugin.', { err }))
  })
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

// ############################################################################

async function load (peertubeHelpers, storageManager, blocklistUrls, checkIntervalSeconds) {
  const { logger } = peertubeHelpers

  if (store.timeout) clearTimeout(store.timeout)

  store.checkIntervalSeconds = checkIntervalSeconds

  store.urls = (blocklistUrls || '').split('\n')
                                    .filter(url => !!url)

  if (store.urls.length === 0) {
    logger.info('Do not load auto mute plugin because of empty blocklist URLs.')
    return
  }

  logger.info('Loaded %d blocklist URLs for auto mute plugin.', store.urls.length, { urls: store.urls })

  runLater(peertubeHelpers, storageManager)
}

async function runCheck (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  if (store.urls.length === 0) return runLater(peertubeHelpers, storageManager)

  let lastChecks = await storageManager.getData('last-checks')
  if (!lastChecks) lastChecks = {}

  const newLastCheck = {}

  for (const url of store.urls) {
    try {
      const { data } = await get(url)
      newLastCheck[url] = new Date().toISOString()

      const lastCheckTime = lastChecks[url]
        ? new Date(lastChecks[url]).getTime()
        : 0

      if (Array.isArray(data.data) === false) {
        throw new Error('JSON response is not valid.')
      }

      for (const entity of data.data) {
        if (!entity.value) throw new Error('JSON entity is not valid.')

        // We already checked this entity?
        if (entity.updatedAt) {
          const updatedAtTime = new Date(entity.updatedAt).getTime()

          if (updatedAtTime < lastCheckTime) continue
        }

        if (entity.action === 'remove') await removeEntity(peertubeHelpers, entity.value)
        else await addEntity(peertubeHelpers, entity.value)
      }
    } catch (err) {
      logger.warn('Cannot get mute blocklist from %s.', url, { err })
    }
  }

  await storageManager.storeData('last-checks', newLastCheck)

  runLater(peertubeHelpers, storageManager)
}

function runLater (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  logger.debug('Will run auto mute check in %d seconds.', store.checkIntervalSeconds)

  store.timeout = setTimeout(() => {
    runCheck(peertubeHelpers, storageManager)
  }, store.checkIntervalSeconds * 1000)
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
    return moderation.unblockAccount({ byAccountId: store.serverAccountId, handleToUnblock: value })
  }

  // Server
  return moderation.unblockServer({ byAccountId: store.serverAccountId, hostToUnblock: value })
}
