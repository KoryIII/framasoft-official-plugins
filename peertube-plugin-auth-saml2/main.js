const saml2 = require('saml2-js')
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
    name: 'sign-get-request',
    label: 'Sign get request',
    type: 'input-checkbox',
    private: true,
    default: false
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
    name: 'provider-certificate',
    label: 'Identity provider certificate',
    type: 'input-textarea',
    private: true
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
    'provider-certificate'
  ])

  if (!settings['login-url']) {
    logger.info('Do not register external saml2 auth because login URL is not set.')
    return
  }

  if (!settings['provider-certificate']) {
    logger.info('Do not register external saml2 auth because provider certificate is not set.')
    return
  }

  const { publicKey: servicePublicKey, privateKey: servicePrivateKey } = await lazyLoadServiceCertificates(peertubeHelpers, storageManager)

  const serviceOptions = {
    entity_id: settings['client-id'],
    private_key: servicePrivateKey,
    certificate: servicePublicKey,
    assert_endpoint: store.assertUrl
  }
  store.serviceProvider = new saml2.ServiceProvider(serviceOptions)

  const identityOptions = {
    sso_login_url: settings['login-url'],
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
      store.serviceProvider.create_login_request_url(store.identityProvider, {}, (err, loginUrl, requestId) => {
        if (err) {
          logger.error('Cannot SAML 2 authenticate.', { err })
          return redirectOnError(res)
        }

        res.redirect(loginUrl)
      })
    }
  })

  store.userAuthenticated = result.userAuthenticated
}

function handleAssert(peertubeHelpers, settingsManager, req, res) {
  const { logger } = peertubeHelpers

  const options = { request_body: req.body }

  store.serviceProvider.post_assert(store.identityProvider, options, async (err, samlResponse) => {
    if (err) {
      logger.error('Error SAML 2 assert.', { err })
      return redirectOnError(res)
    }

    logger.debug('User authenticated by SAML 2.', { samlResponse })

    try {
      const user = await buildUser(settingsManager, samlResponse.user)

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

  return {
    username,
    email: findInUser(samlUser, settings['mail-property']),
    displayName: findInUser(samlUser, settings['display-name-property']),
    role: findInUser(samlUser, settings['role-property'])
  }
}

async function lazyLoadServiceCertificates (peertubeHelpers, storageManager) {
  const { logger } = peertubeHelpers

  let privateKey = await storageManager.getData('service-private-key')
  let publicKey = await storageManager.getData('service-public-key')

  if (!privateKey || !publicKey) {
    logger.info('Generating public/private keys for SAML 2.')

    return new Promise((res, rej) => {
      const options = {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }

      crypto.generateKeyPair('rsa', options, (err, publicKey, privateKey) => {
        if (err) return rej(err)

        Promise.all([
          storageManager.storeData('service-private-key', privateKey),
          storageManager.storeData('service-public-key', publicKey)
        ]).then(() => res({ publicKey, privateKey }))
      })
    })
  }

  return { privateKey, publicKey }
}
