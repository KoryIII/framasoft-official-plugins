import { initMatomo } from './utils'

function register ({ registerHook, peertubeHelpers }) {
  init(registerHook, peertubeHelpers)
    .catch(err => console.error('Cannot initialize Matomo plugin', err))
}

export {
  register
}

async function init (registerHook, peertubeHelpers) {
  const success = await initMatomo(peertubeHelpers)
  if (!success) return

  registerHook({
    target: 'action:embed.player.loaded',
    handler: function () {
      window._paq.push(['MediaAnalytics::scanForMedia', window.document]);
    }
  })
}
