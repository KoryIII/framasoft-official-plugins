const AkismetClient = require('akismet-api').AkismetClient

let akismetClient

async function register ({
  settingsManager,
  peertubeHelpers,
  registerSetting,
  registerHook
}) {
  registerSetting({
    name: 'akismet-api-key',
    label: 'Akismet API key',
    type: 'input-password',
    private: true
  })

  const settings = await settingsManager.getSettings([ 'akismet-api-key' ])
  await updateSettings(peertubeHelpers, settings)

  settingsManager.onSettingsChange(async settings => {
    await updateSettings(peertubeHelpers, settings)
  })

  for (const hook of [
    'filter:api.video-thread.create.accept.result',
    'filter:api.video-comment-reply.create.accept.result'
  ]) {
    registerHook({
      target: hook,
      handler: (result, params) => {
        if (!akismetClient) return result
        if (!result.accepted) return result

        return checkLocalComment(peertubeHelpers, {
          // No req in params before 5.0
          ip: params.req
            ? params.req.ip
            : '127.0.0.1',

          userAgent: params.req
            ? params.req.get('user-agent')
            : undefined,

          commentType: params.parentComment
            ? 'reply'
            : 'comment',

          text: params.commentBody.text,
          authorEmail: params.user.email,
          author: params.user.username
        })
      }
    })
  }

  registerHook({
    target: 'filter:activity-pub.remote-video-comment.create.accept.result',
    handler: (result, params) => {
      if (!akismetClient) return result
      if (!result.accepted) return result

      return checkRemoteComment(peertubeHelpers, {
        text: params.comment.text,
        commentType: params.comment.originCommentId
          ? 'reply'
          : 'comment'
      })
    }
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

async function updateSettings (peertubeHelpers, settings) {
  const { logger } = peertubeHelpers

  apiKey = settings['akismet-api-key']
  if (!apiKey) {
    akismetClient = undefined
    return
  }

  akismetClient = new AkismetClient({ key: settings['akismet-api-key'], blog: peertubeHelpers.config.getWebserverUrl() })

  try {
    const isValid = await akismetClient.verifyKey()

    if (isValid) {
      logger.info('Loaded valid Akismet key.')
      return
    }

    logger.error('Invalid Akismet key.')
    akismetClient = undefined
  } catch (err) {
    logger.error('Cannot reach Akismet.', { err })
    akismetClient = undefined
  }
}

async function checkLocalComment (peertubeHelpers, options) {
  const { logger } = peertubeHelpers

  const accepted = { accepted: true }
  const rejected = { accepted: false, errorMessage: 'SPAM detected from Akismet' }

  for (const key of [ 'ip', 'text', 'commentType', 'author', 'authorEmail' ]) {
    if (!options[key]) {
      logger.error('Cannot check local comment from Akismet without ' + key)
      return accepted
    }
  }

  // https://github.com/chrisfosterelli/akismet-api/blob/master/docs/comments.md
  const comment = {
    ip: options.ip,
    content: options.text,
    type: options.commentType,
    name: options.author,
    email: options.authorEmail,

    // Optional
    useragent: options.userAgent
  }

  try {
    const isSpam = await akismetClient.checkSpam(comment)
    logger.info('Checking local comment from Akismet.', { comment, isSpam })

    if (isSpam) return rejected
  } catch (err) {
    logger.error('Cannot reach Akismet.', { err, comment })
  }

  return accepted
}

async function checkRemoteComment (peertubeHelpers, options) {
  const { logger } = peertubeHelpers

  const accepted = { accepted: true }
  const rejected = { accepted: false }

  for (const key of [ 'text' ]) {
    if (!options[key]) {
      logger.error('Cannot check local comment from Akismet without ' + key)
      return accepted
    }
  }

  // https://github.com/chrisfosterelli/akismet-api/blob/master/docs/comments.md
  const comment = {
    ip: '127.0.0.1',
    content: options.text,
    type: options.commentType
  }

  try {
    const isSpam = await akismetClient.checkSpam(comment)
    logger.info('Checking remote comment from Akismet.', { comment, isSpam })

    if (isSpam) return rejected
  } catch (err) {
    logger.error('Cannot reach Akismet.', { err, comment })
  }

  return accepted
}
