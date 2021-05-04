function register ({ registerHook, registerVideoField }) {
  console.log('loading video edit stuff')

  {
    const commonOptions1 = {
      name: 'hello-world-field',
      label: 'Super field',
      type: 'input',
      default: 'hello'
    }

    const commonOptions2 = {
      name: 'hello-world-field-2',
      label: 'Super field 2',
      type: 'input',
      hidden: ({ liveVideo, videoToUpdate, formValues }) => {
        console.log('check hidden field', { videoToUpdate, liveVideo, formValues })

        return formValues.pluginData['hello-world-field'] === 'toto'
      }
    }

    for (const type of [ 'upload', 'import-url', 'update' ]) {
      registerVideoField(commonOptions1, { type })
      registerVideoField(commonOptions2, { type })
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
