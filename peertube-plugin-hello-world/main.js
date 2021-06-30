async function register ({
  registerHook,
  getRouter,
  registerSetting,
  settingsManager,
  storageManager,
  videoCategoryManager,
  videoLicenceManager,
  videoLanguageManager,
  registerExternalAuth,
  peertubeHelpers
}) {
  const defaultAdmin = 'PeerTube admin'

  registerHook({
    target: 'action:application.listening',
    handler: () => displayHelloWorld(settingsManager, defaultAdmin)
  })

  registerHook({
    target: 'unknown-hook',
    handler: () => console.log('fake hook')
  })

  registerHook({
    target: 'filter:api.user.signup.allowed.result',
    handler: (result, params) => {
      if (result.allowed === false) return result

      if (params && params.body.email.includes('laposte.net')) {
        return { allowed: false, errorMessage: 'laposte.net emails are not allowed on this instance' }
      }

      return result
    }
  })

  registerHook({
    target: 'filter:api.video.post-import-url.accept.result',
    handler: ({ accepted }, { video }) => {
      if (!accepted) return { accepted: false }
      if (video.name.includes('small video - youtube')) return { accepted: false, errorMessage: 'bad word' }

      return { accepted: true }
    }
  })

  {
    for (const fieldName of [ 'hello-world-field', 'hello-world-field-2', 'hello-world-field-3' ]) {
      registerHook({
        target: 'action:api.video.updated',
        handler: ({ video, body }) => {
          if (!body.pluginData) return

          storageManager.storeData(fieldName + '-' + video.id, body.pluginData[fieldName])
        }
      })

      registerHook({
        target: 'filter:api.video.get.result',
        handler: async (video) => {
          if (!video) return video

          if (!video.pluginData) video.pluginData = {}

          const result = await storageManager.getData(fieldName + '-' + video.id)
          video.pluginData[fieldName] = result

          return video
        }
      })
    }
  }

  registerSetting({
    name: 'admin-name',
    label: 'Admin name',
    type: 'input',
    private: true,
    descriptionHTML: 'Your admin name',
    default: defaultAdmin
  })

  registerSetting({
    name: 'super-checkbox',
    label: 'My super checkbox',
    type: 'input-checkbox',
    descriptionHTML: 'Use this super checkbox with caution'
  })

  registerSetting({
    name: 'user-name',
    label: 'User name',
    type: 'input',
    private: false
  })

  registerSetting({
    name: 'my-markdown-area',
    label: 'Markdown text',
    type: 'markdown-text',
    default: false
  })


  registerSetting({
    type: 'html',
    html: '<strong class="toto">coucou</strong><br /><br />'
  })

  registerSetting({
    name: 'select',
    label: 'Super select',
    type: 'select',
    default: '3',
    options: [
      { value: '1', label: 'one' },
      { value: '2', label: 'two' },
      { value: '3', label: 'three' }
    ]
  })

  const value = await storageManager.getData('toto')
  console.log(value)

  await storageManager.storeData('toto', 'hello' + new Date())
  await storageManager.storeData('toto2', { toto2: [ 'user 1', 'user 2' ] })

  console.log(await storageManager.getData('toto2'))
  console.log(await storageManager.getData('toto2.toto2'))

  videoLanguageManager.addLanguage('al_bhed', 'Al Bhed')
  videoLanguageManager.deleteLanguage('fr')

  videoCategoryManager.addCategory(42, 'Best category')
  videoCategoryManager.deleteCategory(1) // Music

  videoLicenceManager.addLicence(42, 'Best licence')
  videoLicenceManager.deleteLicence(7) // Public domain

  settingsManager.onSettingsChange(settings => {
    peertubeHelpers.logger.info('Settings changed!', { settings })
  })

  const router = getRouter()
  router.get('/ping', (req, res) => res.json({ message: 'pong' }))

  router.post('/form/post/mirror', (req, res) => {
    res.json(req.body)
  })

  {
    const result = registerExternalAuth({
      authName: 'fake-auth',
      authDisplayName: () => 'fake auth',
      onAuthRequest: (req, res) => {
        result.userAuthenticated({
          req,
          res,
          username: 'fake_auth_username',
          email: 'fake_auth_username@example.com'
        })
      }
    })
  }
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

// ############################################################################

async function displayHelloWorld (settingsManager, defaultAdmin) {
  let value = await settingsManager.getSetting('admin-name')
  if (!value) value = defaultAdmin

  console.log('hello world ' + value)
}
