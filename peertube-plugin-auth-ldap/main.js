const LdapAuth = require('ldapauth-fork')
const fs = require('fs')

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
    descriptionHTML: 'Starting with <em>ldap://</em> or <em>ldaps://</em>',
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
    name: 'custom-ca',
    label: 'Path to LDAP Server Certificate Chain of Trust',
    type: 'input',
    private: true,
    default: ''
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
    name: 'mail-property-index',
    label: 'Mail property index',
    type: 'input',
    descriptionHTML:
      'If you have many results for the email attribute, you may define the index of the result to pick:',
    private: true,
    default: '0'
  })

  registerSetting({
    name: 'username-property',
    label: 'Username property',
    type: 'input',
    private: true,
    default: 'uid'
  })

  registerSetting({
    name: 'group-base',
    label: 'Group base',
    type: 'input',
    private: true,
    descriptionHTML:
      'Fill the following settings to map PeerTube roles to LDAP Groups. LDAP users without any valid LDAP group will be refused login. Leave empty to let LDAP users join with default User role.'
  })

  registerSetting({
    name: 'group-filter',
    label: 'Group filter',
    type: 'input',
    private: true,
    default: '(member={{dn}})'
  })

  registerSetting({
    name: 'group-admin',
    label: 'Administrator group DN',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'group-mod',
    label: 'Moderator group DN',
    type: 'input',
    private: true
  })

  registerSetting({
    name: 'group-user',
    label: 'User group DN',
    type: 'input',
    private: true
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
    'custom-ca',
    'search-base',
    'search-filter',
    'mail-property',
    'mail-property-index',
    'username-property',
    'group-base',
    'group-filter',
    'group-admin',
    'group-mod',
    'group-user',
  ])

  if (!settings['url']) {
    logger.info('Do not login user %s because admin did not configure LDAP.', options.id)
    return null
  }

  const clientOpts = {
    url: settings['url'],
    bindDN: settings['bind-dn'],
    bindCredentials: settings['bind-credentials'],
    searchBase: settings['search-base'],
    searchFilter: settings['search-filter'],
    groupSearchBase: settings['group-base'],
    groupSearchFilter: settings['group-filter'],
    reconnect: true,
    tlsOptions: {
      rejectUnauthorized: settings['insecure-tls'] !== true
    }
  }

  if (settings['custom-ca'] && settings['insecure-tls'] !== true) {
    try {
      clientOpts.tlsOptions['ca'] = [ await fs.readFile(settings['custom-ca']) ]
    } catch (err) {
      logger.warn('Could not load custom CA in LDAP plugin', { err })
    }
  }

  const ldapClient = new LdapAuth(clientOpts)

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

      let email = user[mailProperty]
      if (Array.isArray(email)) {
        let emailPropertyIndex = parseInt(settings['mail-property-index'], 10)
        if (isNaN(emailPropertyIndex) || emailPropertyIndex < 0) {
          logger.warn(
            `Mail property index is expected to be a positive integer, but got instead: ${settings['mail-property-index']}`
          )
          emailPropertyIndex = 0
        }
        email = email[emailPropertyIndex]
      }

      if (!settings['group-base'] || !settings['group-filter']) {
        // Return user without fetching role from LDAP groups
        return res({
          username,
          email
        })
      }

      if (!settings['group-admin'] || !settings['group-mod'] || !settings['group-user']) {
        logger.info('Do not login user %s because admin did not configure LDAP Groups.', options.id)
        return res(null)
      }

      const groupAdmin = settings['group-admin']
      const groupMod = settings['group-mod']
      const groupUser = settings['group-user']

      const roles = user._groups.map(element => element['dn'])

      let role = null
      if (roles.includes(groupAdmin)) {
        role = 0
      } else if (roles.includes(groupMod)) {
        role = 1
      } else if (roles.includes(groupUser)) {
        role = 2
      }

      if (role === null) {
        logger.warn('User %s does not have any allowed LDAP groups.', options.id)
        return res(null)
      }

      return res({
        username,
        email,
        role
      })

    })
  })
}
