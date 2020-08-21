const shared = require('./shared-player')

function register ({ registerHook }) {
  registerHook({
    target: 'action:video-watch.player.loaded',
    handler: ({ player, videojs, video }) => shared.buildPlayer(video, player, videojs)
  })
}

export {
  register
}
