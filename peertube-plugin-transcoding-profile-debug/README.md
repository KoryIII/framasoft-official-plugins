# Debug PeerTube transcoding profiles

Allow admins to create custom transcoding profiles using the plugin settings.

## Settings format

### Profiles

**Don't forget the double quotes for fields and values**

```
{
  "vod": [
    {
      "encoderName": string,
      "profileName": string,
      "outputOptions": string[]
    }
  ]

  "live": [
    {
      "encoderName": string,
      "profileName": string,
      "outputOptions": string[]
    }
  ]
}
```

For example:

```
{
  "vod": [
    {
      "encoderName": "libopus",
      "profileName": "test",
      "outputOptions": []
    },
    {
      "encoderName": "libvpx-vp9",
      "profileName": "test",
      "outputOptions": []
    }
  ],

  "live": []
}
```


### Encoders priorities

**Don't forget the double quotes for fields and values**

```
{
  "vod": [
    {
      "encoderName": string,
      "streamType": 'audio' | 'video',
      "priority": number
    }
  ]

  "live": [
    {
      "encoderName": string,
      "streamType": 'audio' | 'video',
      "priority": number
    }
  ]
}
```

For example:

```
{
  "vod": [
    {
      "encoderName": "libopus",
      "streamType": "audio",
      "priority": 1000
    },
   {
      "encoderName": "libvpx-vp9",
      "streamType": "video",
      "priority": 1000
    }
  ],

  "live": [ ]
}
```
