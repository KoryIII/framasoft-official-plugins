const simpleGet = require('simple-get')

const store = {
  urls: [],
  checkIntervalSeconds: null,
  alreadyAdded: new Set(),
  alreadyRemoved: new Set(),
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

  const settings = await settingsManager.getSettings([ 'check-seconds-interval', 'blocklist-urls' ])

  await load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])

  settingsManager.onSettingsChange(settings => {
    load(peertubeHelpers, storageManager, settings['blocklist-urls'], settings['check-seconds-interval'])
      .catch(err => logger.error('Cannot load auto block videos plugin.', { err }))
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
    logger.info('Do not load auto block videos plugin because of empty blocklist URLs.')
    return
  }

  logger.info('Loaded %d blocklist URLs for auto block videos plugin.', store.urls.length, { urls: store.urls })

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
        logger.error('JSON response is not valid from %s.', { data })
        continue
      }

      for (const entity of data.data) {
        if (!entity.value) {
          logger.error('JSON entity is not valid.', { entity })
          continue
        }

        // We already checked this entity?
        if (entity.updatedAt) {
          const updatedAtTime = new Date(entity.updatedAt).getTime()

          if (updatedAtTime < lastCheckTime) continue
        }

        if (entity.action === 'remove') await removeEntity(peertubeHelpers, entity.value)
        else await addEntity(peertubeHelpers, entity.value)
      }
    } catch (err) {
      logger.warn('Cannot auto block videos from %s.', url, { err })
    }
  }

  await storageManager.storeData('last-checks', newLastCheck)

  runLater(peertubeHelpers, storageManager)
}

function runLater (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  logger.debug('Will run auto videos block check in %d seconds.', store.checkIntervalSeconds)

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

async function addEntity (peertubeHelpers, value) {
  const { moderation, videos, logger } = peertubeHelpers

  if (store.alreadyAdded.has(value)) return

  store.alreadyRemoved.delete(value)
  store.alreadyAdded.add(value)

  const video = await videos.loadByUrl(value)
  if (!video) return

  if (video.remote !== true) {
    logger.info('Do not auto block our own video %s.', value)
    return
  }

  logger.info('Auto block video %s from blocklist.', value)

  const reason = 'Automatically blocked from auto block plugin.'
  return moderation.blacklistVideo({ videoIdOrUUID: video.id, createOptions: { reason } })
}

async function removeEntity (peertubeHelpers, value) {
  const { moderation, logger, videos } = peertubeHelpers

  if (store.alreadyRemoved.has(value)) return

  store.alreadyAdded.delete(value)
  store.alreadyRemoved.add(value)

  const video = await videos.loadByUrl(value)
  if (!video) return

  logger.info('Auto removing video %s from blocklist.', value)

  return moderation.unblacklistVideo({ videoIdOrUUID: video.id })
}
