export function buildPlayer (video, player, videojs) {
  window.videojs = videojs
  require('videojs-overlay')

  const fieldName = 'player-annotations'

  if (!video.pluginData || !video.pluginData[fieldName]) return

  const annotationsText = video.pluginData[fieldName]

  const annotations = parseAnnotations(annotationsText)
  if (!annotations) return

  console.log('Will inject annotations in player.', annotations)

  player.overlay({
    overlays: annotations
  })
}

function parseAnnotations (annotationsText) {
  const splitted = annotationsText.split('\n\n')

  return splitted.map(s => buildAnnotation(s))
                 .filter(a => !!a)
}

function buildAnnotation (text) {
  const splitted = text.split('\n')
  if (splitted.length < 2) {
    console.error('Cannot build annotation %s.', text)
    return undefined
  }

  const timestampsText = splitted.shift()
  const timestamps = buildTimestamps(timestampsText)
  if (!timestamps) {
    console.error('Cannot build timestamp %s of %s.', timestampsText, text)
    return undefined
  }

  let options

  if (splitted[0] && (splitted[0] || '').startsWith('options:')) {
    const optionsText = splitted[0]
    options = buildOptions(optionsText)

    if (!options) {
      console.error('Cannot build options %s of %s.', optionsText, text)
    } else {
      splitted.shift()
    }
  }

  const content = splitted.join('\n')

  const align = options && options.align ? options.align : 'top-right'

  const result = {
    align,
    content
  }

  result.start = timestamps.start || 0
  result.end = timestamps.end || video.duration

  return result
}

function buildTimestamps (text) {
  const result = text.split('-->')

  if (result.length !== 2) return undefined

  const startText = result[0].trim()
  const endText = result[1].trim()

  if (!startText && !endText) return undefined

  let start = parseInt(startText)
  let end = parseInt(endText)

  if (isNaN(start)) start = undefined
  if (isNaN(end)) end = undefined

  if (!start && !end) return undefined

  return { start, end }
}

function buildOptions (text) {
  const matchedAlign = text.match(/align=([^ ]+)/)

  if (matchedAlign) {
    return {
      align: matchedAlign[1]
    }
  }

  return undefined
}
