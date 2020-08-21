function register ({ registerHook, peertubeHelpers }) {
  registerHook({
    target: 'action:embed.player.loaded',
    handler: () => alert('video loaded')
  })

  console.log(peertubeHelpers.translate('toto'))
}

export {
  register
}
