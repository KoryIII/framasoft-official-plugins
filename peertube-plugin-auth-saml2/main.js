const saml2 = require('@peertube/saml2-js')
const crypto = require('crypto')

const store = {
  assertUrl: null,
  authDisplayName: 'SAML 2',
  serviceProvider: null,
  identityProvider: null
}

async function register ({
  registerExternalAuth,
  unregisterExternalAuth,
  registerSetting,
  settingsManager,
  storageManager,
  peertubeHelpers,
  getRouter
}) {
  const { logger } = peertubeHelpers

  const metadataUrl = peertubeHelpers.config.getWebserverUrl() + '/plugins/auth-saml2/router/metadata.xml'

  registerSetting({
    name: 'client-id',
    label: 'Client ID',
    type: 'input',
    private: true,
    default: metadataUrl
  })

  registerSetting({
    name: 'auth-display-name',
    label: 'Auth display name',
    type: 'input',
    private: true,
    default: 'SAML 2'
  })

  registerSetting({
    name: 'login-url',
    label: 'SSO login URL',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'logout-url',
    label: 'SSO logout URL (needs PeerTube >= 3.0.0)',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'provider-certificate',
    label: 'Identity provider certificate (PEM format)',
    type: 'input-textarea',
    private: true
  })

  registerSetting({
    name: 'service-certificate',
    label: 'Service certificate (PEM format)',
    type: 'input-textarea',
    private: true
  })

  registerSetting({
    name: 'service-private-key',
    label: 'Service private key (PEM format)',
    type: 'input-textarea',
    private: true
  })

  registerSetting({
    name: 'sign-get-request',
    label: 'Sign get request',
    type: 'input-checkbox',
    private: true,
    default: false
  })

  registerSetting({
    name: 'username-property',
    label: 'Username property',
    type: 'input',
    private: true,
    default: 'preferred_username'
  })

  registerSetting({
    name: 'mail-property',
    label: 'Email property',
    type: 'input',
    private: true,
    default: 'email'
  })

  registerSetting({
    name: 'display-name-property',
    label: 'Display name property',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'role-property',
    label: 'Role property',
    type: 'input',
    private: true
  })

  const router = getRouter()

  store.assertUrl = peertubeHelpers.config.getWebserverUrl() + '/plugins/auth-saml2/router/assert'
  router.post('/assert', (req, res) => handleAssert(peertubeHelpers, settingsManager, req, res))
  router.get('/assert', (req, res) => handleAssert(peertubeHelpers, settingsManager, req, res))

  router.get('/metadata.xml', (req, res) => {
    if (!store.serviceProvider) {
      logger.warn('Cannot get SAML 2 metadata: service provider not created.')
      return res.sendStatus(400)
    }

    res.type('application/xml').send(store.serviceProvider.create_metadata())
  })

  await loadSettingsAndCreateProviders(registerExternalAuth, unregisterExternalAuth, peertubeHelpers, settingsManager, storageManager)
  store.authDisplayName = await settingsManager.getSetting('auth-display-name')

  settingsManager.onSettingsChange(settings => {
    loadSettingsAndCreateProviders(registerExternalAuth, unregisterExternalAuth, peertubeHelpers, settingsManager, storageManager)
      .catch(err => logger.error('Cannot load settings and create client after settings changes.', { err }))

    if (settings['auth-display-name']) store.authDisplayName = settings['auth-display-name']
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

async function loadSettingsAndCreateProviders (
  registerExternalAuth,
  unregisterExternalAuth,
  peertubeHelpers,
  settingsManager,
  storageManager
) {
  const { logger } = peertubeHelpers

  if (store.serviceProvider || store.identityProvider) {
    unregisterExternalAuth('saml2')
  }

  store.serviceProvider = null
  store.identityProvider = null

  const settings = await settingsManager.getSettings([
    'client-id',
    'sign-get-request',
    'login-url',
    'logout-url',
    'provider-certificate',
    'service-certificate',
    'service-private-key'
  ])

  if (!settings['login-url']) {
    logger.info('Do not register external saml2 auth because login URL is not set.')
    return
  }

  if (!settings['provider-certificate']) {
    logger.info('Do not register external saml2 auth because provider certificate is not set.')
    return
  }

  logger.debug('Creating SAML service/identity instances.', { settings })

  const serviceOptions = {
    entity_id: settings['client-id'],
    private_key: settings['service-private-key'],
    certificate: settings['service-certificate'],
    assert_endpoint: store.assertUrl
  }
  store.serviceProvider = new saml2.ServiceProvider(serviceOptions)

  const identityOptions = {
    sso_login_url: settings['login-url'],
    sso_logout_url: settings['logout-url'],
    certificates: [
      settings['provider-certificate']
    ],
    sign_get_request: settings['sign-get-request'],
    allow_unencrypted_assertion: true
  }
  store.identityProvider = new saml2.IdentityProvider(identityOptions)

  const result = registerExternalAuth({
    authName: 'saml2',
    authDisplayName: () => store.authDisplayName,
    onAuthRequest: async (req, res) => {
      try {
        store.serviceProvider.create_login_request_url(store.identityProvider, {}, (err, loginUrl, requestId) => {
          if (err) {
            logger.error('Cannot SAML 2 authenticate.', { err })
            return redirectOnError(res)
          }

          res.redirect(loginUrl)
        })
      } catch (err) {
        logger.error('Cannot create login request url.', { err })
        return redirectOnError(res)
      }
    },
    onLogout: (user, req) => {
      // Return silently if logout-url is not specified
      if (!settings['logout-url']) {
        return
      }

      return new Promise(async (resolve, reject) => {
        try {
          const options = await storageManager.getData(`saml_session_${req.cookies.saml_session}`)

          // Include nameid format so the SLO can be accepted.
          // See xmlbuilder for the JS object format.
          options.name_id = {
            "@Format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
            "#text": options.name_id
          }

          store.serviceProvider.create_logout_request_url(store.identityProvider, options, (err, logoutUrl) => {
            if (err) {
              reject('Cannot SAML 2 logout.', { err })
              return
            }

            resolve(logoutUrl)
          })
        } catch (err) {
          reject('Cannot create logout request url.', { err })
        }

        return
      })
    }
  })

  store.userAuthenticated = result.userAuthenticated
  store.storageManager = storageManager
}

function handleAssert(peertubeHelpers, settingsManager, req, res) {
  const { logger } = peertubeHelpers

  if (req.query.SAMLResponse) {
    // This is a HTTP-redirect for a LogoutResponse and not a SamlResponse after a login request.
    // So we do not want to assert it with post_assert as it will throw an error.
    return res.redirect(peertubeHelpers.config.getWebserverUrl())
  }

  const options = { request_body: req.body }

  store.serviceProvider.post_assert(store.identityProvider, options, async (err, samlResponse) => {
    if (err) {
      logger.error('Error SAML 2 assert.', { err })
      return redirectOnError(res)
    }

    logger.debug('User authenticated by SAML 2.', { samlResponse })

    try {
      const user = await buildUser(settingsManager, samlResponse.user)

      // Store the nameid and session_index in the plugin database.
      // Create a cookie called 'saml_session' so we can match later.
      const session_id = crypto.randomBytes(10).toString("hex")
      res.cookie('saml_session', session_id, { httpOnly: true, secure: true })
      store.storageManager.storeData(`saml_session_${session_id}`, {
        name_id: samlResponse.user.name_id,
        session_index: samlResponse.user.session_index
      })

      return store.userAuthenticated({
        req,
        res,
        ...user
      })
    } catch (err) {
      logger.error('Error SAML 2 build user.', { err })
      return redirectOnError(res)
    }
  });
}

function redirectOnError (res) {
  res.redirect('/login?externalAuthError=true')
}

function findInUser (samlUser, key) {
  if (!key) return undefined

  if (samlUser[key]) return samlUser[key]

  if (samlUser.attributes[key]) return samlUser.attributes[key][0]

  return undefined
}

async function buildUser (settingsManager, samlUser) {
  const settings = await settingsManager.getSettings([
    'mail-property',
    'username-property',
    'display-name-property',
    'role-property'
  ])

  let username = findInUser(samlUser, settings['username-property']) || ''
  username = username.replace(/[^a-z0-9._]/g, '_')

  let sentRole = findInUser(samlUser, settings['role-property'])
  let parsedRole = parseInt(sentRole, 10)

  if (!Number.isSafeInteger(parsedRole)) {
    parsedRole = undefined
  }

  return {
    username,
    email: findInUser(samlUser, settings['mail-property']),
    displayName: findInUser(samlUser, settings['display-name-property']),
    role: parsedRole
  }
}
