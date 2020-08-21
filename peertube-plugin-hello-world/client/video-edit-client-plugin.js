function register ({ registerVideoField }) {
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
}

export {
  register
}
