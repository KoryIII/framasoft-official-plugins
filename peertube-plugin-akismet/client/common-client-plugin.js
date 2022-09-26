async function register ({ registerHook, peertubeHelpers }) {
  const htmlWarning = await peertubeHelpers.translate('Your IP address will be sent to the <a href="https://akismet.com/">Akismet antispam service</a> to check SPAM on this website.')

  registerHook({
    target: 'filter:signup.instance-about-plugin-panels.create.result',
    handler: async result => {
      return result.concat([
        {
          id: 'askismet',
          title: await peertubeHelpers.translate('Policy regarding your IP address and Akismet'),
          html: htmlWarning
        }
      ])
    }
  })

  registerHook({
    target: 'action:video-watch.video-threads.loaded',
    handler: async () => {
      const ipMessage = document.createElement('div')
      ipMessage.id = 'comment-add-akismet-warning'
      ipMessage.innerHTML = htmlWarning
      ipMessage.style = 'margin: 10px 0; font-size: 0.9em;'

      if (document.querySelector(ipMessage.id)) return

      document.querySelector('my-video-comment-add .textarea-wrapper').append(ipMessage)
    }
  })
}

export {
  register
}
