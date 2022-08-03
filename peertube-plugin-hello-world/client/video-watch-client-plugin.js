function register ({ registerHook, peertubeHelpers }) {
  registerHook({
    target: 'action:video-watch.init',
    handler: () => console.log('Hello video watch world')
  })

  registerHook({
    target: 'action:video-watch.video.loaded',
    handler: ({ videojs, video, playlist }) => {

      if (playlist) {
        console.log('playlist loaded')
      } else {
        console.log('video loaded')
      }

      // Insert element next to the player
      {
        const elem = document.createElement('div')
        elem.className = 'hello-world-h4'
        elem.innerHTML = '<h4>Hello everybody! This is an element next to the player</h4>'
        elem.style = 'background-color: red; '

        document.getElementById('plugin-placeholder-player-next').appendChild(elem)
      }
    }
  })

  registerHook({
    target: 'filter:api.video-watch.video.get.result',
    handler: video => {
      video.name += ' \o/'

      return video
    }
  })

  registerHook({
    target: 'filter:api.video-watch.video-threads.list.result',
    handler: result => {
      result.data.forEach(c => c.text += ' THREAD')

      return result
    }
  })

  registerHook({
    target: 'filter:api.video-watch.video-thread-replies.list.result',
    handler: result => {
      result.children.forEach(c => c.comment.text += ' REPLY DEEP 1')

      return result
    }
  })

  registerHook({
    target: 'filter:internal.video-watch.player.build-options.result',
    handler: (result, params) => {
      console.log('Running player build options hook for video %s.', params.video.name)
      result.playerOptions.common.inactivityTimeout = 10000

      return result
    }
  })

  registerHook({
    target: 'filter:internal.player.videojs.options.result',
    handler: (options) => {
      options.poster = ''
      return options
    }
  })

  registerHook({
    target: 'action:video-watch.video-threads.loaded',
    handler: () => {
      console.log('Comments found.', document.querySelectorAll('.comment'));
    }
  })

  for (const hook of [
    'filter:api.video-watch.video-playlist-elements.get.result'
  ]) {
    registerHook({
      target: hook,
      handler: (result) => {
        console.log('Running hook %s', hook, result)

        return result
      }
    })
  }

  peertubeHelpers.notifier.info('you are on the watch page', 'useless', 1000)
}

export {
  register
}
