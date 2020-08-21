async function register ({ registerVideoField, peertubeHelpers }) {
  const fieldName = 'player-annotations'
  const descriptionSource = 'See <a href="https://framagit.org/framasoft/peertube/official-plugins/-/blob/master/peertube-plugin-video-annotation/README.md" target="_blank">this document</a> for annotation format'

  const descriptionHTML = await peertubeHelpers.translate(descriptionSource)
  const commonOptions = {
    name: fieldName,
    label: 'Annotations',
    descriptionHTML,
    type: 'input-textarea',
    default: ''
  }

  for (const type of [ 'upload', 'import-url', 'import-torrent', 'update' ]) {
    registerVideoField(commonOptions, { type })
  }
}

export {
  register
}
