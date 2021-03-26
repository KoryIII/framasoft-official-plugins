function register ({ registerHook, registerVideoField }) {
  console.log('loading video edit stuff')

  {
    const commonOptions = {
      name: 'hello-world-field',
      label: 'Super field',
      type: 'input',
      default: 'hello'
    }

    for (const type of [ 'upload', 'import-url', 'update' ]) {
      registerVideoField(commonOptions, { type })
    }
  }

  {
    const hooks = [
      'action:video-upload.init',
      'action:video-url-import.init',
      'action:video-torrent-import.init',
      'action:go-live.init'
    ]

    for (const h of hooks) {
      registerHook({
        target: h,
        handler: () => {
          const event = new Event('change', {
              bubbles: true,
              cancelable: true,
          });
          const selects = document.querySelectorAll('label[for=first-step-privacy] + my-select-options')

          console.log(selects)

          selects.forEach(s => {
            s.value = 2 // Unlisted
            s.dispatchEvent(event)
          })
        }
      })
    }
  }
}

export {
  register
}
