async function register ({
  registerHook,
  storageManager
}) {
  const fieldName = 'player-annotations'

  registerHook({
    target: 'action:api.video.updated',
    handler: ({ video, body }) => {
      if (!body.pluginData) return

      const annotationsText = body.pluginData[fieldName]
      if (!annotationsText) return

      storageManager.storeData(fieldName + '-' + video.id, annotationsText)
    }
  })

  registerHook({
    target: 'filter:api.video.get.result',
    handler: async (video) => {
      if (!video) return video
      if (!video.pluginData) video.pluginData = {}

      const result = await storageManager.getData(fieldName + '-' + video.id)
      video.pluginData[fieldName] = result

      return video
    }
  })
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

