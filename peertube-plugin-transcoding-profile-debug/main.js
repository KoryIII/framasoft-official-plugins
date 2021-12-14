async function register ({
  registerSetting,
  settingsManager,
  transcodingManager,
  peertubeHelpers
}) {
  registerSetting({
    name: 'transcoding-profiles',
    label: 'Transcoding profiles',
    type: 'input-textarea',
    private: true,
    descriptionHTML: 'JSON describing the profiles. See plugin README for the format'
  })

  registerSetting({
    name: 'encoders-priorities',
    label: 'Encoders priorities',
    type: 'input-textarea',
    private: true,
    descriptionHTML: 'JSON describing the encoders priorities. See plugin README for the format'
  })

  settingsManager.onSettingsChange(() => update(peertubeHelpers, transcodingManager, settingsManager))

  update(peertubeHelpers, transcodingManager, settingsManager)
}

async function unregister () {
  return
}

module.exports = {
  register,
  unregister
}

// ############################################################################

async function update (peertubeHelpers, transcodingManager, settingsManager) {
  removePrevious(transcodingManager)

  const profilesString = await settingsManager.getSetting('transcoding-profiles')
  const prioritiesString = await settingsManager.getSetting('encoders-priorities')

  if (profilesString) {
    console.log(profilesString.replace(/\n/g, ''))
    try {
      const profiles = JSON.parse(profilesString)

      for (const profile of profiles.vod) {
        const builder = () => buildResult(profile)

        transcodingManager.addVODProfile(profile.encoderName, profile.profileName, builder)
      }

      for (const profile of profiles.live) {
        const builder = () => buildResult(profile)

        transcodingManager.addLiveProfile(profile.encoderName, profile.profileName, builder)
      }
    } catch (err) {
      peertubeHelpers.logger.error('Cannot add profile settings.', { err, profilesString })
    }
  }

  if (prioritiesString) {
    try {
      const priorities = JSON.parse(prioritiesString)

      for (const priority of priorities.vod) {
        transcodingManager.addVODEncoderPriority(priority.streamType, priority.encoderName, priority.priority)
      }

      for (const priority of priorities.live) {
        transcodingManager.addLiveEncoderPriority(priority.streamType, priority.encoderName, priority.priority)
      }
    } catch (err) {
      peertubeHelpers.logger.error('Cannot add priorities settings.', { err, profilesString })
    }
  }
}

async function removePrevious (transcodingManager) {
  transcodingManager.removeAllProfilesAndEncoderPriorities()
}

function buildResult (profile) {
  return {
    copy: profile.copy,
    outputOptions: profile.outputOptions,
    inputOptions: profile.inputOptions,
    scaleFilter: profile.scaleFilter
  }
}
