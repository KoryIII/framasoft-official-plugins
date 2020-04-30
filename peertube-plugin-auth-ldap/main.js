const LdapAuth = require('ldapauth-fork')

const store = {
  weight: 100
}

async function register ({
  registerIdAndPassAuth,
  registerSetting,
  settingsManager,
  peertubeHelpers
}) {
  registerSetting({
    name: 'weight',
    label: 'Auth weight',
    type: 'input',
    private: true,
    default: 100
  })

  registerSetting({
    name: 'url',
    label: 'URL',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'insecure-tls',
    label: 'Insecure TLS',
    type: 'input-checkbox',
    private: true,
    default: false
  })

  registerSetting({
    name: 'bind-dn',
    label: 'Bind DN',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'bind-credentials',
    label: 'Bind Password',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'search-base',
    label: 'Search base',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'search-filter',
    label: 'Search filter',
    type: 'input',
    private: true,
    default: '(|(mail={{username}})(uid={{username}}))'
  })

  registerSetting({
    name: 'mail-property',
    label: 'Mail property',
    type: 'input',
    private: true,
    default: 'mail'
  })

  registerSetting({
    name: 'username-property',
    label: 'Username property',
    type: 'input',
    private: true,
    default: 'uid'
  })

  registerIdAndPassAuth({
    authName: 'ldap',
    getWeight: () => store.weight,
    login: options => login(peertubeHelpers, settingsManager, options)
  })

  setWeight(await settingsManager.getSetting('weight'))

  settingsManager.onSettingsChange(settings => {
    if (settings && settings.weight) setWeight(settings.weight)
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

function setWeight (weight) {
  store.weight = parseInt(weight + '', 10)
}

async function login (peertubeHelpers, settingsManager, options) {
  const logger = peertubeHelpers.logger

  const settings = await settingsManager.getSettings([
    'url',
    'insecure-tls',
    'bind-dn',
    'bind-credentials',
    'search-base',
    'search-filter',
    'mail-property',
    'username-property',
  ])

  if (!settings['url']) {
    logger.info('Do not login user %s because admin did not configure LDAP.', options.id)
    return null
  }

  const ldapClient = new LdapAuth({
    url: settings['url'],
    bindDN: settings['bind-dn'],
    bindCredentials: settings['bind-credentials'],
    searchBase: settings['search-base'],
    searchFilter: settings['search-filter'],
    reconnect: true,
    tlsOptions: {
      rejectUnauthorized: settings['insecure-tls'] !== true
    }
  })

  return new Promise(res => {
    function onError (err) {
      logger.warn('Cannot login %s in LDAP plugin.', options.id, { err })
      return res(null)
    }

    ldapClient.on('error', onError)

    ldapClient.authenticate(options.id, options.password, function (err, user) {
      ldapClient.close(function () {
        // We don't care about the closing
      })

      if (err) return onError(err)

      if (!user) {
        logger.warn('Cannot find user %s in LDAP plugin.', options.id)
        return res(null)
      }

      const mailProperty = settings['mail-property']
      const usernameProperty = settings['username-property']

      if (!user[mailProperty]) {
        logger.warn('Cannot find mail property in LDAP plugin.', { mailProperty, user })
        return res(null)
      }

      if (!user[usernameProperty]) {
        logger.warn('Cannot find username property in LDAP plugin.', { usernameProperty, user })
        return res(null)
      }

      let username = user[usernameProperty] || ''
      username = username.replace(/[^a-z0-9._]/g, '_')

      return res({
        username,
        email: user[mailProperty]
      })
    })
  })
}
