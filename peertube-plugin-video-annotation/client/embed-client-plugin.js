const shared = require('./shared-player')

function register ({ registerHook }) {
  registerHook({
    target: 'action:embed.player.loaded',
    handler: ({ player, videojs, video }) => shared.buildPlayer(video, player, videojs)
  })
}

export {
  register
}
