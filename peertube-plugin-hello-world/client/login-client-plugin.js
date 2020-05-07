function register ({ registerHook, peertubeHelpers }) {

  registerHook({
    target: 'action:login.init',
    handler: () => {
      console.log('Login init')
      document.querySelector('.looking-for-account > div').innerHTML = 'Hello'
    }
  })
}

export {
  register
}
